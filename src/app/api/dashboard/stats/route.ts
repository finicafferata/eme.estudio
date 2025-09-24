import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, PackageStatus, PaymentStatus } from '@prisma/client'

export async function GET() {
  try {
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current date info for filtering
    const now = new Date()
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
    const endOfWeek = new Date(now.setDate(startOfWeek.getDate() + 6))
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // Reset time for accurate comparisons
    startOfWeek.setHours(0, 0, 0, 0)
    endOfWeek.setHours(23, 59, 59, 999)
    startOfMonth.setHours(0, 0, 0, 0)
    endOfMonth.setHours(23, 59, 59, 999)

    // Get total active students
    const totalStudents = await prisma.user.count({
      where: {
        role: UserRole.STUDENT,
        status: 'ACTIVE'
      }
    })

    // Get active packages
    const activePackages = await prisma.package.count({
      where: {
        status: PackageStatus.ACTIVE
      }
    })

    // Get this week's classes
    const thisWeekClasses = await prisma.class.count({
      where: {
        startsAt: {
          gte: startOfWeek,
          lte: endOfWeek
        }
      }
    })

    // Get monthly revenue (completed payments)
    const monthlyPayments = await prisma.payment.findMany({
      where: {
        status: PaymentStatus.COMPLETED,
        paidAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      select: {
        amount: true,
        currency: true
      }
    })

    // Get last month's revenue for comparison
    const lastMonthPayments = await prisma.payment.findMany({
      where: {
        status: PaymentStatus.COMPLETED,
        paidAt: {
          gte: startOfLastMonth,
          lte: endOfLastMonth
        }
      },
      select: {
        amount: true,
        currency: true
      }
    })

    // Calculate revenues
    const usdRate = 1200 // 1 USD = 1200 ARS (approximate)

    let monthlyRevenueUSD = 0
    let monthlyRevenuePesos = 0
    let totalMonthlyPesos = 0

    monthlyPayments.forEach(payment => {
      if (payment.currency === 'USD') {
        monthlyRevenueUSD += Number(payment.amount)
        totalMonthlyPesos += Number(payment.amount) * usdRate
      } else {
        monthlyRevenuePesos += Number(payment.amount)
        totalMonthlyPesos += Number(payment.amount)
      }
    })

    let lastMonthRevenuePesos = 0
    lastMonthPayments.forEach(payment => {
      if (payment.currency === 'USD') {
        lastMonthRevenuePesos += Number(payment.amount) * usdRate
      } else {
        lastMonthRevenuePesos += Number(payment.amount)
      }
    })

    // Calculate revenue trend
    const revenueTrend = lastMonthRevenuePesos > 0
      ? ((totalMonthlyPesos - lastMonthRevenuePesos) / lastMonthRevenuePesos) * 100
      : 0

    // Get package distribution
    const packageDistribution = await prisma.package.groupBy({
      by: ['classTypeId'],
      _count: {
        id: true
      },
      where: {
        status: {
          in: [PackageStatus.ACTIVE, PackageStatus.USED_UP]
        }
      }
    })

    // Get class type names for package distribution
    const classTypes = await prisma.classType.findMany({
      select: {
        id: true,
        name: true
      }
    })

    const packageDistributionWithNames = packageDistribution.map(pkg => {
      const classType = classTypes.find(ct => ct.id === pkg.classTypeId)
      return {
        name: classType?.name || 'General',
        count: pkg._count.id
      }
    })

    // Get payment methods breakdown
    const paymentMethodsBreakdown = await prisma.payment.groupBy({
      by: ['paymentMethod'],
      _count: {
        id: true
      },
      _sum: {
        amount: true
      },
      where: {
        status: PaymentStatus.COMPLETED,
        paidAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    })

    // Get package utilization stats
    const packageUtilization = await prisma.package.aggregate({
      _avg: {
        usedCredits: true,
        totalCredits: true
      },
      where: {
        status: {
          in: [PackageStatus.ACTIVE, PackageStatus.USED_UP]
        }
      }
    })

    const avgUtilization = packageUtilization._avg.totalCredits && packageUtilization._avg.usedCredits
      ? (packageUtilization._avg.usedCredits / packageUtilization._avg.totalCredits) * 100
      : 0

    // Get popular class times
    const popularClassTimes = await prisma.class.groupBy({
      by: ['startsAt'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 5
    })

    const formattedClassTimes = popularClassTimes.map(ct => ({
      time: new Date(ct.startsAt).toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      count: ct._count.id
    }))

    // Get today's and tomorrow's classes with attendance
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dayAfterTomorrow = new Date(tomorrow)
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1)

    const todaysClasses = await prisma.class.findMany({
      where: {
        startsAt: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
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
        },
        reservations: {
          where: {
            status: 'CONFIRMED'
          },
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
      },
      orderBy: {
        startsAt: 'asc'
      }
    })

    const tomorrowsClasses = await prisma.class.findMany({
      where: {
        startsAt: {
          gte: tomorrow,
          lt: dayAfterTomorrow
        }
      },
      include: {
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
        },
        reservations: {
          where: {
            status: 'CONFIRMED'
          },
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
      },
      orderBy: {
        startsAt: 'asc'
      }
    })

    const formatClassesWithAttendance = (classes: any[]) => {
      return classes.map(classItem => ({
        id: classItem.id.toString(),
        title: classItem.classType.name,
        time: new Date(classItem.startsAt).toLocaleTimeString('es-AR', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        instructor: `${classItem.instructor?.user.firstName} ${classItem.instructor?.user.lastName}`,
        capacity: classItem.capacity,
        attendees: classItem.reservations.map((reservation: any) => ({
          id: reservation.id.toString(),
          name: `${reservation.user.firstName} ${reservation.user.lastName}`,
          email: reservation.user.email
        })),
        attendeeCount: classItem.reservations.length,
        spotsAvailable: classItem.capacity - classItem.reservations.length
      }))
    }

    const stats = {
      overview: {
        totalStudents,
        activePackages,
        thisWeekClasses,
        monthlyRevenue: {
          usd: monthlyRevenueUSD,
          pesos: monthlyRevenuePesos,
          totalPesos: totalMonthlyPesos
        },
        revenueTrend: Math.round(revenueTrend * 100) / 100
      },
      charts: {
        packageDistribution: packageDistributionWithNames,
        paymentMethods: paymentMethodsBreakdown.map(pm => ({
          method: pm.paymentMethod,
          count: pm._count.id,
          amount: Number(pm._sum.amount || 0)
        })),
        popularClassTimes: formattedClassTimes
      },
      metrics: {
        avgPackageUtilization: Math.round(avgUtilization * 100) / 100
      },
      attendance: {
        today: formatClassesWithAttendance(todaysClasses),
        tomorrow: formatClassesWithAttendance(tomorrowsClasses)
      }
    }

    // Convert BigInt values to strings for JSON serialization
    const serializedStats = JSON.parse(JSON.stringify(stats, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ))

    return NextResponse.json(serializedStats)
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}