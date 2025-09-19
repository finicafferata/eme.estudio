import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id || session.user.role !== 'INSTRUCTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      reservationId,
      progressNotes,
      skillLevel,
      techniquesLearned,
      areasToImprove,
      classRating,
      privateNotes,
    } = body

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

    // Verify reservation belongs to instructor's class
    const reservation = await prisma.reservation.findUnique({
      where: {
        id: BigInt(reservationId),
      },
      include: {
        class: {
          select: {
            instructorId: true,
            startsAt: true,
            classType: {
              select: {
                name: true,
              },
            },
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    if (!reservation || reservation.class.instructorId !== instructor.id) {
      return NextResponse.json({ error: 'Reservation not found or unauthorized' }, { status: 404 })
    }

    // Build comprehensive notes object
    const progressData = {
      skillLevel: skillLevel || null,
      techniquesLearned: Array.isArray(techniquesLearned) ? techniquesLearned : [],
      areasToImprove: Array.isArray(areasToImprove) ? areasToImprove : [],
      classRating: classRating ? parseInt(classRating) : null,
      progressNotes: progressNotes || '',
      privateNotes: privateNotes || '',
      updatedAt: new Date().toISOString(),
      instructorId: instructor.id.toString(),
    }

    // Update reservation with progress data
    const updatedReservation = await prisma.reservation.update({
      where: {
        id: BigInt(reservationId),
      },
      data: {
        notes: JSON.stringify(progressData),
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
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
    })

    return NextResponse.json({
      success: true,
      progressNote: {
        id: updatedReservation.id.toString(),
        student: `${updatedReservation.user.firstName} ${updatedReservation.user.lastName}`,
        classDate: updatedReservation.class.startsAt,
        classType: updatedReservation.class.classType.name,
        progressData,
        updatedAt: updatedReservation.updatedAt,
      },
    })
  } catch (error) {
    console.error('Progress notes error:', error)
    return NextResponse.json(
      { error: 'Failed to save progress notes' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id || session.user.role !== 'INSTRUCTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const classId = searchParams.get('classId')

    // Get instructor record
    const instructor = await prisma.instructor.findUnique({
      where: {
        userId: BigInt(session.user.id),
      },
    })

    if (!instructor) {
      return NextResponse.json({ error: 'Instructor not found' }, { status: 404 })
    }

    let whereClause: any = {
      class: {
        instructorId: instructor.id,
      },
      notes: {
        not: null,
      },
    }

    if (studentId) {
      whereClause.userId = BigInt(studentId)
    }

    if (classId) {
      whereClause.classId = BigInt(classId)
    }

    // Get progress notes
    const progressNotes = await prisma.reservation.findMany({
      where: whereClause,
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

    // Transform and parse notes
    const formattedNotes = progressNotes.map(note => {
      let progressData = {}
      try {
        progressData = JSON.parse(note.notes || '{}')
      } catch {
        // If notes aren't JSON, treat as simple text
        progressData = {
          progressNotes: note.notes || '',
          updatedAt: note.updatedAt.toISOString(),
        }
      }

      return {
        id: note.id.toString(),
        student: {
          id: note.user.id.toString(),
          name: `${note.user.firstName} ${note.user.lastName}`,
          email: note.user.email,
        },
        class: {
          date: note.class.startsAt,
          type: note.class.classType.name,
        },
        progressData,
        updatedAt: note.updatedAt,
      }
    })

    // If requesting specific student, calculate progress summary
    if (studentId) {
      const studentProgress = formattedNotes.filter(note =>
        note.student.id === studentId
      )

      // Calculate student's skill progression
      const skillLevels = studentProgress
        .map((note: any) => note.progressData.skillLevel)
        .filter(level => level)

      const techniques = studentProgress
        .flatMap((note: any) => note.progressData.techniquesLearned || [])
        .filter((technique: any, index: number, arr: any[]) => arr.indexOf(technique) === index)

      const commonImprovementAreas = studentProgress
        .flatMap((note: any) => note.progressData.areasToImprove || [])
        .reduce((acc: any, area: string) => {
          acc[area] = (acc[area] || 0) + 1
          return acc
        }, {})

      const averageRating = studentProgress
        .map((note: any) => note.progressData.classRating)
        .filter((rating: any) => rating !== null && rating !== undefined)
        .reduce((sum: number, rating: number, _: number, arr: number[]) => {
          if (arr.length === 0) return 0
          return arr.length === 1 ? rating : sum + rating / arr.length
        }, 0)

      return NextResponse.json({
        notes: formattedNotes,
        studentSummary: {
          totalClasses: studentProgress.length,
          skillProgression: skillLevels,
          currentSkillLevel: skillLevels[skillLevels.length - 1] || 'Not assessed',
          techniquesLearned: techniques,
          commonImprovementAreas: Object.entries(commonImprovementAreas)
            .sort(([,a], [,b]) => (b as number) - (a as number))
            .slice(0, 5)
            .map(([area, count]) => ({ area, mentions: count })),
          averageRating: Math.round(averageRating * 10) / 10,
        },
      })
    }

    return NextResponse.json({
      notes: formattedNotes,
    })
  } catch (error) {
    console.error('Progress notes fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch progress notes' },
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

    // Verify reservation belongs to instructor's class
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

    // Clear progress notes
    await prisma.reservation.update({
      where: {
        id: BigInt(reservationId),
      },
      data: {
        notes: null,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Progress notes delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete progress notes' },
      { status: 500 }
    )
  }
}