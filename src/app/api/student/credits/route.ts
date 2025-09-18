import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, PackageStatus, ReservationStatus } from '@prisma/client'
import { addDays, isBefore, isAfter, differenceInDays } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.STUDENT) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = BigInt(session.user.id)
    const now = new Date()

    // Get all user packages with detailed information
    const packages = await prisma.package.findMany({
      where: {
        userId: userId
      },
      include: {
        classType: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        payments: {
          select: {
            id: true,
            amount: true,
            paidAt: true,
            status: true,
            paymentMethod: true,
            createdAt: true,
            notes: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        reservations: {
          where: {
            status: {
              in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN, ReservationStatus.COMPLETED]
            }
          },
          include: {
            class: {
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
                }
              }
            }
          },
          orderBy: {
            reservedAt: 'desc'
          }
        }
      },
      orderBy: [
        { status: 'asc' }, // Active packages first
        { createdAt: 'desc' }
      ]
    })

    // Process packages with expiration warnings and usage analysis
    const processedPackages = packages.map(pkg => {
      const remainingCredits = pkg.totalCredits - pkg.usedCredits
      const usagePercentage = pkg.totalCredits > 0 ? (pkg.usedCredits / pkg.totalCredits) * 100 : 0

      // Calculate expiration status
      let expirationStatus: 'active' | 'expiring_soon' | 'expired' | 'no_expiry' = 'active'
      let daysUntilExpiry: number | null = null

      if (pkg.expiresAt) {
        daysUntilExpiry = differenceInDays(pkg.expiresAt, now)

        if (isBefore(pkg.expiresAt, now)) {
          expirationStatus = 'expired'
        } else if (daysUntilExpiry <= 7) {
          expirationStatus = 'expiring_soon'
        } else {
          expirationStatus = 'active'
        }
      } else {
        expirationStatus = 'no_expiry'
      }

      // Calculate usage efficiency
      const daysSincePurchase = differenceInDays(now, pkg.purchasedAt)
      const creditsPerDay = daysSincePurchase > 0 ? pkg.usedCredits / daysSincePurchase : 0

      return {
        id: pkg.id.toString(),
        name: pkg.name,
        status: pkg.status,
        totalCredits: pkg.totalCredits,
        usedCredits: pkg.usedCredits,
        remainingCredits: remainingCredits,
        usagePercentage: Math.round(usagePercentage * 10) / 10,
        purchasedAt: pkg.purchasedAt.toISOString(),
        expiresAt: pkg.expiresAt?.toISOString(),
        expirationStatus: expirationStatus,
        daysUntilExpiry: daysUntilExpiry,
        creditsPerDay: Math.round(creditsPerDay * 100) / 100,

        classType: pkg.classType ? {
          id: pkg.classType.id.toString(),
          name: pkg.classType.name,
          slug: pkg.classType.slug
        } : null,

        // Payment information
        totalPaid: pkg.payments.reduce((sum, p) => sum + Number(p.amount), 0),
        paymentStatus: pkg.payments.length > 0 ?
          pkg.payments.every(p => p.status === 'COMPLETED') ? 'FULLY_PAID' :
          pkg.payments.some(p => p.status === 'COMPLETED') ? 'PARTIALLY_PAID' :
          pkg.payments.some(p => p.status === 'PENDING') ? 'PENDING' : 'FAILED'
          : 'NO_PAYMENTS',
        paymentCount: pkg.payments.length,
        lastPayment: pkg.payments[0] ? {
          amount: Number(pkg.payments[0].amount),
          paidAt: pkg.payments[0].paidAt?.toISOString(),
          status: pkg.payments[0].status,
          method: pkg.payments[0].paymentMethod,
          createdAt: pkg.payments[0].createdAt.toISOString()
        } : null,
        allPayments: pkg.payments.map(payment => ({
          id: payment.id.toString(),
          amount: Number(payment.amount),
          status: payment.status,
          method: payment.paymentMethod,
          paidAt: payment.paidAt?.toISOString(),
          createdAt: payment.createdAt.toISOString(),
          notes: payment.notes
        })),

        // Usage history (last 10 reservations)
        recentUsage: pkg.reservations.slice(0, 10).map(res => ({
          id: res.id.toString(),
          reservedAt: res.reservedAt.toISOString(),
          status: res.status,
          className: res.class.classType.name,
          classDate: res.class.startsAt.toISOString(),
          instructor: res.class.instructor ?
            `${res.class.instructor.user.firstName} ${res.class.instructor.user.lastName}` :
            null
        }))
      }
    })

    // Calculate overall statistics
    const activePackages = processedPackages.filter(p => p.status === PackageStatus.ACTIVE)
    const expiredPackages = processedPackages.filter(p => p.status === PackageStatus.EXPIRED)
    const usedUpPackages = processedPackages.filter(p => p.status === PackageStatus.USED_UP)

    const totalActiveCredits = activePackages.reduce((sum, p) => sum + p.remainingCredits, 0)
    const totalCreditsEverPurchased = processedPackages.reduce((sum, p) => sum + p.totalCredits, 0)
    const totalCreditsUsed = processedPackages.reduce((sum, p) => sum + p.usedCredits, 0)
    const totalAmountSpent = processedPackages.reduce((sum, p) => sum + p.totalPaid, 0)

    // Investment tracking
    const totalPackageValue = processedPackages.reduce((sum, p) => sum + p.totalPaid, 0)
    const usedValue = processedPackages.reduce((sum, p) => sum + (p.totalPaid * (p.usedCredits / p.totalCredits)), 0)
    const remainingValue = totalPackageValue - usedValue
    const valueUtilizationRate = totalPackageValue > 0 ? (usedValue / totalPackageValue) * 100 : 0

    // Package status breakdown
    const fullyPaidPackages = processedPackages.filter(p => p.paymentStatus === 'FULLY_PAID').length
    const pendingPaymentPackages = processedPackages.filter(p => p.paymentStatus === 'PENDING' || p.paymentStatus === 'PARTIALLY_PAID').length

    // Get expiring packages (within 7 days)
    const expiringPackages = activePackages.filter(p => p.expirationStatus === 'expiring_soon')
    const expiredUnusedPackages = processedPackages.filter(p => p.expirationStatus === 'expired' && p.remainingCredits > 0)

    // Recommendations based on usage patterns
    const recommendations: string[] = []

    if (totalActiveCredits === 0 && activePackages.length === 0) {
      recommendations.push('Consider purchasing a new package to book classes')
    } else if (totalActiveCredits <= 2) {
      recommendations.push('You\'re running low on credits. Consider purchasing additional credits soon')
    }

    if (expiringPackages.length > 0) {
      recommendations.push(`${expiringPackages.length} package(s) expiring soon. Use your credits before they expire!`)
    }

    // Calculate average cost per class
    const averageCostPerCredit = totalCreditsUsed > 0 ? totalAmountSpent / totalCreditsUsed : 0

    return NextResponse.json({
      packages: processedPackages,
      summary: {
        totalActiveCredits: totalActiveCredits,
        totalCreditsEverPurchased: totalCreditsEverPurchased,
        totalCreditsUsed: totalCreditsUsed,
        totalAmountSpent: totalAmountSpent,
        averageCostPerCredit: Math.round(averageCostPerCredit * 100) / 100,
        activePackagesCount: activePackages.length,
        expiredPackagesCount: expiredPackages.length,
        expiringPackagesCount: expiringPackages.length,
        usedUpPackagesCount: usedUpPackages.length,

        // Investment tracking
        totalPackageValue: Math.round(totalPackageValue * 100) / 100,
        usedValue: Math.round(usedValue * 100) / 100,
        remainingValue: Math.round(remainingValue * 100) / 100,
        valueUtilizationRate: Math.round(valueUtilizationRate * 10) / 10,

        // Payment status
        fullyPaidPackages: fullyPaidPackages,
        pendingPaymentPackages: pendingPaymentPackages,

        // Package efficiency
        expiredUnusedCredits: expiredUnusedPackages.reduce((sum, p) => sum + p.remainingCredits, 0),
        expiredUnusedValue: expiredUnusedPackages.reduce((sum, p) => sum + (p.totalPaid * (p.remainingCredits / p.totalCredits)), 0)
      },
      alerts: {
        expiringPackages: expiringPackages.map(p => ({
          id: p.id,
          name: p.name,
          daysUntilExpiry: p.daysUntilExpiry,
          remainingCredits: p.remainingCredits
        })),
        expiredPackages: expiredPackages.map(p => ({
          id: p.id,
          name: p.name,
          remainingCredits: p.remainingCredits
        }))
      },
      recommendations: recommendations
    })

  } catch (error) {
    console.error('Student credits fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch credit information' },
      { status: 500 }
    )
  }
}