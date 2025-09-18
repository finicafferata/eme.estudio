import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, ReservationStatus, ClassStatus } from '@prisma/client'
import { differenceInHours } from 'date-fns'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.STUDENT) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { newClassId } = body

    if (!newClassId) {
      return NextResponse.json({ error: 'New class ID is required' }, { status: 400 })
    }

    const userId = BigInt(session.user.id)
    const reservationId = BigInt(params.id)
    const newClassIdBigInt = BigInt(newClassId)

    // Start transaction for reschedule process
    const result = await prisma.$transaction(async (tx) => {
      // Get current reservation with class details
      const currentReservation = await tx.reservation.findUnique({
        where: {
          id: reservationId,
          userId: userId // Ensure student can only reschedule their own reservations
        },
        include: {
          class: {
            include: {
              classType: {
                select: { name: true }
              },
              waitlist: {
                orderBy: { priority: 'asc' }
              },
              reservations: {
                where: {
                  status: {
                    in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN]
                  }
                }
              }
            }
          },
          package: {
            select: {
              name: true,
              classTypeId: true
            }
          }
        }
      })

      if (!currentReservation) {
        throw new Error('Reservation not found')
      }

      // Check if reservation can be rescheduled
      if (currentReservation.status !== ReservationStatus.CONFIRMED) {
        throw new Error('Only confirmed reservations can be rescheduled')
      }

      // Check 24-hour policy for current reservation
      const now = new Date()
      const hoursUntilCurrentClass = differenceInHours(currentReservation.class.startsAt, now)

      if (hoursUntilCurrentClass < 24) {
        throw new Error('Reservations can only be rescheduled up to 24 hours before the class starts')
      }

      // Get new class details
      const newClass = await tx.class.findUnique({
        where: { id: newClassIdBigInt },
        include: {
          classType: {
            select: { id: true, name: true }
          },
          instructor: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          },
          location: {
            select: {
              name: true
            }
          },
          reservations: {
            where: {
              status: {
                in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN]
              }
            }
          }
        }
      })

      if (!newClass) {
        throw new Error('New class not found')
      }

      // Check if new class is at least 24 hours away
      const hoursUntilNewClass = differenceInHours(newClass.startsAt, now)
      if (hoursUntilNewClass < 24) {
        throw new Error('Cannot reschedule to a class that starts within 24 hours')
      }

      // Check if new class hasn't started yet
      if (newClass.startsAt <= now) {
        throw new Error('Cannot reschedule to a class that has already started')
      }

      // Check if user already has a reservation for the new class
      const existingReservation = await tx.reservation.findUnique({
        where: {
          userId_classId: {
            userId: userId,
            classId: newClassIdBigInt
          }
        }
      })

      if (existingReservation) {
        throw new Error('You already have a reservation for this class')
      }

      // Check package compatibility if current reservation used a package
      if (currentReservation.packageId) {
        const packageData = currentReservation.package
        if (packageData?.classTypeId && packageData.classTypeId !== newClass.classType.id) {
          throw new Error('Your package is not valid for this class type')
        }
      }

      // Check new class capacity
      const currentNewClassBookings = newClass.reservations.length
      if (currentNewClassBookings >= newClass.capacity) {
        throw new Error('The selected class is full')
      }

      // Cancel current reservation
      const cancelledReservation = await tx.reservation.update({
        where: { id: reservationId },
        data: {
          status: ReservationStatus.CANCELLED,
          cancelledAt: now,
          cancellationReason: 'Rescheduled to another class'
        }
      })

      // Create new reservation
      const newReservation = await tx.reservation.create({
        data: {
          userId: userId,
          classId: newClassIdBigInt,
          packageId: currentReservation.packageId, // Transfer package
          status: ReservationStatus.CONFIRMED
        }
      })

      // Handle waitlist promotion for the cancelled class
      let waitlistPromoted = null
      const nextWaitlistEntry = currentReservation.class.waitlist[0]

      if (nextWaitlistEntry) {
        // Create reservation for waitlisted user
        await tx.reservation.create({
          data: {
            userId: nextWaitlistEntry.userId,
            classId: currentReservation.classId,
            status: ReservationStatus.CONFIRMED
          }
        })

        // Remove from waitlist
        await tx.waitlist.delete({
          where: { id: nextWaitlistEntry.id }
        })

        // Update priorities for remaining waitlist entries
        await tx.waitlist.updateMany({
          where: {
            classId: currentReservation.classId,
            priority: { gt: nextWaitlistEntry.priority }
          },
          data: {
            priority: {
              decrement: 1
            }
          }
        })

        waitlistPromoted = { userId: nextWaitlistEntry.userId }
      } else {
        // No waitlist, check if original class should no longer be FULL
        const remainingReservations = currentReservation.class.reservations.filter(
          r => r.id !== reservationId
        ).length

        if (remainingReservations < currentReservation.class.capacity &&
            currentReservation.class.status === ClassStatus.FULL) {
          await tx.class.update({
            where: { id: currentReservation.classId },
            data: { status: ClassStatus.SCHEDULED }
          })
        }
      }

      // Check if new class should be marked as FULL
      const newClassBookingCount = currentNewClassBookings + 1
      if (newClassBookingCount >= newClass.capacity && newClass.status !== ClassStatus.FULL) {
        await tx.class.update({
          where: { id: newClassIdBigInt },
          data: { status: ClassStatus.FULL }
        })
      }

      return {
        cancelledReservation,
        newReservation,
        newClass,
        waitlistPromoted
      }
    })

    return NextResponse.json({
      message: 'Reservation rescheduled successfully',
      reschedule: {
        oldReservationId: params.id,
        newReservationId: result.newReservation.id.toString(),
        oldClassName: result.cancelledReservation.class?.classType.name,
        creditTransferred: !!result.cancelledReservation.packageId
      },
      newClass: {
        id: result.newClass.id.toString(),
        name: result.newClass.classType.name,
        startsAt: result.newClass.startsAt.toISOString(),
        endsAt: result.newClass.endsAt.toISOString(),
        instructor: result.newClass.instructor
          ? `${result.newClass.instructor.user.firstName} ${result.newClass.instructor.user.lastName}`
          : null,
        location: result.newClass.location.name
      },
      waitlistUpdate: result.waitlistPromoted ? {
        promoted: true
      } : { promoted: false }
    }, { status: 200 })

  } catch (error) {
    console.error('Student reschedule error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reschedule reservation' },
      { status: 500 }
    )
  }
}