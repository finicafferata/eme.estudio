import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, ClassStatus, ReservationStatus } from '@prisma/client'

// Utility function to convert BigInt values to strings recursively
function convertBigIntToString(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (typeof obj === 'bigint') {
    return obj.toString()
  }

  if (obj instanceof Date) {
    return obj.toISOString()
  }

  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToString)
  }

  if (typeof obj === 'object') {
    const converted: any = {}
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertBigIntToString(value)
    }
    return converted
  }

  return obj
}

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

    const classId = parseInt(params.id)
    if (isNaN(classId)) {
      return NextResponse.json({ error: 'Invalid class ID' }, { status: 400 })
    }

    const classItem = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        classType: {
          select: {
            id: true,
            name: true,
            description: true,
            durationMinutes: true,
            defaultPrice: true,
            maxCapacity: true
          }
        },
        instructor: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true
              }
            }
          }
        },
        location: {
          select: {
            id: true,
            name: true,
            address: true,
            capacity: true,
            amenities: true
          }
        },
        reservations: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true
              }
            },
            package: {
              select: {
                id: true,
                name: true,
                totalCredits: true,
                usedCredits: true
              }
            }
          },
          orderBy: {
            reservedAt: 'asc'
          }
        }
      }
    })

    if (!classItem) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    // Use utility function to automatically convert all BigInt values
    const classDetails = convertBigIntToString({
      id: classItem.id,
      uuid: classItem.uuid,
      startsAt: classItem.startsAt,
      endsAt: classItem.endsAt,
      capacity: classItem.capacity,
      smallFrameCapacity: classItem.smallFrameCapacity,
      mediumFrameCapacity: classItem.mediumFrameCapacity,
      largeFrameCapacity: classItem.largeFrameCapacity,
      status: classItem.status,
      notes: classItem.notes,
      createdAt: classItem.createdAt,
      updatedAt: classItem.updatedAt,
      classType: classItem.classType,
      instructor: classItem.instructor,
      location: classItem.location,
      reservations: classItem.reservations.map(reservation => ({
        id: reservation.id,
        status: reservation.status,
        reservedAt: reservation.reservedAt,
        checkedInAt: reservation.checkedInAt,
        cancelledAt: reservation.cancelledAt,
        cancellationReason: reservation.cancellationReason,
        notes: reservation.notes,
        student: {
          id: reservation.user.id,
          name: `${reservation.user.firstName} ${reservation.user.lastName}`,
          firstName: reservation.user.firstName,
          lastName: reservation.user.lastName,
          email: reservation.user.email,
          phone: reservation.user.phone
        },
        package: reservation.package ? {
          id: reservation.package.id,
          name: reservation.package.name,
          totalCredits: reservation.package.totalCredits,
          usedCredits: reservation.package.usedCredits,
          remainingCredits: reservation.package.totalCredits - reservation.package.usedCredits
        } : null
      })),
      availableSpots: classItem.capacity - classItem.reservations.filter(r =>
        r.status === 'CONFIRMED' || r.status === 'CHECKED_IN'
      ).length,
      statistics: {
        totalReservations: classItem.reservations.length,
        confirmedReservations: classItem.reservations.filter(r => r.status === 'CONFIRMED').length,
        checkedInStudents: classItem.reservations.filter(r => r.status === 'CHECKED_IN').length,
        cancelledReservations: classItem.reservations.filter(r => r.status === 'CANCELLED').length,
        noShows: classItem.reservations.filter(r => r.status === 'NO_SHOW').length
      }
    })

    return NextResponse.json(classDetails)

  } catch (error) {
    console.error('Class GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch class details' },
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

    const classId = parseInt(params.id)
    if (isNaN(classId)) {
      return NextResponse.json({ error: 'Invalid class ID' }, { status: 400 })
    }

    const body = await request.json()
    const {
      classTypeId,
      instructorId,
      locationId,
      startsAt,
      endsAt,
      capacity,
      price,
      status,
      notes
    } = body

    // Check if class exists
    const existingClass = await prisma.class.findUnique({
      where: { id: classId },
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

    if (!existingClass) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    // Validate capacity change doesn't conflict with existing reservations
    if (capacity !== undefined) {
      const confirmedReservations = existingClass.reservations.length
      if (capacity < confirmedReservations) {
        return NextResponse.json(
          {
            error: `Cannot reduce capacity below ${confirmedReservations} (current confirmed reservations)`
          },
          { status: 400 }
        )
      }
    }

    // Validate time changes don't conflict with reservations
    if ((startsAt || endsAt) && existingClass.reservations.length > 0) {
      const classStart = new Date(existingClass.startsAt)
      const now = new Date()

      // Don't allow time changes within 24 hours of class start
      if (classStart.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
        return NextResponse.json(
          { error: 'Cannot change class time within 24 hours of class start when reservations exist' },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const updateData: any = {}

    if (classTypeId !== undefined) updateData.classTypeId = parseInt(classTypeId)
    if (instructorId !== undefined) {
      updateData.instructorId = instructorId ? parseInt(instructorId) : null
    }
    if (locationId !== undefined) updateData.locationId = parseInt(locationId)
    if (startsAt !== undefined) updateData.startsAt = new Date(startsAt)
    if (endsAt !== undefined) updateData.endsAt = new Date(endsAt)
    if (capacity !== undefined) updateData.capacity = parseInt(capacity)
    if (price !== undefined) updateData.price = parseFloat(price)
    if (status !== undefined) updateData.status = status as ClassStatus
    if (notes !== undefined) updateData.notes = notes

    updateData.updatedAt = new Date()

    // Update the class
    const updatedClass = await prisma.class.update({
      where: { id: classId },
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
        location: true,
        reservations: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      }
    })

    const classResponse = {
      id: updatedClass.id.toString(),
      uuid: updatedClass.uuid,
      startsAt: updatedClass.startsAt.toISOString(),
      endsAt: updatedClass.endsAt.toISOString(),
      capacity: updatedClass.capacity,
      price: Number(updatedClass.classType.defaultPrice),
      status: updatedClass.status,
      notes: updatedClass.notes,
      updatedAt: updatedClass.updatedAt.toISOString(),
      classType: updatedClass.classType,
      instructor: updatedClass.instructor ? {
        id: updatedClass.instructor.id.toString(),
        name: `${updatedClass.instructor.user.firstName} ${updatedClass.instructor.user.lastName}`,
        email: updatedClass.instructor.user.email
      } : null,
      location: updatedClass.location,
      reservations: updatedClass.reservations.map(res => ({
        id: res.id.toString(),
        status: res.status,
        student: {
          name: `${res.user.firstName} ${res.user.lastName}`,
          email: res.user.email
        }
      })),
      availableSpots: updatedClass.capacity - updatedClass.reservations.filter(r =>
        r.status === 'CONFIRMED' || r.status === 'CHECKED_IN'
      ).length
    }

    return NextResponse.json(classResponse)

  } catch (error) {
    console.error('Class PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update class' },
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

    const classId = parseInt(params.id)
    if (isNaN(classId)) {
      return NextResponse.json({ error: 'Invalid class ID' }, { status: 400 })
    }

    // Check if class exists and has reservations
    const existingClass = await prisma.class.findUnique({
      where: { id: classId },
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

    if (!existingClass) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    if (existingClass.reservations.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete class with confirmed reservations' },
        { status: 400 }
      )
    }

    // Check if class is within 24 hours
    const classStart = new Date(existingClass.startsAt)
    const now = new Date()

    if (classStart.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
      return NextResponse.json(
        { error: 'Cannot delete class within 24 hours of start time' },
        { status: 400 }
      )
    }

    // Cancel all remaining reservations first
    await prisma.reservation.updateMany({
      where: {
        classId: classId,
        status: {
          in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN]
        }
      },
      data: {
        status: ReservationStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: 'Class cancelled by admin'
      }
    })

    // Delete the class
    await prisma.class.delete({
      where: { id: classId }
    })

    return NextResponse.json({ message: 'Class deleted successfully' })

  } catch (error) {
    console.error('Class DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete class' },
      { status: 500 }
    )
  }
}