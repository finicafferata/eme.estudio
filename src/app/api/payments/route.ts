import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, PaymentStatus, PackageStatus, PaymentMethod } from '@prisma/client'

// EME Studio Payment Methods
const PAYMENT_METHODS = {
  cash_pesos: {
    name: 'Cash Pesos',
    displayName: 'Efectivo Pesos',
    currency: 'ARS',
    description: 'Pago en efectivo en pesos argentinos'
  },
  cash_usd: {
    name: 'Cash USD',
    displayName: 'Efectivo USD',
    currency: 'USD',
    description: 'Pago en efectivo en dólares estadounidenses'
  },
  transfer_meri_pesos: {
    name: 'Transfer to Meri Pesos',
    displayName: 'Transferencia a Meri Pesos',
    currency: 'ARS',
    description: 'Transferencia bancaria a cuenta de Meri en pesos'
  },
  transfer_male_pesos: {
    name: 'Transfer to Male Pesos',
    displayName: 'Transferencia a Male Pesos',
    currency: 'ARS',
    description: 'Transferencia bancaria a cuenta de Male en pesos'
  },
  transfer_usd: {
    name: 'Transfer in USD',
    displayName: 'Transferencia USD',
    currency: 'USD',
    description: 'Transferencia bancaria en dólares estadounidenses'
  }
}

// Note: We allow any payment amount regardless of currency
// Admin will manually decide if package is fully paid or not

// Map frontend payment method keys to Prisma enum values
const PAYMENT_METHOD_MAPPING: Record<string, PaymentMethod> = {
  'cash_pesos': PaymentMethod.CASH_PESOS,
  'cash_usd': PaymentMethod.CASH_USD,
  'transfer_meri_pesos': PaymentMethod.TRANSFER_TO_MERI_PESOS,
  'transfer_male_pesos': PaymentMethod.TRANSFER_TO_MALE_PESOS,
  'transfer_usd': PaymentMethod.TRANSFER_IN_USD
}

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const paymentMethod = searchParams.get('paymentMethod')
    const currency = searchParams.get('currency')
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {
      ...(search && {
        user: {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } }
          ]
        }
      }),
      ...(paymentMethod && { paymentMethod }),
      ...(currency && { currency }),
      ...(status && { status: status as PaymentStatus }),
      ...(startDate && endDate && {
        OR: [
          {
            paidAt: {
              gte: new Date(startDate),
              lte: new Date(endDate)
            }
          },
          {
            createdAt: {
              gte: new Date(startDate),
              lte: new Date(endDate)
            }
          }
        ]
      })
    }

    const orderBy: any = {}
    if (sortBy === 'studentName') {
      orderBy.user = { firstName: sortOrder }
    } else if (sortBy === 'amount') {
      orderBy.amount = sortOrder
    } else if (sortBy === 'paidAt') {
      orderBy.paidAt = sortOrder
    } else {
      orderBy[sortBy] = sortOrder
    }

    const [payments, totalCount] = await Promise.all([
      prisma.payment.findMany({
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
              email: true,
              phone: true
            }
          },
          package: {
            include: {
              classType: {
                select: {
                  name: true,
                }
              }
            }
          }
        }
      }),
      prisma.payment.count({ where })
    ])

    const paymentsWithDetails = payments.map(payment => {
      const paymentMethodInfo = PAYMENT_METHODS[payment.paymentMethod as keyof typeof PAYMENT_METHODS]

      return {
        id: payment.id.toString(),
        amount: Number(payment.amount),
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        paymentMethodInfo: paymentMethodInfo || {
          name: payment.paymentMethod,
          displayName: payment.paymentMethod,
          currency: payment.currency
        },
        status: payment.status,
        description: payment.description,
        notes: null,
        createdAt: payment.createdAt.toISOString(),
        paidAt: payment.paidAt?.toISOString(),
        student: {
          id: payment.user.id.toString(),
          name: `${payment.user.firstName} ${payment.user.lastName}`,
          firstName: payment.user.firstName,
          lastName: payment.user.lastName,
          email: payment.user.email,
          phone: payment.user.phone
        },
        package: payment.package ? {
          id: payment.package.id.toString(),
          name: payment.package.name,
          totalCredits: payment.package.totalCredits,
          usedCredits: payment.package.usedCredits,
          price: Number(payment.package.price),
          status: payment.package.status,
          classType: payment.package.classType ? {
            name: payment.package.classType.name,
            color: "#3B82F6"
          } : null
        } : null
      }
    })

    return NextResponse.json({
      payments: paymentsWithDetails,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      hasNext: page * limit < totalCount,
      hasPrev: page > 1
    })
  } catch (error) {
    console.error('Payments GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  console.log('🔥 PAYMENT POST ENDPOINT CALLED - NEW VERSION')
  try {
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.ADMIN) {
      console.log('❌ UNAUTHORIZED - No session or not admin')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('✅ Payment POST request body:', JSON.stringify(body, null, 2))

    const {
      studentId,
      packageId,
      amount,
      currency,
      paymentMethod,
      description,
      notes,
      paidAt,
      markAsFullyPaid = false,
      status = PaymentStatus.COMPLETED
    } = body

    if (!studentId || !amount || !currency || !paymentMethod) {
      return NextResponse.json(
        { error: 'Student ID, amount, currency, and payment method are required' },
        { status: 400 }
      )
    }

    // Validate payment method
    const validPaymentMethod = PAYMENT_METHODS[paymentMethod as keyof typeof PAYMENT_METHODS]
    if (!validPaymentMethod) {
      return NextResponse.json(
        { error: 'Invalid payment method' },
        { status: 400 }
      )
    }

    // Note: We allow cross-currency payments to enable USD payments for ARS packages
    // The payment method currency is just indicative of the preferred currency

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

    // Verify package exists and belongs to student if packageId provided
    let packageData = null
    if (packageId) {
      packageData = await prisma.package.findUnique({
        where: {
          id: parseInt(packageId),
          userId: parseInt(studentId)
        },
        include: {
          payments: {
            where: {
              status: PaymentStatus.COMPLETED
            }
          }
        }
      })

      if (!packageData) {
        return NextResponse.json(
          { error: 'Package not found for this student' },
          { status: 404 }
        )
      }

      // Note: We no longer validate payment amounts against package prices
      // The admin will manually mark the package as fully paid if needed
      console.log(`Package found: ${packageData.name} - $${packageData.price} ARS`)
      console.log(`Recording payment: ${amount} ${currency}`)
    }

    // Create the payment
    const mappedPaymentMethod = PAYMENT_METHOD_MAPPING[paymentMethod] || paymentMethod as PaymentMethod
    console.log(`🔧 Payment method mapping: '${paymentMethod}' -> '${mappedPaymentMethod}'`)
    const newPayment = await prisma.payment.create({
      data: {
        amount: parseFloat(amount),
        currency,
        paymentMethod: mappedPaymentMethod,
        status: status as PaymentStatus,
        description: description || notes || `Payment for ${validPaymentMethod.displayName}`,
        userId: parseInt(studentId),
        packageId: packageId ? parseInt(packageId) : null,
        paidAt: status === PaymentStatus.COMPLETED ? (paidAt ? new Date(paidAt) : new Date()) : null
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
        package: {
          include: {
            classType: {
              select: {
                name: true,
              }
            }
          }
        }
      }
    })

    // If admin marked this as fully paid, update package status
    if (markAsFullyPaid && packageId) {
      await prisma.package.update({
        where: { id: parseInt(packageId) },
        data: { status: PackageStatus.USED_UP }
      })
      console.log(`✅ Package ${packageId} marked as USED_UP due to markAsFullyPaid flag`)
    }

    const paymentResponse = {
      id: newPayment.id.toString(),
      amount: Number(newPayment.amount),
      currency: newPayment.currency,
      paymentMethod: newPayment.paymentMethod,
      paymentMethodInfo: validPaymentMethod,
      status: newPayment.status,
      description: newPayment.description,
      createdAt: newPayment.createdAt.toISOString(),
      paidAt: newPayment.paidAt?.toISOString(),
      student: {
        id: newPayment.user.id.toString(),
        name: `${newPayment.user.firstName} ${newPayment.user.lastName}`,
        email: newPayment.user.email
      },
      package: newPayment.package ? {
        id: newPayment.package.id.toString(),
        name: newPayment.package.name,
        totalCredits: newPayment.package.totalCredits,
        price: Number(newPayment.package.price),
        status: newPayment.package.status,
        classType: newPayment.package.classType ? {
          name: newPayment.package.classType.name,
          color: "#3B82F6"
        } : null
      } : null
    }

    return NextResponse.json(paymentResponse, { status: 201 })
  } catch (error) {
    console.error('Payments POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    )
  }
}