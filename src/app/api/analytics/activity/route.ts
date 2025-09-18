import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, ReservationStatus } from '@prisma/client'

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const filter = searchParams.get('filter') || 'all'

    // Get recent activity
    const activities = await getRecentActivity(limit, filter)

    // Get today's stats
    const stats = await getTodayStats()

    return NextResponse.json({
      activities,
      stats
    })

  } catch (error) {
    console.error('Activity analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activity analytics' },
      { status: 500 }
    )
  }
}

async function getRecentActivity(limit: number, filter: string) {
  const twentyFourHoursAgo = new Date()
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

  // Get recent reservations
  const reservations = await prisma.reservation.findMany({
    where: {
      createdAt: {
        gte: twentyFourHoursAgo
      },
      ...(filter === 'bookings' && { status: { in: [ReservationStatus.CONFIRMED] } }),
      ...(filter === 'cancellations' && { status: ReservationStatus.CANCELLED }),
      ...(filter === 'checkins' && { status: ReservationStatus.CHECKED_IN })
    },
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
          classType: {
            select: {
              name: true
            }
          },
          location: {
            select: {
              name: true
            }
          }
        }
      },
      package: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: limit
  })

  // Get recent waitlist activity
  const waitlistActivity = await prisma.waitlist.findMany({
    where: {
      createdAt: {
        gte: twentyFourHoursAgo
      }
    },
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
          classType: {
            select: {
              name: true
            }
          },
          location: {
            select: {
              name: true
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: filter === 'waitlist' ? limit : Math.floor(limit / 3)
  })

  // Combine and format activities
  const activities = []

  // Add reservation activities
  for (const reservation of reservations) {
    let activityType = 'BOOKING'
    let timestamp = reservation.createdAt

    if (reservation.status === ReservationStatus.CANCELLED && reservation.cancelledAt) {
      activityType = 'CANCELLATION'
      timestamp = reservation.cancelledAt
    } else if (reservation.status === ReservationStatus.CHECKED_IN && reservation.checkedInAt) {
      activityType = 'CHECKIN'
      timestamp = reservation.checkedInAt
    }

    activities.push({
      id: `reservation-${reservation.id}`,
      type: activityType,
      timestamp: timestamp.toISOString(),
      student: {
        id: reservation.user.id.toString(),
        name: `${reservation.user.firstName} ${reservation.user.lastName}`,
        email: reservation.user.email
      },
      class: {
        id: reservation.class.id.toString(),
        name: reservation.class.classType.name,
        startsAt: reservation.class.startsAt.toISOString(),
        location: reservation.class.location.name
      },
      metadata: {
        packageUsed: !!reservation.package,
        reason: reservation.cancellationReason
      }
    })
  }

  // Add waitlist activities
  for (const waitlistEntry of waitlistActivity) {
    activities.push({
      id: `waitlist-${waitlistEntry.id}`,
      type: 'WAITLIST_JOIN',
      timestamp: waitlistEntry.createdAt.toISOString(),
      student: {
        id: waitlistEntry.user.id.toString(),
        name: `${waitlistEntry.user.firstName} ${waitlistEntry.user.lastName}`,
        email: waitlistEntry.user.email
      },
      class: {
        id: waitlistEntry.class.id.toString(),
        name: waitlistEntry.class.classType.name,
        startsAt: waitlistEntry.class.startsAt.toISOString(),
        location: waitlistEntry.class.location.name
      },
      metadata: {
        waitlistPosition: waitlistEntry.priority
      }
    })
  }

  // Sort by timestamp and limit
  return activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit)
}

async function getTodayStats() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Today's bookings
  const todayBookings = await prisma.reservation.count({
    where: {
      createdAt: {
        gte: today,
        lt: tomorrow
      },
      status: {
        in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN]
      }
    }
  })

  // Today's cancellations
  const todayCancellations = await prisma.reservation.count({
    where: {
      cancelledAt: {
        gte: today,
        lt: tomorrow
      },
      status: ReservationStatus.CANCELLED
    }
  })

  // Active users (users with reservations in the next 7 days)
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)

  const activeUsersData = await prisma.reservation.findMany({
    where: {
      class: {
        startsAt: {
          gte: new Date(),
          lte: nextWeek
        }
      },
      status: {
        in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN]
      }
    },
    distinct: ['userId'],
    select: { userId: true }
  })
  const activeUsers = activeUsersData.length

  // Popular time slots (last 7 days)
  const lastWeek = new Date()
  lastWeek.setDate(lastWeek.getDate() - 7)

  const timeSlotBookings = await prisma.reservation.findMany({
    where: {
      createdAt: {
        gte: lastWeek
      },
      status: {
        in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN]
      }
    },
    include: {
      class: {
        select: {
          startsAt: true
        }
      }
    }
  })

  const timeSlotCounts = timeSlotBookings.reduce((acc, reservation) => {
    const hour = new Date(reservation.class.startsAt).getHours()
    const timeSlot = `${hour.toString().padStart(2, '0')}:00`
    acc[timeSlot] = (acc[timeSlot] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const popularTimeSlots = Object.entries(timeSlotCounts)
    .map(([timeSlot, bookings]) => ({ timeSlot, bookings }))
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 5)

  // Fast filling classes (classes with > 80% capacity in next 7 days)
  const upcomingClasses = await prisma.class.findMany({
    where: {
      startsAt: {
        gte: new Date(),
        lte: nextWeek
      }
    },
    include: {
      classType: {
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

  const fastFillingClasses = upcomingClasses
    .map(classItem => ({
      classId: classItem.id.toString(),
      className: classItem.classType.name,
      startsAt: classItem.startsAt.toISOString(),
      capacity: classItem.capacity,
      booked: classItem.reservations.length,
      fillRate: (classItem.reservations.length / classItem.capacity) * 100
    }))
    .filter(classItem => classItem.fillRate >= 80)
    .sort((a, b) => b.fillRate - a.fillRate)
    .slice(0, 5)

  return {
    todayBookings,
    todayCancellations,
    activeUsers,
    popularTimeSlots,
    fastFillingClasses
  }
}