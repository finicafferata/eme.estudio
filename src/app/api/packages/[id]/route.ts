import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, PackageStatus, PaymentStatus, ReservationStatus } from '@prisma/client'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const packageId = parseInt(params.id)
    if (isNaN(packageId)) {
      return NextResponse.json({ error: 'Invalid package ID' }, { status: 400 })
    }

    const packageData = await prisma.package.findUnique({
      where: { id: packageId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            status: true
          }
        },
        classType: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        payments: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        reservations: {
          include: {
            class: {
              include: {
                classType: {
                  select: {
                    name: true,
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
                location: {
                  select: {
                    name: true,
                    address: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!packageData) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }

    const now = new Date()
    const isExpired = packageData.expiresAt && new Date(packageData.expiresAt) < now
    const daysUntilExpiry = packageData.expiresAt
      ? Math.ceil((new Date(packageData.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null
    const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0

    const remainingCredits = packageData.totalCredits - packageData.usedCredits
    const usagePercentage = packageData.totalCredits > 0 ? (packageData.usedCredits / packageData.totalCredits) * 100 : 0

    // Calculate payment summary
    const completedPayments = packageData.payments.filter(p => p.status === PaymentStatus.COMPLETED)
    const pendingPayments = packageData.payments.filter(p => p.status === PaymentStatus.PENDING)
    const totalPaid = completedPayments.reduce((sum, payment) => sum + Number(payment.amount), 0)
    const totalPending = pendingPayments.reduce((sum, payment) => sum + Number(payment.amount), 0)
    const totalDue = Number(packageData.price) - totalPaid
    const isFullyPaid = totalPaid >= Number(packageData.price)

    // Determine effective status
    let effectiveStatus = packageData.status
    if (isExpired) {
      effectiveStatus = PackageStatus.EXPIRED
    } else if (remainingCredits <= 0) {
      effectiveStatus = PackageStatus.ACTIVE
    } else if (isExpiringSoon) {
      effectiveStatus = PackageStatus.ACTIVE
    }

    // Process class history
    const classHistory = packageData.reservations.map(reservation => {
      const classData = reservation.class
      return {
        id: reservation.id.toString(),
        status: reservation.status,
        creditsUsed: 1,
        createdAt: reservation.createdAt.toISOString(),
        checkedInAt: reservation.checkedInAt?.toISOString(),
        class: {
          id: classData.id.toString(),
          startsAt: classData.startsAt.toISOString(),
          endsAt: classData.endsAt.toISOString(),
          className: classData.classType.name,
          classColor: '#3B82F6',
          instructor: classData.instructor
            ? `${classData.instructor.user.firstName} ${classData.instructor.user.lastName}`
            : 'Sin instructor',
          location: {
            name: classData.location.name,
            address: classData.location.address
          },
          capacity: classData.capacity,
          description: 'Class description'
        }
      }
    })

    // Calculate class attendance stats
    const attendedClasses = classHistory.filter(ch =>
      ch.status === ReservationStatus.CHECKED_IN || ch.status === ReservationStatus.COMPLETED
    ).length

    const upcomingClasses = classHistory.filter(ch =>
      ch.status === ReservationStatus.CONFIRMED &&
      new Date(ch.class.startsAt) > now
    ).length

    const cancelledClasses = classHistory.filter(ch =>
      ch.status === ReservationStatus.CANCELLED
    ).length

    const packageDetails = {
      id: packageData.id.toString(),
      name: packageData.name,
      description: packageData.classType?.description || 'Package description',
      status: packageData.status,
      effectiveStatus,
      totalCredits: packageData.totalCredits,
      usedCredits: packageData.usedCredits,
      remainingCredits,
      usagePercentage: Math.round(usagePercentage),
      price: Number(packageData.price),
      purchasedAt: packageData.purchasedAt.toISOString(),
      expiresAt: packageData.expiresAt?.toISOString(),
      isExpired,
      isExpiringSoon,
      daysUntilExpiry,
      createdAt: packageData.createdAt.toISOString(),
      updatedAt: packageData.updatedAt.toISOString(),

      student: {
        id: packageData.user.id.toString(),
        name: `${packageData.user.firstName} ${packageData.user.lastName}`,
        firstName: packageData.user.firstName,
        lastName: packageData.user.lastName,
        email: packageData.user.email,
        phone: packageData.user.phone,
        status: packageData.user.status
      },

      classType: packageData.classType ? {
        id: packageData.classType.id.toString(),
        name: packageData.classType.name,
        color: '#3B82F6',
        description: packageData.classType.description
      } : null,

      payments: {
        totalPaid,
        totalPending,
        totalDue,
        isFullyPaid,
        completedCount: completedPayments.length,
        pendingCount: pendingPayments.length,
        payments: packageData.payments.map(payment => ({
          id: payment.id.toString(),
          amount: Number(payment.amount),
          currency: payment.currency,
          paymentMethod: payment.paymentMethod,
          status: payment.status,
          description: payment.description,
          createdAt: payment.createdAt.toISOString(),
          paidAt: payment.paidAt?.toISOString()
        }))
      },

      classStats: {
        totalReservations: classHistory.length,
        attendedClasses,
        upcomingClasses,
        cancelledClasses,
        noShowClasses: classHistory.filter(ch => ch.status === ReservationStatus.NO_SHOW).length
      },

      classHistory
    }

    return NextResponse.json(packageDetails)
  } catch (error) {
    console.error('Package GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch package details' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const packageId = parseInt(params.id)
    if (isNaN(packageId)) {
      return NextResponse.json({ error: 'Invalid package ID' }, { status: 400 })
    }

    const body = await request.json()
    const {
      name,
      description,
      status,
      totalCredits,
      usedCredits,
      price,
      expiresAt,
      notes,
      addCredits,
      extendDays
    } = body

    // Check if package exists
    const existingPackage = await prisma.package.findUnique({
      where: { id: packageId },
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

    if (!existingPackage) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {}

    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (status !== undefined) updateData.status = status as PackageStatus
    if (notes !== undefined) updateData.notes = notes
    if (price !== undefined) updateData.price = parseFloat(price)

    // Handle credit adjustments
    if (totalCredits !== undefined) {
      const newTotalCredits = parseInt(totalCredits)
      if (newTotalCredits < existingPackage.usedCredits) {
        return NextResponse.json(
          { error: 'Total credits cannot be less than used credits' },
          { status: 400 }
        )
      }
      updateData.totalCredits = newTotalCredits
    }

    if (usedCredits !== undefined) {
      const newUsedCredits = parseInt(usedCredits)
      const maxCredits = updateData.totalCredits || existingPackage.totalCredits
      if (newUsedCredits > maxCredits) {
        return NextResponse.json(
          { error: 'Used credits cannot exceed total credits' },
          { status: 400 }
        )
      }
      if (newUsedCredits < 0) {
        return NextResponse.json(
          { error: 'Used credits cannot be negative' },
          { status: 400 }
        )
      }
      updateData.usedCredits = newUsedCredits
    }

    // Handle adding credits (admin convenience feature)
    if (addCredits !== undefined) {
      const creditsToAdd = parseInt(addCredits)
      if (creditsToAdd > 0) {
        updateData.totalCredits = existingPackage.totalCredits + creditsToAdd
      }
    }

    // Handle expiry date changes
    if (expiresAt !== undefined) {
      updateData.expiresAt = new Date(expiresAt)
    }

    // Handle extending expiry (admin convenience feature)
    if (extendDays !== undefined) {
      const daysToExtend = parseInt(extendDays)
      if (daysToExtend > 0 && existingPackage.expiresAt) {
        const currentExpiry = new Date(existingPackage.expiresAt)
        const newExpiry = new Date(currentExpiry)
        newExpiry.setDate(newExpiry.getDate() + daysToExtend)
        updateData.expiresAt = newExpiry
      }
    }

    // Update the package
    const updatedPackage = await prisma.package.update({
      where: { id: packageId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        classType: {
          select: {
            name: true,
          }
        },
        payments: {
          where: {
            status: PaymentStatus.COMPLETED
          }
        }
      }
    })

    // Calculate response metrics
    const now = new Date()
    const isExpired = updatedPackage.expiresAt && new Date(updatedPackage.expiresAt) < now
    const daysUntilExpiry = updatedPackage.expiresAt
      ? Math.ceil((new Date(updatedPackage.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null
    const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0

    const remainingCredits = updatedPackage.totalCredits - updatedPackage.usedCredits
    const usagePercentage = updatedPackage.totalCredits > 0 ? (updatedPackage.usedCredits / updatedPackage.totalCredits) * 100 : 0

    const totalPaid = updatedPackage.payments.reduce((sum, payment) => sum + Number(payment.amount), 0)

    let effectiveStatus = updatedPackage.status
    if (isExpired) {
      effectiveStatus = PackageStatus.EXPIRED
    } else if (remainingCredits <= 0) {
      effectiveStatus = PackageStatus.ACTIVE
    } else if (isExpiringSoon) {
      effectiveStatus = PackageStatus.ACTIVE
    }

    const packageResponse = {
      id: updatedPackage.id.toString(),
      name: updatedPackage.name,
      description: updatedPackage.classType?.name || 'Package description',
      status: updatedPackage.status,
      effectiveStatus,
      totalCredits: updatedPackage.totalCredits,
      usedCredits: updatedPackage.usedCredits,
      remainingCredits,
      usagePercentage: Math.round(usagePercentage),
      price: Number(updatedPackage.price),
      purchasedAt: updatedPackage.purchasedAt.toISOString(),
      expiresAt: updatedPackage.expiresAt?.toISOString(),
      isExpired,
      isExpiringSoon,
      daysUntilExpiry,
      updatedAt: updatedPackage.updatedAt.toISOString(),
      student: {
        id: updatedPackage.user.id.toString(),
        name: `${updatedPackage.user.firstName} ${updatedPackage.user.lastName}`,
        email: updatedPackage.user.email
      },
      classType: updatedPackage.classType ? {
        name: updatedPackage.classType.name,
        color: '#3B82F6'
      } : null,
      payments: {
        totalPaid,
        totalDue: Number(updatedPackage.price) - totalPaid,
        isFullyPaid: totalPaid >= Number(updatedPackage.price)
      }
    }

    return NextResponse.json(packageResponse)
  } catch (error) {
    console.error('Package PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update package' },
      { status: 500 }
    )
  }
}