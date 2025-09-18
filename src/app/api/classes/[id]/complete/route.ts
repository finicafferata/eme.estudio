import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, ClassStatus, ReservationStatus } from '@prisma/client'

export async function PATCH(
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
    const { notes } = body

    // Check if class exists and is in progress
    const existingClass = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        reservations: {
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
        classType: {
          select: {
            name: true
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
        }
      }
    })

    if (!existingClass) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    // Validate class can be completed
    if (existingClass.status === ClassStatus.COMPLETED) {
      return NextResponse.json({ error: 'Class is already completed' }, { status: 400 })
    }

    if (existingClass.status === ClassStatus.CANCELLED) {
      return NextResponse.json({ error: 'Cannot complete a cancelled class' }, { status: 400 })
    }

    if (existingClass.status === ClassStatus.SCHEDULED) {
      return NextResponse.json({
        error: 'Class must be in progress before it can be completed. Mark students as checked in first.'
      }, { status: 400 })
    }

    // Check if class time has passed (optional validation)
    const now = new Date()
    const timeUntilEnd = existingClass.endsAt.getTime() - now.getTime()
    const hoursUntilEnd = timeUntilEnd / (1000 * 60 * 60)

    // Warn if completing more than 2 hours before scheduled end
    if (hoursUntilEnd > 2) {
      console.log(`Warning: Completing class ${hoursUntilEnd.toFixed(1)} hours before scheduled end time`)
    }

    // Validate there are students to complete
    const checkedInCount = existingClass.reservations.filter(
      r => r.status === ReservationStatus.CHECKED_IN
    ).length

    if (checkedInCount === 0) {
      return NextResponse.json({
        error: 'No students are checked in. Mark students as checked in before completing the class.'
      }, { status: 400 })
    }

    // Begin transaction to complete class and update reservations
    const result = await prisma.$transaction(async (tx) => {
      // Get all checked-in students
      const checkedInReservations = existingClass.reservations.filter(
        r => r.status === ReservationStatus.CHECKED_IN
      )

      // Mark all checked-in students as completed
      if (checkedInReservations.length > 0) {
        await tx.reservation.updateMany({
          where: {
            classId: classId,
            status: ReservationStatus.CHECKED_IN
          },
          data: {
            status: ReservationStatus.COMPLETED,
            updatedAt: new Date()
          }
        })
      }

      // Update class status and add notes
      const updateData: any = {
        status: ClassStatus.COMPLETED,
        updatedAt: new Date()
      }

      if (notes && notes.trim()) {
        // Append completion notes to existing notes
        const existingNotes = existingClass.notes || ''
        const completionNotes = `\n\n--- Class Completion Notes (${new Date().toISOString().split('T')[0]}) ---\n${notes.trim()}`
        updateData.notes = existingNotes + completionNotes
      }

      const updatedClass = await tx.class.update({
        where: { id: classId },
        data: updateData,
        include: {
          classType: true,
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

      return {
        updatedClass,
        completedStudents: checkedInReservations.length,
        totalStudents: existingClass.reservations.length
      }
    })

    // Prepare response with completion summary
    const completedStudents = existingClass.reservations.filter(
      r => r.status === ReservationStatus.CHECKED_IN
    ).map(r => ({
      id: r.user.id.toString(),
      name: `${r.user.firstName} ${r.user.lastName}`,
      email: r.user.email
    }))

    const noShowStudents = existingClass.reservations.filter(
      r => r.status === ReservationStatus.NO_SHOW
    ).map(r => ({
      id: r.user.id.toString(),
      name: `${r.user.firstName} ${r.user.lastName}`,
      email: r.user.email
    }))

    const notCheckedInStudents = existingClass.reservations.filter(
      r => r.status === ReservationStatus.CONFIRMED
    ).map(r => ({
      id: r.user.id.toString(),
      name: `${r.user.firstName} ${r.user.lastName}`,
      email: r.user.email
    }))

    return NextResponse.json({
      success: true,
      message: 'Class completed successfully',
      class: {
        id: result.updatedClass.id.toString(),
        status: result.updatedClass.status,
        classType: result.updatedClass.classType.name,
        instructor: result.updatedClass.instructor ?
          `${result.updatedClass.instructor.user.firstName} ${result.updatedClass.instructor.user.lastName}` :
          'No instructor',
        startsAt: result.updatedClass.startsAt.toISOString(),
        endsAt: result.updatedClass.endsAt.toISOString(),
        completedAt: result.updatedClass.updatedAt.toISOString()
      },
      summary: {
        totalStudents: result.totalStudents,
        completedStudents: result.completedStudents,
        studentsCompleted: completedStudents,
        noShowStudents: noShowStudents,
        notCheckedInStudents: notCheckedInStudents
      }
    })

  } catch (error) {
    console.error('Class completion error:', error)
    return NextResponse.json(
      { error: 'Failed to complete class' },
      { status: 500 }
    )
  }
}