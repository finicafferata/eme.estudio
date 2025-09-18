import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, FrameSize } from '@prisma/client'

// Get waitlist entries
export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')
    const userId = searchParams.get('userId')

    const where: any = {}
    if (classId) where.classId = BigInt(classId)
    if (userId) where.userId = BigInt(userId)

    const waitlistEntries = await prisma.waitlist.findMany({
      where,
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
          select: {
            id: true,
            startsAt: true,
            endsAt: true,
            capacity: true,
            status: true,
            classType: {
              select: {
                name: true,
                description: true
              }
            },
            location: {
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
        }
      },
      orderBy: [
        { classId: 'asc' },
        { priority: 'asc' }
      ]
    })

    const formattedEntries = waitlistEntries.map(entry => ({
      id: entry.id.toString(),
      priority: entry.priority,
      frameSize: entry.frameSize,
      createdAt: entry.createdAt.toISOString(),
      student: {
        id: entry.user.id.toString(),
        name: `${entry.user.firstName} ${entry.user.lastName}`,
        email: entry.user.email
      },
      class: {
        id: entry.class.id.toString(),
        name: entry.class.classType.name,
        description: entry.class.classType.description,
        startsAt: entry.class.startsAt.toISOString(),
        endsAt: entry.class.endsAt.toISOString(),
        capacity: entry.class.capacity,
        status: entry.class.status,
        location: entry.class.location.name,
        instructor: entry.class.instructor ?
          `${entry.class.instructor.user.firstName} ${entry.class.instructor.user.lastName}` :
          'No instructor assigned'
      }
    }))

    return NextResponse.json({
      waitlistEntries: formattedEntries,
      total: waitlistEntries.length
    })

  } catch (error) {
    console.error('Waitlist GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch waitlist' },
      { status: 500 }
    )
  }
}

// Add to waitlist (manual admin action)
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { classId, userId, frameSize = FrameSize.MEDIUM, priority } = body

    if (!classId || !userId) {
      return NextResponse.json(
        { error: 'Class ID and User ID are required' },
        { status: 400 }
      )
    }

    // Check if user already has a waitlist entry or reservation
    const existingWaitlist = await prisma.waitlist.findUnique({
      where: {
        userId_classId: {
          userId: BigInt(userId),
          classId: BigInt(classId)
        }
      }
    })

    if (existingWaitlist) {
      return NextResponse.json(
        { error: 'User is already on the waitlist for this class' },
        { status: 409 }
      )
    }

    const existingReservation = await prisma.reservation.findUnique({
      where: {
        userId_classId: {
          userId: BigInt(userId),
          classId: BigInt(classId)
        }
      }
    })

    if (existingReservation) {
      return NextResponse.json(
        { error: 'User already has a reservation for this class' },
        { status: 409 }
      )
    }

    // Get current waitlist count for auto-priority
    const waitlistCount = await prisma.waitlist.count({
      where: { classId: BigInt(classId) }
    })

    const waitlistEntry = await prisma.waitlist.create({
      data: {
        userId: BigInt(userId),
        classId: BigInt(classId),
        frameSize: frameSize as FrameSize,
        priority: priority || (waitlistCount + 1)
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        class: {
          select: {
            startsAt: true,
            classType: {
              select: { name: true }
            }
          }
        }
      }
    })

    return NextResponse.json({
      message: 'Added to waitlist successfully',
      waitlistEntry: {
        id: waitlistEntry.id.toString(),
        priority: waitlistEntry.priority,
        student: `${waitlistEntry.user.firstName} ${waitlistEntry.user.lastName}`,
        className: waitlistEntry.class.classType.name,
        classTime: waitlistEntry.class.startsAt.toISOString()
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Waitlist POST error:', error)
    return NextResponse.json(
      { error: 'Failed to add to waitlist' },
      { status: 500 }
    )
  }
}