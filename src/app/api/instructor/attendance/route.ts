import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== 'INSTRUCTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { reservationId, status, progressNotes } = body

    if (!reservationId || !status) {
      return NextResponse.json({ error: 'Reservation ID and status required' }, { status: 400 })
    }

    // Valid attendance statuses
    const validStatuses = ['CHECKED_IN', 'NO_SHOW', 'COMPLETED', 'CANCELLED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Get instructor record
    const instructor = await prisma.instructor.findUnique({
      where: {
        userId: BigInt(session.user.id),
      },
    })

    if (!instructor) {
      return NextResponse.json({ error: 'Instructor not found' }, { status: 404 })
    }

    // Get reservation with related data
    const reservation = await prisma.reservation.findUnique({
      where: {
        id: BigInt(reservationId),
      },
      include: {
        class: {
          include: {
            instructor: true,
          },
        },
        package: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    // Verify instructor owns this class
    if (reservation.class.instructorId !== instructor.id) {
      return NextResponse.json({ error: 'Unauthorized to modify this reservation' }, { status: 403 })
    }

    // Start transaction for attendance update and credit management
    const result = await prisma.$transaction(async (tx) => {
      const currentStatus = reservation.status
      const previouslyAttended = ['CHECKED_IN', 'COMPLETED'].includes(currentStatus)
      const newlyAttending = ['CHECKED_IN', 'COMPLETED'].includes(status)

      // Update reservation status and check-in time
      const updateData: any = {
        status: status as any,
        updatedAt: new Date(),
      }

      // Set check-in time if checking in
      if (status === 'CHECKED_IN') {
        updateData.checkedInAt = new Date()
      }

      // Add progress notes if provided
      if (progressNotes && progressNotes.trim()) {
        updateData.notes = progressNotes.trim()
      }

      const updatedReservation = await tx.reservation.update({
        where: {
          id: BigInt(reservationId),
        },
        data: updateData,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          package: true,
        },
      })

      // Handle credit management if student has a package
      if (reservation.package) {
        let creditAdjustment = 0

        // If student was not previously marked as attended but now is
        if (!previouslyAttended && newlyAttending) {
          creditAdjustment = 1 // Consume 1 credit
        }
        // If student was previously marked as attended but now is not
        else if (previouslyAttended && !newlyAttending) {
          creditAdjustment = -1 // Restore 1 credit
        }

        // Update package credits if there's a change
        if (creditAdjustment !== 0) {
          const newUsedCredits = Math.max(0,
            Math.min(reservation.package.totalCredits,
              reservation.package.usedCredits + creditAdjustment
            )
          )

          await tx.package.update({
            where: {
              id: reservation.package.id,
            },
            data: {
              usedCredits: newUsedCredits,
              updatedAt: new Date(),
            },
          })

          // Check if package is now used up
          if (newUsedCredits >= reservation.package.totalCredits) {
            await tx.package.update({
              where: {
                id: reservation.package.id,
              },
              data: {
                status: 'USED_UP',
              },
            })
          }
        }
      }

      return updatedReservation
    })

    return NextResponse.json({
      success: true,
      reservation: {
        id: result.id.toString(),
        status: result.status,
        checkedInAt: result.checkedInAt,
        notes: result.notes,
        student: `${result.user.firstName} ${result.user.lastName}`,
        updatedAt: result.updatedAt,
      },
      creditUpdate: reservation.package ? {
        packageId: reservation.package.id.toString(),
        previousCredits: reservation.package.usedCredits,
        currentCredits: reservation.package.usedCredits + (
          (['CHECKED_IN', 'COMPLETED'].includes(reservation.status) ? 0 : 0) -
          (['CHECKED_IN', 'COMPLETED'].includes(status) ? 1 : 0)
        ),
      } : null,
    })
  } catch (error) {
    console.error('Attendance update error:', error)
    return NextResponse.json(
      { error: 'Failed to update attendance' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== 'INSTRUCTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')

    if (!classId) {
      return NextResponse.json({ error: 'Class ID required' }, { status: 400 })
    }

    // Get instructor record
    const instructor = await prisma.instructor.findUnique({
      where: {
        userId: BigInt(session.user.id),
      },
    })

    if (!instructor) {
      return NextResponse.json({ error: 'Instructor not found' }, { status: 404 })
    }

    // Get class with attendance data
    const classData = await prisma.class.findUnique({
      where: {
        id: BigInt(classId),
        instructorId: instructor.id,
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
        reservations: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            package: {
              select: {
                id: true,
                name: true,
                totalCredits: true,
                usedCredits: true,
                classType: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            reservedAt: 'asc',
          },
        },
      },
    })

    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    // Transform attendance data
    const attendanceData = {
      class: {
        id: classData.id.toString(),
        title: classData.classType.name,
        startsAt: classData.startsAt,
        endsAt: classData.endsAt,
        location: classData.location.name,
        status: classData.status,
      },
      students: classData.reservations.map(reservation => ({
        reservationId: reservation.id.toString(),
        student: {
          id: reservation.user.id.toString(),
          name: `${reservation.user.firstName} ${reservation.user.lastName}`,
          email: reservation.user.email,
        },
        attendanceStatus: reservation.status,
        checkedInAt: reservation.checkedInAt,
        notes: reservation.notes,
        package: reservation.package ? {
          id: reservation.package.id.toString(),
          name: reservation.package.name,
          type: reservation.package.classType?.name || 'Unknown',
          creditsUsed: reservation.package.usedCredits,
          totalCredits: reservation.package.totalCredits,
          remainingCredits: reservation.package.totalCredits - reservation.package.usedCredits,
        } : null,
        canModifyAttendance: true, // Instructors can always modify
      })),
      summary: {
        totalStudents: classData.reservations.length,
        checkedIn: classData.reservations.filter(r => r.status === 'CHECKED_IN').length,
        completed: classData.reservations.filter(r => r.status === 'COMPLETED').length,
        noShows: classData.reservations.filter(r => r.status === 'NO_SHOW').length,
        notCheckedIn: classData.reservations.filter(r => r.status === 'CONFIRMED').length,
      },
    }

    return NextResponse.json(attendanceData)
  } catch (error) {
    console.error('Attendance fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch attendance data' },
      { status: 500 }
    )
  }
}