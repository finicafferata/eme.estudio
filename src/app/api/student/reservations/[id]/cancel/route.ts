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
    const { reason } = body

    const userId = BigInt(session.user.id)
    const reservationId = BigInt(params.id)

    // Get reservation with class details
    const reservation = await prisma.reservation.findUnique({
      where: {
        id: reservationId,
        userId: userId // Ensure student can only cancel their own reservations
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
            usedCredits: true,
            totalCredits: true
          }
        }
      }
    })

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    // Check if already cancelled
    if (reservation.status === ReservationStatus.CANCELLED) {
      return NextResponse.json({ error: 'Reservation is already cancelled' }, { status: 400 })
    }

    // Check if class has already started or is completed
    const now = new Date()
    if (reservation.class.startsAt <= now) {
      return NextResponse.json({
        error: 'Cannot cancel a class that has already started or completed'
      }, { status: 400 })
    }

    // Calculate hours until class starts
    const hoursUntilClass = differenceInHours(reservation.class.startsAt, now)

    // Enforce 24-hour cancellation policy
    if (hoursUntilClass < 24) {
      return NextResponse.json({
        error: 'Cancellations must be made at least 24 hours before the class starts',
        hoursUntilClass,
        classTime: reservation.class.startsAt.toISOString(),
        policy: 'You can only cancel bookings up to 24 hours before the class starts. For cancellations within 24 hours, please contact the studio directly.'
      }, { status: 400 })
    }

    // Start transaction for cancellation process
    const result = await prisma.$transaction(async (tx) => {
      // Update reservation to cancelled
      const cancelledReservation = await tx.reservation.update({
        where: { id: reservationId },
        data: {
          status: ReservationStatus.CANCELLED,
          cancelledAt: now,
          cancellationReason: reason || 'Student cancellation within policy'
        }
      })

      // Restore credit if package was used
      let creditRestored = false
      if (reservation.packageId) {
        await tx.package.update({
          where: { id: reservation.packageId },
          data: {
            usedCredits: {
              decrement: 1
            }
          }
        })
        creditRestored = true
      }

      // Handle waitlist promotion
      let waitlistPromoted = null
      const nextWaitlistEntry = reservation.class.waitlist[0]

      if (nextWaitlistEntry) {
        // Create reservation for waitlisted user
        const newReservation = await tx.reservation.create({
          data: {
            userId: nextWaitlistEntry.userId,
            classId: reservation.classId,
            status: ReservationStatus.CONFIRMED
          },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        })

        // Remove from waitlist
        await tx.waitlist.delete({
          where: { id: nextWaitlistEntry.id }
        })

        // Update priorities for remaining waitlist entries
        await tx.waitlist.updateMany({
          where: {
            classId: reservation.classId,
            priority: { gt: nextWaitlistEntry.priority }
          },
          data: {
            priority: {
              decrement: 1
            }
          }
        })

        waitlistPromoted = {
          userId: newReservation.user.id.toString(),
          userName: `${newReservation.user.firstName} ${newReservation.user.lastName}`,
          userEmail: newReservation.user.email
        }
      } else {
        // No waitlist, check if class should no longer be FULL
        const remainingReservations = reservation.class.reservations.filter(
          r => r.id !== reservationId
        ).length

        if (remainingReservations < reservation.class.capacity &&
            reservation.class.status === ClassStatus.FULL) {
          await tx.class.update({
            where: { id: reservation.classId },
            data: { status: ClassStatus.SCHEDULED }
          })
        }
      }

      return {
        cancelledReservation,
        creditRestored,
        waitlistPromoted
      }
    })

    return NextResponse.json({
      message: 'Reservation cancelled successfully',
      cancellation: {
        reservationId: params.id,
        cancelledAt: result.cancelledReservation.cancelledAt?.toISOString(),
        reason: result.cancelledReservation.cancellationReason,
        creditRestored: result.creditRestored,
        packageName: reservation.package?.name,
        className: reservation.class.classType.name,
        classTime: reservation.class.startsAt.toISOString(),
        hoursBeforeClass: hoursUntilClass
      },
      waitlistUpdate: result.waitlistPromoted ? {
        promoted: true,
        newStudent: result.waitlistPromoted
      } : { promoted: false },
      policy: {
        enforced: true,
        hoursRequired: 24,
        hoursBeforeClass: hoursUntilClass
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Student cancellation error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel reservation' },
      { status: 500 }
    )
  }
}