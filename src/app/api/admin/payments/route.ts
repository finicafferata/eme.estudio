import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, PaymentStatus } from '@prisma/client'

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { packageId, amount, paymentMethod, notes } = body

    if (!packageId || !amount || !paymentMethod) {
      return NextResponse.json(
        { error: 'Package ID, amount, and payment method are required' },
        { status: 400 }
      )
    }

    // Verify package exists
    const package_ = await prisma.package.findUnique({
      where: { id: parseInt(packageId) },
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

    if (!package_) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }

    // Create the payment
    const payment = await prisma.payment.create({
      data: {
        amount: parseFloat(amount),
        currency: 'ARS',
        paymentMethod,
        status: PaymentStatus.COMPLETED,
        description: `Pago registrado para paquete ${package_.name}`,
        userId: package_.userId,
        packageId: package_.id,
        paidAt: new Date()
      },
      select: {
        id: true,
        amount: true,
        currency: true,
        paymentMethod: true,
        status: true,
        description: true,
        paidAt: true
      }
    })

    return NextResponse.json({
      payment: {
        id: payment.id.toString(),
        amount: Number(payment.amount),
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        description: payment.description,
        paidAt: payment.paidAt?.toISOString()
      },
      message: 'Payment recorded successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Payment recording error:', error)
    return NextResponse.json(
      { error: 'Failed to record payment' },
      { status: 500 }
    )
  }
}