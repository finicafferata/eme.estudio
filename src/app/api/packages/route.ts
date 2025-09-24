import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, PackageStatus, PaymentStatus } from '@prisma/client'

// EME Studio Business Logic Constants
const PACKAGE_TYPES = {
  INTENSIVO: {
    name: 'Intensivo',
    credits: 3,
    price: 145000,
    expiryMonths: 3,
    allowPartialPayment: true,
    currency: 'ARS'
  },
  RECURRENTE: {
    name: 'Recurrente',
    credits: 4,
    price: 170000,
    expiryMonths: 3,
    allowPartialPayment: false,
    currency: 'ARS'
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const packageType = searchParams.get('packageType')
    const status = searchParams.get('status')
    const paymentStatus = searchParams.get('paymentStatus')
    const sortBy = searchParams.get('sortBy') || 'purchasedAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {
      ...(packageType && { name: packageType }),
      ...(status && { status: status as PackageStatus })
    }

    // Payment status filter
    if (paymentStatus) {
      where.payments = {
        some: {
          status: paymentStatus as PaymentStatus
        }
      }
    }

    const orderBy: any = {}
    if (sortBy === 'studentName') {
      orderBy.user = { firstName: sortOrder }
    } else if (sortBy === 'creditsRemaining') {
      orderBy.usedCredits = sortOrder === 'asc' ? 'desc' : 'asc' // Invert for remaining credits
    } else if (sortBy === 'expiresAt') {
      orderBy.expiresAt = sortOrder
    } else {
      orderBy[sortBy] = sortOrder
    }

    const [packages, totalCount] = await Promise.all([
      prisma.package.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
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
              id: true,
              name: true,
            }
          },
          payments: {
            select: {
              id: true,
              amount: true,
              currency: true,
              status: true,
              paidAt: true,
              paymentMethod: true
            }
          },
          reservations: {
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
              createdAt: 'desc'
            }
          }
        }
      }),
      prisma.package.count({ where })
    ])

    const packagesWithMetrics = packages.map(pkg => {
      const now = new Date()
      const isExpired = pkg.expiresAt && new Date(pkg.expiresAt) < now
      const daysUntilExpiry = pkg.expiresAt
        ? Math.ceil((new Date(pkg.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null
      const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0

      const totalPaid = pkg.payments
        .filter(p => p.status === PaymentStatus.COMPLETED)
        .reduce((sum, payment) => sum + Number(payment.amount), 0)

      const totalPending = pkg.payments
        .filter(p => p.status === PaymentStatus.PENDING)
        .reduce((sum, payment) => sum + Number(payment.amount), 0)

      const remainingCredits = pkg.totalCredits - pkg.usedCredits
      const usagePercentage = pkg.totalCredits > 0 ? (pkg.usedCredits / pkg.totalCredits) * 100 : 0

      // Determine effective status based on business logic
      let effectiveStatus = pkg.status
      if (isExpired) {
        effectiveStatus = PackageStatus.EXPIRED
      } else if (remainingCredits <= 0) {
        effectiveStatus = PackageStatus.ACTIVE
      } else if (isExpiringSoon) {
        effectiveStatus = PackageStatus.ACTIVE
      }

      return {
        id: pkg.id.toString(),
        name: pkg.name,
        description: pkg.classType?.name || "Package description",
        status: pkg.status,
        effectiveStatus,
        totalCredits: pkg.totalCredits,
        usedCredits: pkg.usedCredits,
        remainingCredits,
        usagePercentage: Math.round(usagePercentage),
        price: Number(pkg.price),
        purchasedAt: pkg.purchasedAt.toISOString(),
        expiresAt: pkg.expiresAt?.toISOString(),
        isExpired,
        isExpiringSoon,
        daysUntilExpiry,
        student: {
          id: pkg.user.id.toString(),
          name: `${pkg.user.firstName} ${pkg.user.lastName}`,
          email: pkg.user.email
        },
        classType: pkg.classType ? {
          id: pkg.classType.id.toString(),
          name: pkg.classType.name,
          color: "#3B82F6"
        } : null,
        payments: {
          totalPaid,
          totalPending,
          totalDue: Number(pkg.price) - totalPaid,
          isFullyPaid: totalPaid >= Number(pkg.price),
          payments: pkg.payments.map(payment => ({
            id: payment.id.toString(),
            amount: Number(payment.amount),
            currency: payment.currency,
            status: payment.status,
            paymentMethod: payment.paymentMethod,
            paidAt: payment.paidAt?.toISOString()
          }))
        },
        classHistory: pkg.reservations.map(reservation => ({
          id: reservation.id.toString(),
          status: reservation.status,
          creditsUsed: 1,
          createdAt: reservation.createdAt.toISOString(),
          class: {
            id: reservation.class.id.toString(),
            startsAt: reservation.class.startsAt.toISOString(),
            className: reservation.class.classType.name,
            instructor: reservation.class.instructor
              ? `${reservation.class.instructor.user.firstName} ${reservation.class.instructor.user.lastName}`
              : 'Sin instructor'
          }
        }))
      }
    })

    return NextResponse.json({
      packages: packagesWithMetrics,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      hasNext: page * limit < totalCount,
      hasPrev: page > 1
    })
  } catch (error) {
    console.error('Packages GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch packages' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      studentId,
      packageType,
      notes,
      customPrice,
      customExpiryMonths,
      paymentAmount,
      paymentMethod = 'cash',
      paymentNotes
    } = body

    if (!studentId || !packageType) {
      return NextResponse.json(
        { error: 'Student ID and package type are required' },
        { status: 400 }
      )
    }

    // Validate package type
    const packageConfig = PACKAGE_TYPES[packageType as keyof typeof PACKAGE_TYPES]
    if (!packageConfig) {
      return NextResponse.json(
        { error: 'Invalid package type. Must be INTENSIVO or RECURRENTE' },
        { status: 400 }
      )
    }

    // Verify student exists
    const student = await prisma.user.findUnique({
      where: {
        id: parseInt(studentId),
        role: UserRole.STUDENT
      }
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Calculate package details based on EME Studio business logic
    const totalCredits = packageConfig.credits
    const price = customPrice ? parseFloat(customPrice) : packageConfig.price
    const expiryMonths = customExpiryMonths || packageConfig.expiryMonths

    // Calculate expiry date
    const expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + expiryMonths)

    // Get class type ID for the package type (you may need to adjust this based on your class types)
    const classType = await prisma.classType.findFirst({
      where: {
        name: packageType === 'INTENSIVO' ? 'Intensivo' : 'Recurrente'
      }
    })

    // Create package
    const newPackage = await prisma.package.create({
      data: {
        name: packageConfig.name,
        totalCredits,
        usedCredits: 0,
        price,
        status: PackageStatus.ACTIVE,
        userId: parseInt(studentId),
        classTypeId: classType?.id,
        purchasedAt: new Date(),
        expiresAt,
      },
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
            id: true,
            name: true,
          }
        }
      }
    })

    // Create initial payment if provided
    let payment = null
    if (paymentAmount && paymentAmount > 0) {
      // Validate payment amount for Recurrente packages (must be full payment)
      if (packageType === 'RECURRENTE' && parseFloat(paymentAmount) < price) {
        return NextResponse.json(
          { error: 'Recurrente packages require full payment upfront' },
          { status: 400 }
        )
      }

      payment = await prisma.payment.create({
        data: {
          amount: parseFloat(paymentAmount),
          currency: packageConfig.currency,
          paymentMethod,
          status: PaymentStatus.COMPLETED,
          description: `Pago para paquete ${packageConfig.name}`,
          userId: parseInt(studentId),
          packageId: newPackage.id,
          paidAt: new Date()
        },
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          paymentMethod: true,
          paidAt: true
        }
      })
    }

    // Calculate response metrics
    const totalPaid = payment ? Number(payment.amount) : 0
    const totalDue = price - totalPaid
    const isFullyPaid = totalPaid >= price

    const packageResponse = {
      id: newPackage.id.toString(),
      name: newPackage.name,
      description: newPackage.classType?.name || "Package description",
      status: newPackage.status,
      effectiveStatus: newPackage.status,
      totalCredits: newPackage.totalCredits,
      usedCredits: newPackage.usedCredits,
      remainingCredits: newPackage.totalCredits,
      usagePercentage: 0,
      price: Number(newPackage.price),
      purchasedAt: newPackage.purchasedAt.toISOString(),
      expiresAt: newPackage.expiresAt?.toISOString(),
      isExpired: false,
      isExpiringSoon: false,
      daysUntilExpiry: Math.ceil((new Date(newPackage.expiresAt!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
      notes: null,
      student: {
        id: newPackage.user.id.toString(),
        name: `${newPackage.user.firstName} ${newPackage.user.lastName}`,
        email: newPackage.user.email
      },
      classType: newPackage.classType ? {
        id: newPackage.classType.id.toString(),
        name: newPackage.classType.name,
        color: "#3B82F6"
      } : null,
      payments: {
        totalPaid,
        totalPending: 0,
        totalDue,
        isFullyPaid,
        payments: payment ? [{
          id: payment.id.toString(),
          amount: Number(payment.amount),
          currency: payment.currency,
          status: payment.status,
          paymentMethod: payment.paymentMethod,
          paidAt: payment.paidAt?.toISOString()
        }] : []
      },
      classHistory: []
    }

    return NextResponse.json(packageResponse, { status: 201 })
  } catch (error) {
    console.error('Packages POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create package' },
      { status: 500 }
    )
  }
}