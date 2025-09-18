import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, PaymentStatus } from '@prisma/client'

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

    const paymentId = parseInt(params.id)
    if (isNaN(paymentId)) {
      return NextResponse.json({ error: 'Invalid payment ID' }, { status: 400 })
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
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
        package: {
          include: {
            classType: {
              select: {
                id: true,
                name: true,
              }
            },
            payments: {
              where: {
                status: PaymentStatus.COMPLETED
              },
              orderBy: {
                paidAt: 'desc'
              }
            }
          }
        }
      }
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const paymentMethodInfo = PAYMENT_METHODS[payment.paymentMethod as keyof typeof PAYMENT_METHODS]

    // Calculate package payment summary if package exists
    let packagePaymentSummary = null
    if (payment.package) {
      const totalPaid = payment.package.payments.reduce((sum, p) => sum + Number(p.amount), 0)
      const remainingBalance = Number(payment.package.price) - totalPaid
      const paymentProgress = (totalPaid / Number(payment.package.price)) * 100

      packagePaymentSummary = {
        totalPrice: Number(payment.package.price),
        totalPaid,
        remainingBalance,
        paymentProgress: Math.round(paymentProgress),
        isFullyPaid: remainingBalance <= 0,
        allowsPartialPayments: payment.package.name === 'Intensivo', // Business rule
        allPayments: payment.package.payments.map(p => ({
          id: p.id.toString(),
          amount: Number(p.amount),
          currency: p.currency,
          paymentMethod: p.paymentMethod,
          paidAt: p.paidAt?.toISOString(),
          status: p.status
        }))
      }
    }

    const paymentDetails = {
      id: payment.id.toString(),
      amount: Number(payment.amount),
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      paymentMethodInfo: paymentMethodInfo || {
        name: payment.paymentMethod,
        displayName: payment.paymentMethod,
        currency: payment.currency,
        description: `Payment via ${payment.paymentMethod}`
      },
      status: payment.status,
      description: payment.description,
      notes: null,
      createdAt: payment.createdAt.toISOString(),
      paidAt: payment.paidAt?.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),

      student: {
        id: payment.user.id.toString(),
        name: `${payment.user.firstName} ${payment.user.lastName}`,
        firstName: payment.user.firstName,
        lastName: payment.user.lastName,
        email: payment.user.email,
        phone: payment.user.phone,
        status: payment.user.status
      },

      package: payment.package ? {
        id: payment.package.id.toString(),
        name: payment.package.name,
        description: "Package description",
        totalCredits: payment.package.totalCredits,
        usedCredits: payment.package.usedCredits,
        remainingCredits: payment.package.totalCredits - payment.package.usedCredits,
        price: Number(payment.package.price),
        status: payment.package.status,
        purchasedAt: payment.package.purchasedAt.toISOString(),
        expiresAt: payment.package.expiresAt?.toISOString(),
        classType: payment.package.classType ? {
          id: payment.package.classType.id.toString(),
          name: payment.package.classType.name,
          color: "#3B82F6",
          description: "Class type description"
        } : null,
        paymentSummary: packagePaymentSummary
      } : null
    }

    return NextResponse.json(paymentDetails)
  } catch (error) {
    console.error('Payment GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment details' },
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

    const paymentId = parseInt(params.id)
    if (isNaN(paymentId)) {
      return NextResponse.json({ error: 'Invalid payment ID' }, { status: 400 })
    }

    const body = await request.json()
    const {
      amount,
      currency,
      paymentMethod,
      status,
      description,
      notes,
      paidAt,
      refund
    } = body

    // Check if payment exists
    const existingPayment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        package: true
      }
    })

    if (!existingPayment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Handle refund logic
    if (refund) {
      const updatedPayment = await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.REFUNDED,
          updatedAt: new Date()
        },
        include: {
          user: {
            select: {
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

      return NextResponse.json({
        id: updatedPayment.id.toString(),
        amount: Number(updatedPayment.amount),
        currency: updatedPayment.currency,
        paymentMethod: updatedPayment.paymentMethod,
        status: updatedPayment.status,
        description: updatedPayment.description,
        notes: null,
        paidAt: updatedPayment.paidAt?.toISOString(),
        updatedAt: updatedPayment.updatedAt.toISOString(),
        student: {
          name: `${updatedPayment.user.firstName} ${updatedPayment.user.lastName}`,
          email: updatedPayment.user.email
        }
      })
    }

    // Prepare update data
    const updateData: any = {}

    if (amount !== undefined) {
      const newAmount = parseFloat(amount)
      if (newAmount <= 0) {
        return NextResponse.json(
          { error: 'Amount must be greater than 0' },
          { status: 400 }
        )
      }
      updateData.amount = newAmount
    }

    if (currency !== undefined) {
      if (!['ARS', 'USD'].includes(currency)) {
        return NextResponse.json(
          { error: 'Currency must be ARS or USD' },
          { status: 400 }
        )
      }
      updateData.currency = currency
    }

    if (paymentMethod !== undefined) {
      const validPaymentMethod = PAYMENT_METHODS[paymentMethod as keyof typeof PAYMENT_METHODS]
      if (!validPaymentMethod) {
        return NextResponse.json(
          { error: 'Invalid payment method' },
          { status: 400 }
        )
      }
      updateData.paymentMethod = paymentMethod
    }

    if (status !== undefined) {
      updateData.status = status as PaymentStatus

      // Set paidAt when marking as completed
      if (status === PaymentStatus.COMPLETED && !existingPayment.paidAt) {
        updateData.paidAt = new Date()
      }
      // Clear paidAt when marking as pending
      else if (status === PaymentStatus.PENDING) {
        updateData.paidAt = null
      }
    }

    if (description !== undefined) updateData.description = description
    if (notes !== undefined) updateData.notes = notes
    if (paidAt !== undefined) {
      updateData.paidAt = paidAt ? new Date(paidAt) : null
    }

    updateData.updatedAt = new Date()

    // Update the payment
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: updateData,
      include: {
        user: {
          select: {
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

    const paymentMethodInfo = PAYMENT_METHODS[updatedPayment.paymentMethod as keyof typeof PAYMENT_METHODS]

    const paymentResponse = {
      id: updatedPayment.id.toString(),
      amount: Number(updatedPayment.amount),
      currency: updatedPayment.currency,
      paymentMethod: updatedPayment.paymentMethod,
      paymentMethodInfo: paymentMethodInfo || {
        name: updatedPayment.paymentMethod,
        displayName: updatedPayment.paymentMethod,
        currency: updatedPayment.currency
      },
      status: updatedPayment.status,
      description: updatedPayment.description,
      notes: null,
      createdAt: updatedPayment.createdAt.toISOString(),
      paidAt: updatedPayment.paidAt?.toISOString(),
      updatedAt: updatedPayment.updatedAt.toISOString(),
      student: {
        name: `${updatedPayment.user.firstName} ${updatedPayment.user.lastName}`,
        email: updatedPayment.user.email
      },
      package: updatedPayment.package ? {
        id: updatedPayment.package.id.toString(),
        name: updatedPayment.package.name,
        price: Number(updatedPayment.package.price),
        status: updatedPayment.package.status,
        classType: updatedPayment.package.classType ? {
          name: updatedPayment.package.classType.name,
          color: "#3B82F6"
        } : null
      } : null
    }

    return NextResponse.json(paymentResponse)
  } catch (error) {
    console.error('Payment PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update payment' },
      { status: 500 }
    )
  }
}