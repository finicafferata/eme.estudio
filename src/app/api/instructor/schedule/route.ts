import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== 'INSTRUCTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const view = searchParams.get('view') || 'week' // 'day', 'week', 'month'

    // Get instructor record
    const instructor = await prisma.instructor.findUnique({
      where: {
        userId: BigInt(session.user.id),
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    if (!instructor) {
      return NextResponse.json({ error: 'Instructor not found' }, { status: 404 })
    }

    // Calculate date range
    const now = new Date()
    let start: Date
    let end: Date

    if (startDate && endDate) {
      start = new Date(startDate)
      end = new Date(endDate)
    } else {
      // Default to current week
      const today = new Date()
      const dayOfWeek = today.getDay()
      const diff = today.getDate() - dayOfWeek // Difference to get to Sunday

      switch (view) {
        case 'day':
          start = new Date(today)
          end = new Date(today)
          break
        case 'week':
          start = new Date(today.setDate(diff))
          end = new Date(today.setDate(diff + 6))
          break
        case 'month':
          start = new Date(today.getFullYear(), today.getMonth(), 1)
          end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
          break
        default:
          start = new Date(today.setDate(diff))
          end = new Date(today.setDate(diff + 6))
      }
    }

    // Ensure end of day for end date
    end.setHours(23, 59, 59, 999)
    start.setHours(0, 0, 0, 0)

    console.log('Instructor Schedule Query:', {
      instructorId: instructor.id,
      start,
      end,
      view
    })

    // Get instructor's classes for the specified period
    const classes = await prisma.class.findMany({
      where: {
        instructorId: instructor.id,
        startsAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        classType: {
          select: {
            name: true,
            slug: true,
            description: true,
            durationMinutes: true,
          },
        },
        location: {
          select: {
            name: true,
            address: true,
            capacity: true,
          },
        },
        reservations: {
          where: {
            status: {
              in: ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'],
            },
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
            package: {
              select: {
                name: true,
                totalCredits: true,
                usedCredits: true,
              },
            },
          },
          orderBy: {
            reservedAt: 'asc',
          },
        },
        waitlist: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
          orderBy: {
            priority: 'asc',
          },
        },
      },
      orderBy: {
        startsAt: 'asc',
      },
    })

    // Transform data for calendar view
    const calendarEvents = classes.map(classItem => transformClassToEvent(classItem))

    // Get upcoming classes (next 7 days)
    const upcomingEnd = new Date()
    upcomingEnd.setDate(upcomingEnd.getDate() + 7)
    upcomingEnd.setHours(23, 59, 59, 999)

    const upcomingClasses = await prisma.class.findMany({
      where: {
        instructorId: instructor.id,
        startsAt: {
          gte: now,
          lte: upcomingEnd,
        },
        status: {
          in: ['SCHEDULED', 'FULL'],
        },
      },
      include: {
        classType: {
          select: {
            name: true,
            durationMinutes: true,
          },
        },
        location: {
          select: {
            name: true,
          },
        },
        reservations: {
          where: {
            status: {
              in: ['CONFIRMED', 'CHECKED_IN'],
            },
          },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        startsAt: 'asc',
      },
      take: 10, // Limit to next 10 classes
    })

    // Get schedule changes (classes that were recently updated)
    const recentlyUpdated = await prisma.class.findMany({
      where: {
        instructorId: instructor.id,
        startsAt: {
          gte: now,
        },
        updatedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      include: {
        classType: {
          select: {
            name: true,
          },
        },
        location: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    // Calculate summary statistics
    const totalClassesInPeriod = classes.length
    const cancelledClasses = classes.filter(c => c.status === 'CANCELLED').length
    const completedClasses = classes.filter(c => c.status === 'COMPLETED').length
    const totalStudentsInPeriod = classes.reduce((sum, c) => sum + c.reservations.length, 0)

    const response = {
      instructor: {
        id: instructor.id.toString(),
        name: `${instructor.user.firstName} ${instructor.user.lastName}`,
        email: instructor.user.email,
        specialties: instructor.specialties,
      },
      dateRange: { start, end, view },
      calendarEvents,
      upcomingClasses: upcomingClasses.map(c => transformClassToEvent(c)),
      recentChanges: recentlyUpdated.map(c => ({
        id: c.id.toString(),
        uuid: c.uuid,
        classType: c.classType.name,
        location: c.location.name,
        startsAt: c.startsAt,
        endsAt: c.endsAt,
        status: c.status,
        updatedAt: c.updatedAt,
        changeType: getChangeType(c),
      })),
      summary: {
        totalClasses: totalClassesInPeriod,
        cancelledClasses,
        completedClasses,
        totalStudents: totalStudentsInPeriod,
        averageStudentsPerClass: totalClassesInPeriod > 0 ?
          Math.round((totalStudentsInPeriod / totalClassesInPeriod) * 10) / 10 : 0,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Instructor schedule error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch instructor schedule' },
      { status: 500 }
    )
  }
}

function transformClassToEvent(classItem: any) {
  const confirmedReservations = classItem.reservations || []
  const waitlistCount = classItem.waitlist?.length || 0

  return {
    id: classItem.id.toString(),
    uuid: classItem.uuid,
    title: classItem.classType.name,
    description: classItem.classType.description,
    start: classItem.startsAt,
    end: classItem.endsAt,
    status: classItem.status,
    location: {
      name: classItem.location.name,
      address: classItem.location.address,
      capacity: classItem.location.capacity,
    },
    classType: {
      name: classItem.classType.name,
      slug: classItem.classType.slug,
      durationMinutes: classItem.classType.durationMinutes,
    },
    capacity: classItem.capacity,
    price: Number(classItem.price),
    bookedStudents: confirmedReservations.length,
    availableSpots: classItem.capacity - confirmedReservations.length,
    waitlistCount,
    isFull: confirmedReservations.length >= classItem.capacity,
    students: confirmedReservations.map((reservation: any) => ({
      id: reservation.user.id.toString(),
      name: `${reservation.user.firstName} ${reservation.user.lastName}`,
      email: reservation.user.email,
      phone: reservation.user.phone,
      reservedAt: reservation.reservedAt,
      status: reservation.status,
      package: reservation.package ? {
        name: reservation.package.name,
        creditsUsed: reservation.package.usedCredits,
        totalCredits: reservation.package.totalCredits,
      } : null,
    })),
    waitlist: (classItem.waitlist || []).map((wait: any) => ({
      id: wait.user.id.toString(),
      name: `${wait.user.firstName} ${wait.user.lastName}`,
      email: wait.user.email,
      phone: wait.user.phone,
      priority: wait.priority,
      addedAt: wait.createdAt,
    })),
    notes: classItem.notes,
    createdAt: classItem.createdAt,
    updatedAt: classItem.updatedAt,
  }
}

function getChangeType(classItem: any): string {
  const now = new Date()
  const updatedRecently = new Date(classItem.updatedAt) > new Date(Date.now() - 60 * 60 * 1000) // Last hour

  if (classItem.status === 'CANCELLED') {
    return 'cancelled'
  }

  if (classItem.status === 'FULL' && updatedRecently) {
    return 'filled_up'
  }

  if (updatedRecently) {
    return 'updated'
  }

  return 'no_change'
}

// Helper function to get instructor's recurring patterns
async function getInstructorRecurringPatterns(instructorId: bigint) {
  return await prisma.recurringClassPattern.findMany({
    where: {
      instructorId,
      isActive: true,
    },
    include: {
      classType: {
        select: {
          name: true,
          slug: true,
          durationMinutes: true,
        },
      },
      location: {
        select: {
          name: true,
          address: true,
        },
      },
    },
    orderBy: [
      { dayOfWeek: 'asc' },
      { startTime: 'asc' },
    ],
  })
}