import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, ReservationStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.STUDENT) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'upcoming' // upcoming, past, all

    const userId = BigInt(session.user.id)

    // Build where clause based on filter
    let whereClause: any = {
      userId: userId
    }

    const now = new Date()

    switch (filter) {
      case 'upcoming':
        whereClause.class = {
          startsAt: { gte: now }
        }
        whereClause.status = {
          in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN]
        }
        break
      case 'past':
        whereClause.OR = [
          {
            class: { startsAt: { lt: now } }
          },
          {
            status: { in: [ReservationStatus.COMPLETED, ReservationStatus.CANCELLED, ReservationStatus.NO_SHOW] }
          }
        ]
        break
      case 'all':
        // No additional filters
        break
    }

    // Get user's reservations with class details
    const reservations = await prisma.reservation.findMany({
      where: whereClause,
      include: {
        class: {
          include: {
            classType: {
              select: {
                id: true,
                name: true,
                description: true,
                durationMinutes: true
              }
            },
            instructor: {
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
            location: {
              select: {
                id: true,
                name: true,
                address: true
              }
            }
          }
        },
        package: {
          select: {
            id: true,
            name: true,
            classType: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        class: {
          startsAt: filter === 'past' ? 'desc' : 'asc'
        }
      }
    })

    // Format reservations for frontend
    const formattedReservations = reservations.map(reservation => ({
      id: reservation.id.toString(),
      status: reservation.status,
      reservedAt: reservation.reservedAt.toISOString(),
      checkedInAt: reservation.checkedInAt?.toISOString(),
      cancelledAt: reservation.cancelledAt?.toISOString(),
      cancellationReason: reservation.cancellationReason,
      notes: reservation.notes,

      class: {
        id: reservation.class.id.toString(),
        startsAt: reservation.class.startsAt.toISOString(),
        endsAt: reservation.class.endsAt.toISOString(),
        capacity: reservation.class.capacity,
        price: Number(reservation.class.price),
        status: reservation.class.status,
        notes: reservation.class.notes,

        classType: {
          id: reservation.class.classType.id.toString(),
          name: reservation.class.classType.name,
          description: reservation.class.classType.description,
          durationMinutes: reservation.class.classType.durationMinutes
        },

        instructor: reservation.class.instructor ? {
          id: reservation.class.instructor.id.toString(),
          name: `${reservation.class.instructor.user.firstName} ${reservation.class.instructor.user.lastName}`,
          email: reservation.class.instructor.user.email
        } : null,

        location: {
          id: reservation.class.location.id.toString(),
          name: reservation.class.location.name,
          address: reservation.class.location.address
        }
      },

      package: reservation.package ? {
        id: reservation.package.id.toString(),
        name: reservation.package.name,
        classTypeName: reservation.package.classType?.name
      } : null
    }))

    // Get summary statistics
    const upcomingCount = await prisma.reservation.count({
      where: {
        userId: userId,
        class: {
          startsAt: { gte: now }
        },
        status: {
          in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN]
        }
      }
    })

    const completedCount = await prisma.reservation.count({
      where: {
        userId: userId,
        status: ReservationStatus.COMPLETED
      }
    })

    const cancelledCount = await prisma.reservation.count({
      where: {
        userId: userId,
        status: ReservationStatus.CANCELLED
      }
    })

    return NextResponse.json({
      reservations: formattedReservations,
      summary: {
        upcoming: upcomingCount,
        completed: completedCount,
        cancelled: cancelledCount,
        total: formattedReservations.length
      },
      filter: filter
    })

  } catch (error) {
    console.error('Student reservations fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reservations' },
      { status: 500 }
    )
  }
}