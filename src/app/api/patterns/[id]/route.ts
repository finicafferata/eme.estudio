import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, ClassStatus } from '@prisma/client'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const patternId = parseInt(params.id)
    if (isNaN(patternId)) {
      return NextResponse.json({ error: 'Invalid pattern ID' }, { status: 400 })
    }

    const pattern = await prisma.recurringClassPattern.findUnique({
      where: { id: patternId },
      include: {
        classType: {
          select: {
            id: true,
            name: true,
            description: true,
            durationMinutes: true,
            defaultPrice: true
          }
        },
        instructor: {
          include: {
            user: {
              select: {
                id: true,
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
            address: true,
            capacity: true
          }
        }
      }
    })

    if (!pattern) {
      return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })
    }

    // Get generated classes for this pattern (next 4 weeks)
    const now = new Date()
    const fourWeeksFromNow = new Date(now.getTime() + 4 * 7 * 24 * 60 * 60 * 1000)

    const generatedClasses = await prisma.class.findMany({
      where: {
        classTypeId: pattern.classTypeId,
        locationId: pattern.locationId,
        startsAt: {
          gte: now,
          lte: fourWeeksFromNow
        },
        notes: {
          contains: pattern.name
        }
      },
      include: {
        reservations: {
          where: {
            status: {
              in: ['CONFIRMED', 'CHECKED_IN']
            }
          }
        }
      },
      orderBy: {
        startsAt: 'asc'
      }
    })

    const patternDetails = {
      id: pattern.id.toString(),
      name: pattern.name,
      dayOfWeek: pattern.dayOfWeek,
      dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][pattern.dayOfWeek],
      startTime: pattern.startTime.toTimeString().slice(0, 5),
      durationMinutes: pattern.durationMinutes,
      endTime: new Date(new Date(`1970-01-01T${pattern.startTime.toTimeString().slice(0, 8)}`).getTime() + pattern.durationMinutes * 60000).toTimeString().slice(0, 5),
      capacity: pattern.capacity,
      price: Number(pattern.classType.defaultPrice),
      isActive: pattern.isActive,
      validFrom: pattern.validFrom.toISOString().split('T')[0],
      validUntil: pattern.validUntil?.toISOString().split('T')[0],
      createdAt: pattern.createdAt.toISOString(),
      updatedAt: pattern.updatedAt.toISOString(),
      classType: pattern.classType,
      instructor: pattern.instructor ? {
        id: pattern.instructor.id.toString(),
        name: `${pattern.instructor.user.firstName} ${pattern.instructor.user.lastName}`,
        firstName: pattern.instructor.user.firstName,
        lastName: pattern.instructor.user.lastName,
        email: pattern.instructor.user.email
      } : null,
      location: pattern.location,
      upcomingClasses: generatedClasses.map(cls => ({
        id: cls.id.toString(),
        startsAt: cls.startsAt.toISOString(),
        endsAt: cls.endsAt.toISOString(),
        status: cls.status,
        capacity: cls.capacity,
        reservedSpots: cls.reservations.length,
        availableSpots: cls.capacity - cls.reservations.length
      })),
      statistics: {
        totalUpcomingClasses: generatedClasses.length,
        totalReservations: generatedClasses.reduce((sum, cls) => sum + cls.reservations.length, 0),
        averageBookingRate: generatedClasses.length > 0
          ? (generatedClasses.reduce((sum, cls) => sum + cls.reservations.length, 0) / generatedClasses.reduce((sum, cls) => sum + cls.capacity, 0)) * 100
          : 0
      }
    }

    return NextResponse.json(patternDetails)

  } catch (error) {
    console.error('Pattern GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pattern details' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const patternId = parseInt(params.id)
    if (isNaN(patternId)) {
      return NextResponse.json({ error: 'Invalid pattern ID' }, { status: 400 })
    }

    const body = await request.json()
    const {
      name,
      classTypeId,
      instructorId,
      locationId,
      dayOfWeek,
      startTime,
      durationMinutes,
      capacity,
      price,
      isActive,
      validFrom,
      validUntil
    } = body

    // Check if pattern exists
    const existingPattern = await prisma.recurringClassPattern.findUnique({
      where: { id: patternId }
    })

    if (!existingPattern) {
      return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {}

    if (name !== undefined) updateData.name = name
    if (classTypeId !== undefined) updateData.classTypeId = parseInt(classTypeId)
    if (instructorId !== undefined) {
      updateData.instructorId = instructorId ? parseInt(instructorId) : null
    }
    if (locationId !== undefined) updateData.locationId = parseInt(locationId)
    if (dayOfWeek !== undefined) updateData.dayOfWeek = parseInt(dayOfWeek)
    if (startTime !== undefined) {
      const [hours, minutes] = startTime.split(':').map(Number)
      const timeDate = new Date()
      timeDate.setHours(hours, minutes, 0, 0)
      updateData.startTime = timeDate
    }
    if (durationMinutes !== undefined) updateData.durationMinutes = parseInt(durationMinutes)
    if (capacity !== undefined) updateData.capacity = parseInt(capacity)
    if (price !== undefined) updateData.price = parseFloat(price)
    if (isActive !== undefined) updateData.isActive = isActive
    if (validFrom !== undefined) updateData.validFrom = new Date(validFrom)
    if (validUntil !== undefined) {
      updateData.validUntil = validUntil ? new Date(validUntil) : null
    }

    updateData.updatedAt = new Date()

    // Update the pattern
    const updatedPattern = await prisma.recurringClassPattern.update({
      where: { id: patternId },
      data: updateData,
      include: {
        classType: true,
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
        location: true
      }
    })

    const patternResponse = {
      id: updatedPattern.id.toString(),
      name: updatedPattern.name,
      dayOfWeek: updatedPattern.dayOfWeek,
      dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][updatedPattern.dayOfWeek],
      startTime: updatedPattern.startTime.toTimeString().slice(0, 5),
      durationMinutes: updatedPattern.durationMinutes,
      capacity: updatedPattern.capacity,
      price: Number(updatedPattern.classType.defaultPrice),
      isActive: updatedPattern.isActive,
      validFrom: updatedPattern.validFrom.toISOString().split('T')[0],
      validUntil: updatedPattern.validUntil?.toISOString().split('T')[0],
      updatedAt: updatedPattern.updatedAt.toISOString(),
      classType: updatedPattern.classType,
      instructor: updatedPattern.instructor ? {
        id: updatedPattern.instructor.id.toString(),
        name: `${updatedPattern.instructor.user.firstName} ${updatedPattern.instructor.user.lastName}`,
        email: updatedPattern.instructor.user.email
      } : null,
      location: updatedPattern.location
    }

    return NextResponse.json(patternResponse)

  } catch (error) {
    console.error('Pattern PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update pattern' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const patternId = parseInt(params.id)
    if (isNaN(patternId)) {
      return NextResponse.json({ error: 'Invalid pattern ID' }, { status: 400 })
    }

    // Check if pattern exists
    const existingPattern = await prisma.recurringClassPattern.findUnique({
      where: { id: patternId }
    })

    if (!existingPattern) {
      return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })
    }

    // Get future classes generated from this pattern
    const futureClasses = await prisma.class.findMany({
      where: {
        startsAt: {
          gte: new Date()
        },
        notes: {
          contains: existingPattern.name
        }
      },
      include: {
        reservations: {
          where: {
            status: {
              in: ['CONFIRMED', 'CHECKED_IN']
            }
          }
        }
      }
    })

    const classesWithReservations = futureClasses.filter(cls => cls.reservations.length > 0)

    if (classesWithReservations.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete pattern with ${classesWithReservations.length} future classes that have reservations. Cancel reservations first or set pattern to inactive.`
        },
        { status: 400 }
      )
    }

    // Delete future classes without reservations
    await prisma.class.deleteMany({
      where: {
        startsAt: {
          gte: new Date()
        },
        notes: {
          contains: existingPattern.name
        }
      }
    })

    // Delete the pattern
    await prisma.recurringClassPattern.delete({
      where: { id: patternId }
    })

    return NextResponse.json({
      message: 'Pattern and associated future classes deleted successfully',
      deletedClasses: futureClasses.length - classesWithReservations.length
    })

  } catch (error) {
    console.error('Pattern DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete pattern' },
      { status: 500 }
    )
  }
}