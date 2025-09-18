import { prisma } from '@/lib/prisma'
import { emailService } from '@/lib/email'

export class PackageExpirationService {
  // Check and update expired packages
  static async processExpirations() {
    try {
      const now = new Date()

      // Find packages that have expired but are still marked as ACTIVE
      const expiredPackages = await prisma.package.findMany({
        where: {
          status: 'ACTIVE',
          expiresAt: {
            lte: now
          }
        },
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
      })

      console.log(`Found ${expiredPackages.length} expired packages to process`)

      for (const pkg of expiredPackages) {
        // Update package status to EXPIRED
        await prisma.package.update({
          where: { id: pkg.id },
          data: { status: 'EXPIRED' }
        })

        // Log the expiration
        await prisma.auditLog.create({
          data: {
            userId: pkg.userId,
            action: 'PACKAGE_EXPIRED',
            tableName: 'packages',
            recordId: pkg.id,
            oldValues: { status: 'ACTIVE' },
            newValues: {
              status: 'EXPIRED',
              expiredAt: now.toISOString(),
              remainingCredits: pkg.totalCredits - pkg.usedCredits,
              reason: 'AUTOMATIC_EXPIRATION'
            }
          }
        })

        // Send expiration notification email if user has unused credits
        const unusedCredits = pkg.totalCredits - pkg.usedCredits
        if (unusedCredits > 0) {
          try {
            await emailService.sendPackageExpiredNotification({
              email: pkg.user.email,
              name: `${pkg.user.firstName} ${pkg.user.lastName}`,
              packageName: pkg.name,
              unusedCredits,
              expiredDate: now.toISOString()
            })
          } catch (emailError) {
            console.error(`Failed to send expiration email to ${pkg.user.email}:`, emailError)
          }
        }
      }

      return {
        processed: expiredPackages.length,
        packages: expiredPackages.map(pkg => ({
          id: pkg.id.toString(),
          name: pkg.name,
          userName: `${pkg.user.firstName} ${pkg.user.lastName}`,
          unusedCredits: pkg.totalCredits - pkg.usedCredits
        }))
      }
    } catch (error) {
      console.error('Error processing package expirations:', error)
      throw error
    }
  }

  // Send warning emails for packages expiring soon
  static async sendExpirationWarnings() {
    try {
      const now = new Date()
      const warningDate = new Date()
      warningDate.setDate(now.getDate() + 7) // 7 days warning

      // Find packages expiring in the next 7 days
      const expiringPackages = await prisma.package.findMany({
        where: {
          status: 'ACTIVE',
          expiresAt: {
            gte: now,
            lte: warningDate
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
      })

      console.log(`Found ${expiringPackages.length} packages expiring soon`)

      for (const pkg of expiringPackages) {
        const daysUntilExpiry = Math.ceil(
          ((pkg.expiresAt?.getTime() || 0) - now.getTime()) / (1000 * 60 * 60 * 24)
        )

        const unusedCredits = pkg.totalCredits - pkg.usedCredits

        // Only send warning if package has unused credits
        if (unusedCredits > 0) {
          try {
            await emailService.sendPackageExpirationWarning({
              email: pkg.user.email,
              name: `${pkg.user.firstName} ${pkg.user.lastName}`,
              packageName: pkg.name,
              daysUntilExpiry,
              unusedCredits,
              expirationDate: pkg.expiresAt?.toISOString() || ''
            })

            // Log the warning sent
            await prisma.auditLog.create({
              data: {
                userId: pkg.userId,
                action: 'EXPIRATION_WARNING_SENT',
                tableName: 'packages',
                recordId: pkg.id,
                newValues: {
                  daysUntilExpiry,
                  unusedCredits,
                  warningType: '7_DAY_WARNING'
                }
              }
            })
          } catch (emailError) {
            console.error(`Failed to send warning email to ${pkg.user.email}:`, emailError)
          }
        }
      }

      return {
        warningsSent: expiringPackages.filter(pkg => pkg.totalCredits - pkg.usedCredits > 0).length,
        packages: expiringPackages.map(pkg => ({
          id: pkg.id.toString(),
          name: pkg.name,
          userName: `${pkg.user.firstName} ${pkg.user.lastName}`,
          daysUntilExpiry: Math.ceil(
            ((pkg.expiresAt?.getTime() || 0) - now.getTime()) / (1000 * 60 * 60 * 24)
          ),
          unusedCredits: pkg.totalCredits - pkg.usedCredits
        }))
      }
    } catch (error) {
      console.error('Error sending expiration warnings:', error)
      throw error
    }
  }

  // Set expiration date for packages that don't have one (3 months from purchase)
  static async setMissingExpirationDates() {
    try {
      const packagesWithoutExpiration = await prisma.package.findMany({
        where: {
          expiresAt: null,
          status: 'ACTIVE'
        }
      })

      console.log(`Found ${packagesWithoutExpiration.length} packages without expiration dates`)

      for (const pkg of packagesWithoutExpiration) {
        const expirationDate = new Date(pkg.purchasedAt)
        expirationDate.setMonth(expirationDate.getMonth() + 3) // 3 months from purchase

        await prisma.package.update({
          where: { id: pkg.id },
          data: { expiresAt: expirationDate }
        })

        // Log the expiration date setting
        await prisma.auditLog.create({
          data: {
            userId: pkg.userId,
            action: 'EXPIRATION_DATE_SET',
            tableName: 'packages',
            recordId: pkg.id,
            oldValues: { expiresAt: null },
            newValues: {
              expiresAt: expirationDate.toISOString(),
              reason: 'AUTOMATIC_3_MONTH_EXPIRATION'
            }
          }
        })
      }

      return {
        updated: packagesWithoutExpiration.length,
        packages: packagesWithoutExpiration.map(pkg => ({
          id: pkg.id.toString(),
          name: pkg.name,
          purchasedAt: pkg.purchasedAt.toISOString(),
          newExpirationDate: new Date(pkg.purchasedAt.getTime() + (3 * 30 * 24 * 60 * 60 * 1000)).toISOString()
        }))
      }
    } catch (error) {
      console.error('Error setting missing expiration dates:', error)
      throw error
    }
  }
}