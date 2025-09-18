import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ClassStatus, ReservationStatus } from '@prisma/client'
import { addDays, startOfDay, endOfDay } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const weeksAhead = parseInt(searchParams.get('weeks') || '4')
    const classTypeFilter = searchParams.get('classType')
    const instructorFilter = searchParams.get('instructor')

    // Calculate date range (next 2-4 weeks)
    const startDate = startOfDay(new Date())
    const endDate = endOfDay(addDays(startDate, weeksAhead * 7))

    // Build where clause for classes
    const classWhere: any = {
      startsAt: {
        gte: startDate,
        lte: endDate
      },
      status: {
        in: [ClassStatus.SCHEDULED, ClassStatus.IN_PROGRESS]
      }
    }

    // Apply filters
    if (classTypeFilter && classTypeFilter !== 'all') {
      classWhere.classType = {
        slug: classTypeFilter
      }
    }

    if (instructorFilter && instructorFilter !== 'all') {
      classWhere.instructor = {
        user: {
          OR: [
            { firstName: { contains: instructorFilter, mode: 'insensitive' } },
            { lastName: { contains: instructorFilter, mode: 'insensitive' } }
          ]
        }
      }
    }

    // Get available classes with all related data
    const classes = await prisma.class.findMany({
      where: classWhere,
      include: {
        classType: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            durationMinutes: true,
            defaultPrice: true
          }
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
            id: true,
            name: true,
            address: true
          }
        },
        reservations: {
          where: {
            status: {
              in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN]
            }
          },
          select: {
            id: true,
            status: true,
            frameSize: true
          }
        }
      },
      orderBy: {
        startsAt: 'asc'
      }
    })

    // Process classes with availability info (no eligibility for public)
    const publicClasses = classes.map(classItem => {
      const confirmedReservations = classItem.reservations.length
      const availableSpots = classItem.capacity - confirmedReservations

      // Calculate frame-specific availability
      const smallBooked = classItem.reservations.filter(r => r.frameSize === 'SMALL').length
      const mediumBooked = classItem.reservations.filter(r => r.frameSize === 'MEDIUM').length
      const largeBooked = classItem.reservations.filter(r => r.frameSize === 'LARGE').length

      const frameAvailability = {
        small: {
          capacity: classItem.smallFrameCapacity || 2,
          booked: smallBooked,
          available: Math.max(0, (classItem.smallFrameCapacity || 2) - smallBooked)
        },
        medium: {
          capacity: classItem.mediumFrameCapacity || 3,
          booked: mediumBooked,
          available: Math.max(0, (classItem.mediumFrameCapacity || 3) - mediumBooked)
        },
        large: {
          capacity: classItem.largeFrameCapacity || 1,
          booked: largeBooked,
          available: Math.max(0, (classItem.largeFrameCapacity || 1) - largeBooked)
        }
      }

      const totalFrameCapacity = frameAvailability.small.capacity + frameAvailability.medium.capacity + frameAvailability.large.capacity
      const totalFrameAvailable = frameAvailability.small.available + frameAvailability.medium.available + frameAvailability.large.available

      return {
        id: classItem.id.toString(),
        uuid: classItem.uuid,
        startsAt: classItem.startsAt.toISOString(),
        endsAt: classItem.endsAt.toISOString(),
        capacity: classItem.capacity,
        price: Number(classItem.classType.defaultPrice), // Use default price for guests
        status: classItem.status,
        notes: classItem.notes,

        classType: {
          id: classItem.classType.id.toString(),
          name: classItem.classType.name,
          slug: classItem.classType.slug,
          description: classItem.classType.description,
          durationMinutes: classItem.classType.durationMinutes
        },

        instructor: classItem.instructor ? {
          id: classItem.instructor.id.toString(),
          name: `${classItem.instructor.user.firstName} ${classItem.instructor.user.lastName}`,
          firstName: classItem.instructor.user.firstName,
          lastName: classItem.instructor.user.lastName
        } : null,

        location: {
          id: classItem.location.id.toString(),
          name: classItem.location.name,
          address: classItem.location.address
        },

        availability: {
          totalSpots: totalFrameCapacity,
          bookedSpots: confirmedReservations,
          availableSpots: totalFrameAvailable,
          isFull: totalFrameAvailable <= 0,
          canBook: totalFrameAvailable > 0
        },

        frameAvailability: frameAvailability
      }
    })

    // Get available class types for filters
    const classTypes = await prisma.classType.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true
      },
      orderBy: { name: 'asc' }
    })

    // Get available instructors for filters
    const instructors = await prisma.instructor.findMany({
      where: { isAvailable: true },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        user: {
          firstName: 'asc'
        }
      }
    })

    return NextResponse.json({
      classes: publicClasses,
      filters: {
        classTypes: classTypes.map(ct => ({
          id: ct.id.toString(),
          name: ct.name,
          slug: ct.slug,
          description: ct.description
        })),
        instructors: instructors.map(instructor => ({
          id: instructor.id.toString(),
          name: `${instructor.user.firstName} ${instructor.user.lastName}`,
          firstName: instructor.user.firstName,
          lastName: instructor.user.lastName
        }))
      },
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        weeksAhead: weeksAhead
      }
    })

  } catch (error) {
    console.error('Public classes fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch available classes' },
      { status: 500 }
    )
  }
}