import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, PaymentStatus, ReservationStatus } from '@prisma/client'

export async function GET() {
  try {
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current date info for filtering
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Get latest 5 payments
    const recentPayments = await prisma.payment.findMany({
      where: {
        status: PaymentStatus.COMPLETED,
        paidAt: {
          gte: sevenDaysAgo
        }
      },
      orderBy: {
        paidAt: 'desc'
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

    // Get recent package purchases (last 7 days)
    const recentPackages = await prisma.package.findMany({
      where: {
        purchasedAt: {
          gte: sevenDaysAgo
        }
      },
      orderBy: {
        purchasedAt: 'desc'
      },
      take: 5,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        classType: {
          select: {
            name: true
          }
        }
      }
    })

    // Get upcoming classes (next 3 days) with reservations
    const upcomingClasses = await prisma.class.findMany({
      where: {
        startsAt: {
          gte: today,
          lte: threeDaysFromNow
        }
      },
      orderBy: {
        startsAt: 'asc'
      },
      take: 10,
      include: {
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
            name: true
          }
        },
        classType: {
          select: {
            name: true
          }
        },
        reservations: {
          where: {
            status: {
              in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN]
            }
          },
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

    // Get new student registrations (last 7 days)
    const newStudents = await prisma.user.findMany({
      where: {
        role: UserRole.STUDENT,
        createdAt: {
          gte: sevenDaysAgo
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

    // Get today's classes with more details
    const todaysClasses = await prisma.class.findMany({
      where: {
        startsAt: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      },
      orderBy: {
        startsAt: 'asc'
      },
      include: {
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
            name: true
          }
        },
        classType: {
          select: {
            name: true
          }
        },
        reservations: {
          where: {
            status: {
              in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN]
            }
          },
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

    const activity = {
      recentPayments: recentPayments.map(payment => ({
        id: payment.id.toString(),
        studentName: `${payment.user.firstName} ${payment.user.lastName}`,
        amount: Number(payment.amount),
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        paidAt: payment.paidAt?.toISOString(),
        type: 'payment' as const
      })),
      recentPackages: recentPackages.map(pkg => ({
        id: pkg.id.toString(),
        studentName: `${pkg.user.firstName} ${pkg.user.lastName}`,
        packageName: pkg.name,
        classType: pkg.classType?.name || 'General',
        totalCredits: pkg.totalCredits,
        price: Number(pkg.price),
        purchasedAt: pkg.purchasedAt.toISOString(),
        type: 'package_purchase' as const
      })),
      upcomingClasses: upcomingClasses.map(cls => ({
        id: cls.id.toString(),
        className: cls.classType.name,
        instructorName: cls.instructor
          ? `${cls.instructor.user.firstName} ${cls.instructor.user.lastName}`
          : 'Sin instructor',
        locationName: cls.location.name,
        startsAt: cls.startsAt.toISOString(),
        studentCount: cls.reservations.length,
        capacity: cls.capacity,
        students: cls.reservations.map(res =>
          `${res.user.firstName} ${res.user.lastName}`
        ),
        type: 'upcoming_class' as const
      })),
      newStudents: newStudents.map(student => ({
        id: student.id.toString(),
        name: `${student.firstName} ${student.lastName}`,
        email: student.email,
        createdAt: student.createdAt.toISOString(),
        type: 'new_student' as const
      })),
      todaysClasses: todaysClasses.map(cls => ({
        id: cls.id.toString(),
        className: cls.classType.name,
        instructorName: cls.instructor
          ? `${cls.instructor.user.firstName} ${cls.instructor.user.lastName}`
          : 'Sin instructor',
        locationName: cls.location.name,
        startsAt: cls.startsAt.toISOString(),
        studentCount: cls.reservations.length,
        capacity: cls.capacity,
        students: cls.reservations.map(res =>
          `${res.user.firstName} ${res.user.lastName}`
        ),
        type: 'todays_class' as const
      }))
    }

    return NextResponse.json(activity)
  } catch (error) {
    console.error('Dashboard recent activity error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recent activity' },
      { status: 500 }
    )
  }
}