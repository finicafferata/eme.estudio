import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

export async function GET() {
  try {
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current date info for filtering
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)

    // Get latest student registrations (last 7 days)
    const recentStudents = await prisma.user.findMany({
      where: {
        role: UserRole.STUDENT,
        createdAt: {
          gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true
      }
    })

    // Get recent payments (last 7 days)
    const recentPayments = await prisma.payment.findMany({
      where: {
        createdAt: {
          gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })

    // Get upcoming classes (today and tomorrow) through reservations
    const upcomingReservations = await prisma.reservation.findMany({
      where: {
        class: {
          startsAt: {
            gte: today,
            lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)
          }
        },
        status: {
          in: ['CONFIRMED', 'CHECKED_IN']
        }
      },
      orderBy: {
        class: {
          startsAt: 'asc'
        }
      },
      take: 10,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        class: {
          select: {
            id: true,
            startsAt: true,
            status: true,
            instructor: {
              select: {
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
      }
    })

    const activity = {
      recentStudents: recentStudents.map(student => ({
        id: student.id.toString(),
        name: `${student.firstName} ${student.lastName}`,
        email: student.email,
        createdAt: student.createdAt.toISOString(),
        type: 'student_registration' as const
      })),
      recentPayments: recentPayments.map(payment => ({
        id: payment.id.toString(),
        studentName: `${payment.user.firstName} ${payment.user.lastName}`,
        amount: Number(payment.amount),
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        createdAt: payment.createdAt.toISOString(),
        type: 'payment' as const
      })),
      upcomingClasses: upcomingReservations.map(reservation => ({
        id: reservation.id.toString(),
        studentName: `${reservation.user.firstName} ${reservation.user.lastName}`,
        instructorName: reservation.class.instructor ?
          `${reservation.class.instructor.user.firstName} ${reservation.class.instructor.user.lastName}` :
          'Sin instructor',
        scheduledAt: reservation.class.startsAt.toISOString(),
        status: reservation.class.status,
        type: 'upcoming_class' as const
      }))
    }

    return NextResponse.json(activity)
  } catch (error) {
    console.error('Dashboard activity error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard activity' },
      { status: 500 }
    )
  }
}