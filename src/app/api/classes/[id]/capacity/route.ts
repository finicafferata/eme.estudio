import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, ReservationStatus, ClassStatus } from '@prisma/client'

interface RouteContext {
  params: Promise<{ id: string }>
}

// Update class capacity
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const params = await context.params
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { capacity, reason } = body

    if (!capacity || capacity < 1) {
      return NextResponse.json(
        { error: 'Valid capacity is required' },
        { status: 400 }
      )
    }

    // Get current class data
    const classData = await prisma.class.findUnique({
      where: { id: BigInt(params.id) },
      include: {
        reservations: {
          where: {
            status: {
              in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN]
            }
          }
        },
        waitlist: {
          orderBy: { priority: 'asc' },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        classType: {
          select: {
            name: true,
            maxCapacity: true
          }
        }
      }
    })

    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    const currentBookings = classData.reservations.length
    const oldCapacity = classData.capacity
    const newCapacity = capacity

    // Validation checks
    if (newCapacity > classData.classType.maxCapacity) {
      return NextResponse.json({
        error: 'Capacity exceeds maximum allowed for this class type',
        maxAllowed: classData.classType.maxCapacity,
        requested: newCapacity
      }, { status: 400 })
    }

    if (newCapacity < currentBookings) {
      return NextResponse.json({
        error: 'Cannot reduce capacity below current bookings',
        currentBookings,
        currentCapacity: oldCapacity,
        requestedCapacity: newCapacity,
        warning: `There are ${currentBookings} confirmed reservations. Capacity cannot be reduced below this number.`
      }, { status: 409 })
    }

    // Update the class capacity
    const updatedClass = await prisma.class.update({
      where: { id: BigInt(params.id) },
      data: {
        capacity: newCapacity,
        notes: reason ?
          `${classData.notes || ''}\n[Capacity changed: ${oldCapacity} → ${newCapacity}. Reason: ${reason}]`.trim() :
          classData.notes
      }
    })

    const promotedFromWaitlist = []

    // If capacity increased, promote people from waitlist
    if (newCapacity > oldCapacity && classData.waitlist.length > 0) {
      const spotsAvailable = newCapacity - currentBookings
      const toPromote = Math.min(spotsAvailable, classData.waitlist.length)

      for (let i = 0; i < toPromote; i++) {
        const waitlistEntry = classData.waitlist[i]
        if (!waitlistEntry) continue

        // Create reservation
        const newReservation = await prisma.reservation.create({
          data: {
            userId: waitlistEntry.userId,
            classId: BigInt(params.id),
            status: ReservationStatus.CONFIRMED
          }
        })

        // Remove from waitlist
        await prisma.waitlist.delete({
          where: { id: waitlistEntry.id }
        })

        promotedFromWaitlist.push({
          reservationId: newReservation.id.toString(),
          student: `${waitlistEntry.user.firstName} ${waitlistEntry.user.lastName}`,
          email: waitlistEntry.user.email,
          waitlistPosition: waitlistEntry.priority
        })
      }

      // Update priorities for remaining waitlist entries
      if (toPromote > 0) {
        await prisma.waitlist.updateMany({
          where: {
            classId: BigInt(params.id),
            priority: { gt: toPromote }
          },
          data: {
            priority: {
              decrement: toPromote
            }
          }
        })
      }
    }

    // Update class status if it's no longer full
    const finalBookingCount = currentBookings + promotedFromWaitlist.length
    if (finalBookingCount < newCapacity && classData.status === ClassStatus.FULL) {
      await prisma.class.update({
        where: { id: BigInt(params.id) },
        data: { status: ClassStatus.SCHEDULED }
      })
    }

    return NextResponse.json({
      message: 'Class capacity updated successfully',
      capacityChange: {
        oldCapacity,
        newCapacity,
        currentBookings: finalBookingCount,
        availableSpots: newCapacity - finalBookingCount,
        promotedFromWaitlist: promotedFromWaitlist.length
      },
      promotedStudents: promotedFromWaitlist,
      remainingWaitlist: Math.max(0, classData.waitlist.length - promotedFromWaitlist.length)
    })

  } catch (error) {
    console.error('Class capacity update error:', error)
    return NextResponse.json(
      { error: 'Failed to update class capacity' },
      { status: 500 }
    )
  }
}

// Get capacity information and suggestions
export async function GET(request: Request, context: RouteContext) {
  try {
    const params = await context.params
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const classData = await prisma.class.findUnique({
      where: { id: BigInt(params.id) },
      include: {
        reservations: {
          where: {
            status: {
              in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN]
            }
          }
        },
        waitlist: {
          orderBy: { priority: 'asc' }
        },
        classType: {
          select: {
            name: true,
            maxCapacity: true,
            defaultPrice: true
          }
        },
        location: {
          select: {
            name: true,
            capacity: true
          }
        }
      }
    })

    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    const currentBookings = classData.reservations.length
    const waitlistCount = classData.waitlist.length
    const currentCapacity = classData.capacity

    // Calculate constraints and recommendations
    const constraints = {
      minimumCapacity: currentBookings, // Can't go below current bookings
      maximumCapacity: Math.min(
        classData.classType.maxCapacity,
        classData.location.capacity
      ),
      classTypeLimit: classData.classType.maxCapacity,
      locationLimit: classData.location.capacity
    }

    const recommendations = {
      canIncreaseToAccommodateWaitlist: currentCapacity + waitlistCount <= constraints.maximumCapacity,
      suggestedCapacity: Math.min(
        currentCapacity + waitlistCount,
        constraints.maximumCapacity
      ),
      potentialRevenue: waitlistCount * Number(classData.classType.defaultPrice)
    }

    return NextResponse.json({
      className: classData.classType.name,
      location: classData.location.name,
      currentStatus: {
        capacity: currentCapacity,
        bookings: currentBookings,
        availableSpots: Math.max(0, currentCapacity - currentBookings),
        waitlistCount,
        isFull: currentBookings >= currentCapacity,
        status: classData.status
      },
      constraints,
      recommendations,
      waitlistDetails: classData.waitlist.map((entry, index) => ({
        position: index + 1,
        priority: entry.priority,
        waitingSince: entry.createdAt.toISOString()
      }))
    })

  } catch (error) {
    console.error('Class capacity info error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch capacity information' },
      { status: 500 }
    )
  }
}