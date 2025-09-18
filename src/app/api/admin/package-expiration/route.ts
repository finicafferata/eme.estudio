import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { PackageExpirationService } from '@/lib/package-expiration'
import { prisma } from '@/lib/prisma'

// Run package expiration processing
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    let result

    switch (action) {
      case 'process_expired':
        result = await PackageExpirationService.processExpirations()
        break

      case 'send_warnings':
        result = await PackageExpirationService.sendExpirationWarnings()
        break

      case 'set_missing_dates':
        result = await PackageExpirationService.setMissingExpirationDates()
        break

      case 'full_process':
        // Run all operations in sequence
        const setDatesResult = await PackageExpirationService.setMissingExpirationDates()
        const expiredResult = await PackageExpirationService.processExpirations()
        const warningsResult = await PackageExpirationService.sendExpirationWarnings()

        result = {
          setMissingDates: setDatesResult,
          processExpired: expiredResult,
          sendWarnings: warningsResult
        }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: process_expired, send_warnings, set_missing_dates, or full_process' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      message: 'Package expiration processing completed',
      action,
      result
    })

  } catch (error) {
    console.error('Package expiration processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process package expiration' },
      { status: 500 }
    )
  }
}

// Get expiration report
export async function GET() {
  try {
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const next7Days = new Date()
    next7Days.setDate(now.getDate() + 7)
    const next30Days = new Date()
    next30Days.setDate(now.getDate() + 30)

    // Get expiration statistics
    const [
      expiredPackages,
      expiring7Days,
      expiring30Days,
      activePackages,
      packagesWithoutExpiration
    ] = await Promise.all([
      // Already expired packages
      prisma.package.findMany({
        where: {
          status: 'ACTIVE',
          expiresAt: { lte: now }
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
      }),

      // Expiring in next 7 days
      prisma.package.findMany({
        where: {
          status: 'ACTIVE',
          expiresAt: {
            gt: now,
            lte: next7Days
          }
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
      }),

      // Expiring in next 30 days
      prisma.package.findMany({
        where: {
          status: 'ACTIVE',
          expiresAt: {
            gt: next7Days,
            lte: next30Days
          }
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
      }),

      // Total active packages
      prisma.package.count({
        where: { status: 'ACTIVE' }
      }),

      // Packages without expiration date
      prisma.package.findMany({
        where: {
          status: 'ACTIVE',
          expiresAt: null
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
      })
    ])

    // Calculate stats
    const formatPackage = (pkg: any) => ({
      id: pkg.id.toString(),
      name: pkg.name,
      userName: `${pkg.user.firstName} ${pkg.user.lastName}`,
      userEmail: pkg.user.email,
      totalCredits: pkg.totalCredits,
      usedCredits: pkg.usedCredits,
      remainingCredits: pkg.totalCredits - pkg.usedCredits,
      purchasedAt: pkg.purchasedAt.toISOString(),
      expiresAt: pkg.expiresAt?.toISOString() || null,
      daysUntilExpiry: pkg.expiresAt ?
        Math.ceil((pkg.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null
    })

    return NextResponse.json({
      summary: {
        totalActivePackages: activePackages,
        expiredCount: expiredPackages.length,
        expiring7Days: expiring7Days.length,
        expiring30Days: expiring30Days.length,
        withoutExpirationDate: packagesWithoutExpiration.length,
        totalExpiredCredits: expiredPackages.reduce((sum, pkg) => sum + (pkg.totalCredits - pkg.usedCredits), 0),
        totalExpiringCredits7Days: expiring7Days.reduce((sum, pkg) => sum + (pkg.totalCredits - pkg.usedCredits), 0),
        totalExpiringCredits30Days: expiring30Days.reduce((sum, pkg) => sum + (pkg.totalCredits - pkg.usedCredits), 0)
      },
      expired: expiredPackages.map(formatPackage),
      expiring7Days: expiring7Days.map(formatPackage),
      expiring30Days: expiring30Days.map(formatPackage),
      withoutExpirationDate: packagesWithoutExpiration.map(formatPackage)
    })

  } catch (error) {
    console.error('Expiration report error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch expiration report' },
      { status: 500 }
    )
  }
}