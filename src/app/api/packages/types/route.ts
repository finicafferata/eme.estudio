import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, PackageStatus, PaymentStatus } from '@prisma/client'

// EME Studio Package Type Definitions
const PACKAGE_TYPES = {
  INTENSIVO: {
    name: 'Intensivo',
    displayName: 'Intensivo',
    credits: 3,
    price: 145000,
    currency: 'ARS',
    expiryMonths: 3,
    allowPartialPayment: true,
    description: 'Paquete intensivo de 3 clases con flexibilidad de pago',
    features: [
      '3 clases incluidas',
      'Válido por 3 meses',
      'Pagos parciales permitidos',
      'Ideal para principiantes'
    ],
    color: '#f97316' // Orange
  },
  RECURRENTE: {
    name: 'Recurrente',
    displayName: 'Recurrente',
    credits: 4,
    price: 170000,
    currency: 'ARS',
    expiryMonths: 3,
    allowPartialPayment: false,
    description: 'Paquete recurrente de 4 clases con pago completo',
    features: [
      '4 clases incluidas',
      'Válido por 3 meses',
      'Pago completo requerido',
      'Mejor valor por clase'
    ],
    color: '#3b82f6' // Blue
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeStats = searchParams.get('includeStats') === 'true'

    // Return basic package types
    const packageTypes = Object.entries(PACKAGE_TYPES).map(([key, type]) => ({
      id: key,
      ...type,
      pricePerClass: Math.round(type.price / type.credits),
      expiryDays: type.expiryMonths * 30,
      savings: key === 'RECURRENTE' ? Math.round(
        (PACKAGE_TYPES.INTENSIVO.price / PACKAGE_TYPES.INTENSIVO.credits * type.credits) - type.price
      ) : 0
    }))

    if (!includeStats) {
      return NextResponse.json({ packageTypes })
    }

    // Calculate statistics for each package type
    const currentDate = new Date()
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    const startOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    const endOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0)

    const statsPromises = Object.keys(PACKAGE_TYPES).map(async (packageType) => {
      const typeConfig = PACKAGE_TYPES[packageType as keyof typeof PACKAGE_TYPES]

      // Get all packages of this type
      const allPackages = await prisma.package.findMany({
        where: {
          name: typeConfig.name
        },
        include: {
          payments: {
            where: {
              status: PaymentStatus.COMPLETED
            }
          },
          reservations: true
        }
      })

      // Active packages
      const activePackages = allPackages.filter(pkg =>
        pkg.status === PackageStatus.ACTIVE &&
        (!pkg.expiresAt || new Date(pkg.expiresAt) > currentDate) &&
        (pkg.totalCredits - pkg.usedCredits) > 0
      )

      // Expired packages
      const expiredPackages = allPackages.filter(pkg =>
        pkg.expiresAt && new Date(pkg.expiresAt) <= currentDate
      )

      // Used up packages
      const usedUpPackages = allPackages.filter(pkg =>
        (pkg.totalCredits - pkg.usedCredits) <= 0
      )

      // Expiring soon (within 30 days)
      const expiringSoonDate = new Date()
      expiringSoonDate.setDate(expiringSoonDate.getDate() + 30)
      const expiringSoonPackages = activePackages.filter(pkg =>
        pkg.expiresAt && new Date(pkg.expiresAt) <= expiringSoonDate
      )

      // This month's packages
      const thisMonthPackages = allPackages.filter(pkg =>
        pkg.purchasedAt >= startOfMonth && pkg.purchasedAt <= endOfMonth
      )

      // Last month's packages
      const lastMonthPackages = allPackages.filter(pkg =>
        pkg.purchasedAt >= startOfLastMonth && pkg.purchasedAt <= endOfLastMonth
      )

      // Revenue calculations
      const totalRevenue = allPackages.reduce((sum, pkg) => {
        const packageRevenue = pkg.payments.reduce((pSum, payment) =>
          pSum + Number(payment.amount), 0
        )
        return sum + packageRevenue
      }, 0)

      const thisMonthRevenue = thisMonthPackages.reduce((sum, pkg) => {
        const packageRevenue = pkg.payments.reduce((pSum, payment) =>
          pSum + Number(payment.amount), 0
        )
        return sum + packageRevenue
      }, 0)

      const lastMonthRevenue = lastMonthPackages.reduce((sum, pkg) => {
        const packageRevenue = pkg.payments.reduce((pSum, payment) =>
          pSum + Number(payment.amount), 0
        )
        return sum + packageRevenue
      }, 0)

      // Utilization calculations
      const totalCreditsDistributed = allPackages.reduce((sum, pkg) => sum + pkg.totalCredits, 0)
      const totalCreditsUsed = allPackages.reduce((sum, pkg) => sum + pkg.usedCredits, 0)
      const averageUtilization = totalCreditsDistributed > 0 ?
        (totalCreditsUsed / totalCreditsDistributed) * 100 : 0

      // Average package value
      const averagePackageValue = allPackages.length > 0 ?
        totalRevenue / allPackages.length : 0

      // Growth calculation
      const growthPercentage = lastMonthRevenue > 0 ?
        ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0

      return {
        packageType,
        config: typeConfig,
        counts: {
          total: allPackages.length,
          active: activePackages.length,
          expired: expiredPackages.length,
          usedUp: usedUpPackages.length,
          expiringSoon: expiringSoonPackages.length,
          thisMonth: thisMonthPackages.length,
          lastMonth: lastMonthPackages.length
        },
        revenue: {
          total: totalRevenue,
          thisMonth: thisMonthRevenue,
          lastMonth: lastMonthRevenue,
          average: averagePackageValue,
          growth: growthPercentage
        },
        utilization: {
          totalCreditsDistributed,
          totalCreditsUsed,
          averagePercentage: Math.round(averageUtilization),
          remainingCredits: totalCreditsDistributed - totalCreditsUsed
        }
      }
    })

    const packageTypeStats = await Promise.all(statsPromises)

    // Calculate overall statistics
    const totalActivePackages = packageTypeStats.reduce((sum, stat) => sum + stat.counts.active, 0)
    const totalRevenue = packageTypeStats.reduce((sum, stat) => sum + stat.revenue.total, 0)
    const totalThisMonthRevenue = packageTypeStats.reduce((sum, stat) => sum + stat.revenue.thisMonth, 0)
    const totalLastMonthRevenue = packageTypeStats.reduce((sum, stat) => sum + stat.revenue.lastMonth, 0)

    const overallGrowth = totalLastMonthRevenue > 0 ?
      ((totalThisMonthRevenue - totalLastMonthRevenue) / totalLastMonthRevenue) * 100 : 0

    const summary = {
      totalActivePackages,
      totalRevenue,
      monthlyRevenue: totalThisMonthRevenue,
      monthlyGrowth: overallGrowth,
      packageDistribution: packageTypeStats.map(stat => ({
        type: stat.packageType,
        count: stat.counts.active,
        percentage: totalActivePackages > 0 ?
          Math.round((stat.counts.active / totalActivePackages) * 100) : 0
      })),
      revenueDistribution: packageTypeStats.map(stat => ({
        type: stat.packageType,
        revenue: stat.revenue.total,
        percentage: totalRevenue > 0 ?
          Math.round((stat.revenue.total / totalRevenue) * 100) : 0
      }))
    }

    return NextResponse.json({
      packageTypes,
      statistics: packageTypeStats,
      summary
    })
  } catch (error) {
    console.error('Package types GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch package types' },
      { status: 500 }
    )
  }
}