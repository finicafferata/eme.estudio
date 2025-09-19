import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id || session.user.role !== 'INSTRUCTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')

    // Get instructor record
    const instructor = await prisma.instructor.findUnique({
      where: {
        userId: BigInt(session.user.id),
      },
    })

    if (!instructor) {
      return NextResponse.json({ error: 'Instructor not found' }, { status: 404 })
    }

    // For now, we'll use the reservation notes field as instructor notes
    // In a full implementation, you'd want a separate instructor_notes table

    if (studentId) {
      // Get notes for a specific student
      const notes = await prisma.reservation.findMany({
        where: {
          userId: BigInt(studentId),
          class: {
            instructorId: instructor.id,
          },
          notes: {
            not: null,
          },
        },
        include: {
          class: {
            select: {
              startsAt: true,
              classType: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          reservedAt: 'desc',
        },
      })

      return NextResponse.json({
        studentId,
        notes: notes.map(note => ({
          id: note.id.toString(),
          content: note.notes,
          classDate: note.class.startsAt,
          classType: note.class.classType.name,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
        })),
      })
    } else {
      // Get all students with notes for this instructor
      const studentsWithNotes = await prisma.reservation.findMany({
        where: {
          class: {
            instructorId: instructor.id,
          },
          notes: {
            not: null,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          class: {
            select: {
              startsAt: true,
              classType: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      })

      return NextResponse.json({
        studentsWithNotes: studentsWithNotes.map(note => ({
          id: note.id.toString(),
          student: {
            id: note.user.id.toString(),
            name: `${note.user.firstName} ${note.user.lastName}`,
            email: note.user.email,
          },
          content: note.notes,
          classDate: note.class.startsAt,
          classType: note.class.classType.name,
          lastUpdated: note.updatedAt,
        })),
      })
    }
  } catch (error) {
    console.error('Notes fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch instructor notes' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id || session.user.role !== 'INSTRUCTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { reservationId, notes } = body

    if (!reservationId || typeof notes !== 'string') {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
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

    // Verify the reservation belongs to this instructor's class
    const reservation = await prisma.reservation.findUnique({
      where: {
        id: BigInt(reservationId),
      },
      include: {
        class: {
          select: {
            instructorId: true,
          },
        },
      },
    })

    if (!reservation || reservation.class.instructorId !== instructor.id) {
      return NextResponse.json({ error: 'Reservation not found or unauthorized' }, { status: 404 })
    }

    // Update the reservation with instructor notes
    const updatedReservation = await prisma.reservation.update({
      where: {
        id: BigInt(reservationId),
      },
      data: {
        notes: notes.trim() || null,
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        class: {
          select: {
            startsAt: true,
            classType: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      note: {
        id: updatedReservation.id.toString(),
        content: updatedReservation.notes,
        student: `${updatedReservation.user.firstName} ${updatedReservation.user.lastName}`,
        classDate: updatedReservation.class.startsAt,
        classType: updatedReservation.class.classType.name,
        updatedAt: updatedReservation.updatedAt,
      },
    })
  } catch (error) {
    console.error('Notes update error:', error)
    return NextResponse.json(
      { error: 'Failed to update instructor notes' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id || session.user.role !== 'INSTRUCTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const reservationId = searchParams.get('reservationId')

    if (!reservationId) {
      return NextResponse.json({ error: 'Reservation ID required' }, { status: 400 })
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

    // Verify the reservation belongs to this instructor's class
    const reservation = await prisma.reservation.findUnique({
      where: {
        id: BigInt(reservationId),
      },
      include: {
        class: {
          select: {
            instructorId: true,
          },
        },
      },
    })

    if (!reservation || reservation.class.instructorId !== instructor.id) {
      return NextResponse.json({ error: 'Reservation not found or unauthorized' }, { status: 404 })
    }

    // Clear the notes
    await prisma.reservation.update({
      where: {
        id: BigInt(reservationId),
      },
      data: {
        notes: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notes delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete instructor notes' },
      { status: 500 }
    )
  }
}