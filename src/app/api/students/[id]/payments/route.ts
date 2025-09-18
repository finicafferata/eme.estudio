import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, PaymentStatus } from '@prisma/client'

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

    const studentId = parseInt(params.id)
    if (isNaN(studentId)) {
      return NextResponse.json({ error: 'Invalid student ID' }, { status: 400 })
    }

    // Verify student exists
    const student = await prisma.user.findUnique({
      where: {
        id: studentId,
        role: UserRole.STUDENT
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true
      }
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {
      userId: studentId,
      ...(status && { status: status as PaymentStatus }),
      ...(startDate && endDate && {
        paidAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      })
    }

    const payments = await prisma.payment.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      include: {
        package: {
          select: {
            id: true,
            name: true,
            classType: {
              select: {
                name: true,
              }
            }
          }
        }
      }
    })

    const paymentsWithDetails = payments.map(payment => ({
      id: payment.id.toString(),
      amount: Number(payment.amount),
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      description: payment.description,
      notes: null,
      createdAt: payment.createdAt.toISOString(),
      paidAt: payment.paidAt?.toISOString(),
      package: payment.package ? {
        id: payment.package.id.toString(),
        name: payment.package.name,
        classType: payment.package.classType ? {
          name: payment.package.classType.name,
          color: "#3B82F6"
        } : null
      } : null
    }))

    // Calculate payment summary
    const completedPayments = paymentsWithDetails.filter(p => p.status === PaymentStatus.COMPLETED)
    const pendingPayments = paymentsWithDetails.filter(p => p.status === PaymentStatus.PENDING)
    const failedPayments = paymentsWithDetails.filter(p => p.status === PaymentStatus.FAILED)

    const totalPaid = completedPayments.reduce((sum, payment) => {
      if (payment.currency === 'USD') {
        return sum + (Number(payment.amount) * 1200) // Convert USD to ARS for summary
      }
      return sum + payment.amount
    }, 0)

    const totalPaidUSD = completedPayments
      .filter(p => p.currency === 'USD')
      .reduce((sum, payment) => sum + payment.amount, 0)

    const totalPaidARS = completedPayments
      .filter(p => p.currency === 'ARS')
      .reduce((sum, payment) => sum + payment.amount, 0)

    const paymentMethodBreakdown = completedPayments.reduce((acc, payment) => {
      const method = payment.paymentMethod || 'unknown'
      if (!acc[method]) {
        acc[method] = { count: 0, total: 0 }
      }
      acc[method].count++
      acc[method].total += payment.amount
      return acc
    }, {} as Record<string, { count: number; total: number }>)

    // Get monthly payment trends (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const monthlyPayments = await prisma.payment.findMany({
      where: {
        userId: studentId,
        status: PaymentStatus.COMPLETED,
        paidAt: {
          gte: sixMonthsAgo
        }
      },
      select: {
        amount: true,
        currency: true,
        paidAt: true
      }
    })

    const monthlyTrends = monthlyPayments.reduce((acc, payment) => {
      if (!payment.paidAt) return acc

      const monthKey = payment.paidAt.toISOString().slice(0, 7) // YYYY-MM format
      if (!acc[monthKey]) {
        acc[monthKey] = { total: 0, count: 0 }
      }

      const amount = payment.currency === 'USD' ? Number(payment.amount) * 1200 : Number(payment.amount)
      acc[monthKey].total += Number(amount)
      acc[monthKey].count++
      return acc
    }, {} as Record<string, { total: number; count: number }>)

    const summary = {
      student: {
        id: student.id.toString(),
        name: `${student.firstName} ${student.lastName}`,
        email: student.email
      },
      totals: {
        totalPayments: paymentsWithDetails.length,
        completedPayments: completedPayments.length,
        pendingPayments: pendingPayments.length,
        failedPayments: failedPayments.length,
        totalPaidARS: totalPaidARS,
        totalPaidUSD: totalPaidUSD,
        totalPaidEquivalentARS: totalPaid
      },
      paymentMethods: Object.entries(paymentMethodBreakdown).map(([method, data]) => ({
        method,
        count: data.count,
        total: data.total
      })),
      monthlyTrends: Object.entries(monthlyTrends)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({
          month,
          total: Math.round(data.total),
          count: data.count
        }))
    }

    return NextResponse.json({
      payments: paymentsWithDetails,
      summary
    })
  } catch (error) {
    console.error('Student payments GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch student payments' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const studentId = parseInt(params.id)
    if (isNaN(studentId)) {
      return NextResponse.json({ error: 'Invalid student ID' }, { status: 400 })
    }

    // Verify student exists
    const student = await prisma.user.findUnique({
      where: {
        id: studentId,
        role: UserRole.STUDENT
      }
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const body = await request.json()
    const {
      amount,
      currency = 'ARS',
      paymentMethod,
      description,
      packageId,
      status = PaymentStatus.COMPLETED
    } = body

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      )
    }

    if (!['ARS', 'USD'].includes(currency)) {
      return NextResponse.json(
        { error: 'Currency must be ARS or USD' },
        { status: 400 }
      )
    }

    // Verify package exists if provided
    if (packageId) {
      const packageExists = await prisma.package.findUnique({
        where: {
          id: parseInt(packageId),
          userId: studentId
        }
      })

      if (!packageExists) {
        return NextResponse.json(
          { error: 'Package not found for this student' },
          { status: 400 }
        )
      }
    }

    const newPayment = await prisma.payment.create({
      data: {
        amount: parseFloat(amount),
        currency,
        paymentMethod,
        description,
        status: status as PaymentStatus,
        userId: studentId,
        packageId: packageId ? parseInt(packageId) : null,
        paidAt: status === PaymentStatus.COMPLETED ? new Date() : null
      },
      include: {
        package: {
          select: {
            id: true,
            name: true,
            classType: {
              select: {
                name: true,
              }
            }
          }
        }
      }
    })

    const paymentResponse = {
      id: newPayment.id.toString(),
      amount: Number(newPayment.amount),
      currency: newPayment.currency,
      paymentMethod: newPayment.paymentMethod,
      status: newPayment.status,
      description: newPayment.description,
      createdAt: newPayment.createdAt.toISOString(),
      paidAt: newPayment.paidAt?.toISOString(),
      package: newPayment.package ? {
        id: newPayment.package.id.toString(),
        name: newPayment.package.name,
        classType: newPayment.package.classType ? {
          name: newPayment.package.classType.name,
          color: "#3B82F6"
        } : null
      } : null
    }

    return NextResponse.json(paymentResponse, { status: 201 })
  } catch (error) {
    console.error('Student payments POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    )
  }
}