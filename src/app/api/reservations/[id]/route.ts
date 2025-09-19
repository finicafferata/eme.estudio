import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, ReservationStatus, ClassStatus } from '@prisma/client'

interface RouteContext {
  params: Promise<{ id: string }>
}

// Get single reservation
export async function GET(request: Request, context: RouteContext) {
  try {
    const params = await context.params
    const session = await auth()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: BigInt(params.id) },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        class: {
          include: {
            classType: true,
            location: true,
            instructor: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
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

    const formattedReservation = {
      id: reservation.id.toString(),
      status: reservation.status,
      reservedAt: reservation.reservedAt.toISOString(),
      checkedInAt: reservation.checkedInAt?.toISOString(),
      cancelledAt: reservation.cancelledAt?.toISOString(),
      cancellationReason: reservation.cancellationReason,
      notes: reservation.notes,
      student: {
        id: reservation.user.id.toString(),
        name: `${reservation.user.firstName} ${reservation.user.lastName}`,
        email: reservation.user.email
      },
      class: {
        id: reservation.class.id.toString(),
        uuid: reservation.class.uuid,
        name: reservation.class.classType.name,
        description: reservation.class.classType.description,
        startsAt: reservation.class.startsAt.toISOString(),
        endsAt: reservation.class.endsAt.toISOString(),
        capacity: reservation.class.capacity,
        status: reservation.class.status,
        price: Number(reservation.class.classType.defaultPrice),
        location: {
          name: reservation.class.location.name,
          address: reservation.class.location.address
        },
        instructor: reservation.class.instructor ?
          `${reservation.class.instructor.user.firstName} ${reservation.class.instructor.user.lastName}` :
          'No instructor assigned'
      },
      package: reservation.package ? {
        name: reservation.package.name,
        creditsUsed: reservation.package.usedCredits,
        totalCredits: reservation.package.totalCredits
      } : null
    }

    return NextResponse.json(formattedReservation)

  } catch (error) {
    console.error('Reservation GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reservation' },
      { status: 500 }
    )
  }
}

// Update reservation (check-in, cancel, etc.)
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const params = await context.params
    const session = await auth()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      status,
      cancellationReason,
      notes,
      restoreCredits = true,
      policyOverride = false,
      adminCancellation = false,
      hoursBeforeClass = 0
    } = body

    const reservation = await prisma.reservation.findUnique({
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
            },
            waitlist: {
              orderBy: { priority: 'asc' }
            }
          }
        }
      }
    })

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    const updateData: any = {}

    if (status) {
      updateData.status = status

      if (status === ReservationStatus.CHECKED_IN) {
        updateData.checkedInAt = new Date()
      } else if (status === ReservationStatus.COMPLETED) {
        // Mark as completed - this means student attended the class
        // Credits should already be deducted when reservation was made
        // No additional action needed here
      } else if (status === ReservationStatus.CANCELLED) {
        updateData.cancelledAt = new Date()
        if (cancellationReason) {
          updateData.cancellationReason = cancellationReason
        }
      }
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    // Update the reservation
    const updatedReservation = await prisma.reservation.update({
      where: { id: BigInt(params.id) },
      data: updateData
    })

    // Handle waitlist and class status updates if cancelling
    if (status === ReservationStatus.CANCELLED) {
      // Check if we can promote someone from waitlist
      const nextWaitlistEntry = reservation.class.waitlist[0]

      if (nextWaitlistEntry) {
        // Create reservation for waitlisted user
        await prisma.reservation.create({
          data: {
            userId: nextWaitlistEntry.userId,
            classId: reservation.classId,
            status: ReservationStatus.CONFIRMED
          }
        })

        // Remove from waitlist
        await prisma.waitlist.delete({
          where: { id: nextWaitlistEntry.id }
        })

        // Update priorities for remaining waitlist entries
        await prisma.waitlist.updateMany({
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
      } else {
        // No waitlist, check if class should no longer be FULL
        const activeReservations = reservation.class.reservations.filter(
          r => r.id !== reservation.id // Exclude the cancelled one
        ).length

        if (activeReservations < reservation.class.capacity &&
            reservation.class.status === ClassStatus.FULL) {
          await prisma.class.update({
            where: { id: reservation.classId },
            data: { status: ClassStatus.SCHEDULED }
          })
        }
      }

      // Handle credit restoration based on policy and admin override
      if (reservation.packageId && restoreCredits) {
        await prisma.package.update({
          where: { id: reservation.packageId },
          data: {
            usedCredits: {
              decrement: 1
            }
          }
        })

        // Log the credit restoration
        if (adminCancellation) {
          await prisma.auditLog.create({
            data: {
              userId: BigInt((session.user as any).id),
              action: 'CREDIT_RESTORED',
              tableName: 'packages',
              recordId: reservation.packageId,
              newValues: {
                reason: cancellationReason,
                policyOverride,
                hoursBeforeClass,
                adminCancellation: true
              }
            }
          })
        }
      }
    }

    return NextResponse.json({
      message: 'Reservation updated successfully',
      reservation: {
        id: updatedReservation.id.toString(),
        status: updatedReservation.status,
        checkedInAt: updatedReservation.checkedInAt?.toISOString(),
        cancelledAt: updatedReservation.cancelledAt?.toISOString(),
        cancellationReason: updatedReservation.cancellationReason,
        notes: updatedReservation.notes
      }
    })

  } catch (error) {
    console.error('Reservation PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update reservation' },
      { status: 500 }
    )
  }
}

// Delete reservation (admin only)
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const params = await context.params
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: BigInt(params.id) },
      include: {
        class: {
          include: {
            waitlist: {
              orderBy: { priority: 'asc' }
            }
          }
        }
      }
    })

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    // Delete the reservation
    await prisma.reservation.delete({
      where: { id: BigInt(params.id) }
    })

    // Handle waitlist promotion and class status update (same logic as cancellation)
    const nextWaitlistEntry = reservation.class.waitlist[0]

    if (nextWaitlistEntry) {
      await prisma.reservation.create({
        data: {
          userId: nextWaitlistEntry.userId,
          classId: reservation.classId,
          status: ReservationStatus.CONFIRMED
        }
      })

      await prisma.waitlist.delete({
        where: { id: nextWaitlistEntry.id }
      })

      await prisma.waitlist.updateMany({
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
    }

    // Refund package credit if applicable
    if (reservation.packageId) {
      await prisma.package.update({
        where: { id: reservation.packageId },
        data: {
          usedCredits: {
            decrement: 1
          }
        }
      })
    }

    return NextResponse.json({
      message: 'Reservation deleted successfully'
    })

  } catch (error) {
    console.error('Reservation DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete reservation' },
      { status: 500 }
    )
  }
}