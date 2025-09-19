import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, ClassStatus, ReservationStatus, PackageStatus } from '@prisma/client'
import { addDays, startOfDay, endOfDay } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.STUDENT) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const weeksAhead = parseInt(searchParams.get('weeks') || '4')
    const classTypeFilter = searchParams.get('classType')
    const instructorFilter = searchParams.get('instructor')

    // Calculate date range (next 2-4 weeks)
    const startDate = startOfDay(new Date())
    const endDate = endOfDay(addDays(startDate, weeksAhead * 7))

    const userId = BigInt(session.user.id)

    // Get user's active packages with remaining credits
    const userPackages = await prisma.package.findMany({
      where: {
        userId: userId,
        status: PackageStatus.ACTIVE,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ],
        usedCredits: {
          lt: prisma.package.fields.totalCredits
        }
      },
      include: {
        classType: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    })

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
    if (classTypeFilter) {
      classWhere.classType = {
        slug: classTypeFilter
      }
    }

    if (instructorFilter) {
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
        },
        reservations: {
          where: {
            status: {
              in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN]
            }
          },
          select: {
            id: true,
            userId: true,
            status: true
          }
        }
      },
      orderBy: {
        startsAt: 'asc'
      }
    })

    // Process classes with eligibility and availability info
    const classesWithEligibility = classes.map(classItem => {
      const confirmedReservations = classItem.reservations.length
      const availableSpots = classItem.capacity - confirmedReservations
      const isUserAlreadyBooked = classItem.reservations.some(r => r.userId === userId)

      // Determine eligibility based on user's packages
      let eligibility: 'eligible' | 'no_package' | 'wrong_type' | 'no_credits' = 'no_package'
      let eligiblePackages: Array<{
        id: string
        name: string
        remainingCredits: number
        classTypeName?: string
      }> = []

      if (userPackages.length > 0) {
        // Check for packages that can be used for this class
        const compatiblePackages = userPackages.filter(pkg => {
          const remainingCredits = pkg.totalCredits - pkg.usedCredits
          if (remainingCredits <= 0) return false

          // General packages (no classTypeId) can be used for any class
          if (!pkg.classTypeId) return true

          // Specific packages can only be used for their class type
          return pkg.classTypeId === classItem.classTypeId
        })

        if (compatiblePackages.length > 0) {
          eligibility = 'eligible'
          eligiblePackages = compatiblePackages.map(pkg => ({
            id: pkg.id.toString(),
            name: pkg.name,
            remainingCredits: pkg.totalCredits - pkg.usedCredits,
            classTypeName: pkg.classType?.name
          }))
        } else {
          // User has packages but none are compatible
          const hasCredits = userPackages.some(pkg => pkg.totalCredits - pkg.usedCredits > 0)
          eligibility = hasCredits ? 'wrong_type' : 'no_credits'
        }
      }

      return {
        id: classItem.id.toString(),
        uuid: classItem.uuid,
        startsAt: classItem.startsAt.toISOString(),
        endsAt: classItem.endsAt.toISOString(),
        capacity: classItem.capacity,
        price: Number(classItem.classType.defaultPrice),
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
          lastName: classItem.instructor.user.lastName,
          email: classItem.instructor.user.email
        } : null,

        location: {
          id: classItem.location.id.toString(),
          name: classItem.location.name,
          address: classItem.location.address
        },

        availability: {
          totalSpots: classItem.capacity,
          bookedSpots: confirmedReservations,
          availableSpots: availableSpots,
          isFull: availableSpots <= 0,
          isUserBooked: isUserAlreadyBooked
        },

        eligibility: {
          status: eligibility,
          eligiblePackages: eligiblePackages,
          canBook: !isUserAlreadyBooked && availableSpots > 0 && eligibility === 'eligible'
        }
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
      classes: classesWithEligibility,
      userPackages: userPackages.map(pkg => ({
        id: pkg.id.toString(),
        name: pkg.name,
        totalCredits: pkg.totalCredits,
        usedCredits: pkg.usedCredits,
        remainingCredits: pkg.totalCredits - pkg.usedCredits,
        expiresAt: pkg.expiresAt?.toISOString(),
        classType: pkg.classType ? {
          id: pkg.classType.id.toString(),
          name: pkg.classType.name,
          slug: pkg.classType.slug
        } : null
      })),
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
    console.error('Student classes fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch available classes' },
      { status: 500 }
    )
  }
}