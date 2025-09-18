import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, ReservationStatus } from '@prisma/client'

interface RouteContext {
  params: Promise<{ id: string }>
}

// Remove from waitlist
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const params = await context.params
    const session = await auth()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const waitlistEntry = await prisma.waitlist.findUnique({
      where: { id: BigInt(params.id) },
      include: {
        class: true
      }
    })

    if (!waitlistEntry) {
      return NextResponse.json({ error: 'Waitlist entry not found' }, { status: 404 })
    }

    // Only admins or the user themselves can remove from waitlist
    const isAdmin = (session.user as any).role === UserRole.ADMIN
    const isOwnEntry = waitlistEntry.userId.toString() === (session.user as any).id

    if (!isAdmin && !isOwnEntry) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Delete the waitlist entry
    await prisma.waitlist.delete({
      where: { id: BigInt(params.id) }
    })

    // Update priorities for remaining entries
    await prisma.waitlist.updateMany({
      where: {
        classId: waitlistEntry.classId,
        priority: { gt: waitlistEntry.priority }
      },
      data: {
        priority: {
          decrement: 1
        }
      }
    })

    return NextResponse.json({
      message: 'Removed from waitlist successfully'
    })

  } catch (error) {
    console.error('Waitlist DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to remove from waitlist' },
      { status: 500 }
    )
  }
}

// Promote from waitlist to reservation (admin only)
export async function POST(request: Request, context: RouteContext) {
  try {
    const params = await context.params
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { packageId } = body

    const waitlistEntry = await prisma.waitlist.findUnique({
      where: { id: BigInt(params.id) },
      include: {
        class: {
          include: {
            reservations: {
              where: {
                status: {
                  in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN]
                }
              }
            }
          }
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    if (!waitlistEntry) {
      return NextResponse.json({ error: 'Waitlist entry not found' }, { status: 404 })
    }

    // Check if class has capacity
    const currentBookings = waitlistEntry.class.reservations.length
    if (currentBookings >= waitlistEntry.class.capacity) {
      return NextResponse.json(
        { error: 'Class is still at full capacity' },
        { status: 409 }
      )
    }

    // Check if user already has a reservation (shouldn't happen, but safety check)
    const existingReservation = await prisma.reservation.findUnique({
      where: {
        userId_classId: {
          userId: waitlistEntry.userId,
          classId: waitlistEntry.classId
        }
      }
    })

    if (existingReservation) {
      return NextResponse.json(
        { error: 'User already has a reservation for this class' },
        { status: 409 }
      )
    }

    // Create the reservation
    const reservation = await prisma.reservation.create({
      data: {
        userId: waitlistEntry.userId,
        classId: waitlistEntry.classId,
        packageId: packageId ? BigInt(packageId) : null,
        status: ReservationStatus.CONFIRMED
      }
    })

    // Remove from waitlist
    await prisma.waitlist.delete({
      where: { id: BigInt(params.id) }
    })

    // Update priorities for remaining waitlist entries
    await prisma.waitlist.updateMany({
      where: {
        classId: waitlistEntry.classId,
        priority: { gt: waitlistEntry.priority }
      },
      data: {
        priority: {
          decrement: 1
        }
      }
    })

    // Update package credits if applicable
    if (packageId) {
      await prisma.package.update({
        where: { id: BigInt(packageId) },
        data: {
          usedCredits: {
            increment: 1
          }
        }
      })
    }

    return NextResponse.json({
      message: 'Successfully promoted from waitlist to reservation',
      reservation: {
        id: reservation.id.toString(),
        status: reservation.status,
        student: `${waitlistEntry.user.firstName} ${waitlistEntry.user.lastName}`,
        studentEmail: waitlistEntry.user.email
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Waitlist promote error:', error)
    return NextResponse.json(
      { error: 'Failed to promote from waitlist' },
      { status: 500 }
    )
  }
}

// Update waitlist priority (admin only)
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const params = await context.params
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { priority } = body

    if (!priority || priority < 1) {
      return NextResponse.json(
        { error: 'Valid priority is required' },
        { status: 400 }
      )
    }

    const waitlistEntry = await prisma.waitlist.findUnique({
      where: { id: BigInt(params.id) }
    })

    if (!waitlistEntry) {
      return NextResponse.json({ error: 'Waitlist entry not found' }, { status: 404 })
    }

    const oldPriority = waitlistEntry.priority
    const newPriority = priority

    if (oldPriority === newPriority) {
      return NextResponse.json({
        message: 'No change in priority'
      })
    }

    // Update the specific entry
    await prisma.waitlist.update({
      where: { id: BigInt(params.id) },
      data: { priority: newPriority }
    })

    // Adjust other priorities accordingly
    if (newPriority < oldPriority) {
      // Moving up in priority - increment others in between
      await prisma.waitlist.updateMany({
        where: {
          classId: waitlistEntry.classId,
          id: { not: BigInt(params.id) },
          priority: {
            gte: newPriority,
            lt: oldPriority
          }
        },
        data: {
          priority: {
            increment: 1
          }
        }
      })
    } else {
      // Moving down in priority - decrement others in between
      await prisma.waitlist.updateMany({
        where: {
          classId: waitlistEntry.classId,
          id: { not: BigInt(params.id) },
          priority: {
            gt: oldPriority,
            lte: newPriority
          }
        },
        data: {
          priority: {
            decrement: 1
          }
        }
      })
    }

    return NextResponse.json({
      message: 'Waitlist priority updated successfully',
      newPriority
    })

  } catch (error) {
    console.error('Waitlist PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update waitlist priority' },
      { status: 500 }
    )
  }
}