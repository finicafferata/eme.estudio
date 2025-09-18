import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, PaymentStatus } from '@prisma/client'

// EME Studio Payment Methods
const PAYMENT_METHODS = {
  cash_pesos: {
    name: 'Cash Pesos',
    displayName: 'Efectivo Pesos',
    currency: 'ARS'
  },
  cash_usd: {
    name: 'Cash USD',
    displayName: 'Efectivo USD',
    currency: 'USD'
  },
  transfer_meri_pesos: {
    name: 'Transfer to Meri Pesos',
    displayName: 'Transferencia a Meri Pesos',
    currency: 'ARS'
  },
  transfer_male_pesos: {
    name: 'Transfer to Male Pesos',
    displayName: 'Transferencia a Male Pesos',
    currency: 'ARS'
  },
  transfer_usd: {
    name: 'Transfer in USD',
    displayName: 'Transferencia USD',
    currency: 'USD'
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current date info for filtering
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    // Get all completed payments
    const allCompletedPayments = await prisma.payment.findMany({
      where: {
        status: PaymentStatus.COMPLETED
      },
      select: {
        amount: true,
        currency: true,
        paymentMethod: true,
        paidAt: true
      }
    })

    // Get this month's payments
    const thisMonthPayments = allCompletedPayments.filter(payment =>
      payment.paidAt &&
      payment.paidAt >= startOfMonth &&
      payment.paidAt <= endOfMonth
    )

    // Get this year's payments
    const thisYearPayments = allCompletedPayments.filter(payment =>
      payment.paidAt &&
      payment.paidAt >= startOfYear &&
      payment.paidAt <= endOfYear
    )

    // Get last month's payments for comparison
    const lastMonthPayments = allCompletedPayments.filter(payment =>
      payment.paidAt &&
      payment.paidAt >= startOfLastMonth &&
      payment.paidAt <= endOfLastMonth
    )

    // Calculate totals
    const usdToArsRate = 1200 // 1 USD = 1200 ARS (approximate)

    // Total revenue in pesos
    const totalRevenuePesos = allCompletedPayments.reduce((sum, payment) => {
      if (payment.currency === 'USD') {
        return sum + (Number(payment.amount) * usdToArsRate)
      }
      return sum + Number(payment.amount)
    }, 0)

    // Total revenue in USD
    const totalRevenueUSD = allCompletedPayments.reduce((sum, payment) => {
      if (payment.currency === 'USD') {
        return sum + Number(payment.amount)
      }
      return sum + (Number(payment.amount) / usdToArsRate)
    }, 0)

    // This month revenue
    const thisMonthRevenuePesos = thisMonthPayments.reduce((sum, payment) => {
      if (payment.currency === 'USD') {
        return sum + (Number(payment.amount) * usdToArsRate)
      }
      return sum + Number(payment.amount)
    }, 0)

    const thisMonthRevenueUSD = thisMonthPayments.reduce((sum, payment) => {
      if (payment.currency === 'USD') {
        return sum + Number(payment.amount)
      }
      return sum + (Number(payment.amount) / usdToArsRate)
    }, 0)

    // This year revenue
    const thisYearRevenuePesos = thisYearPayments.reduce((sum, payment) => {
      if (payment.currency === 'USD') {
        return sum + (Number(payment.amount) * usdToArsRate)
      }
      return sum + Number(payment.amount)
    }, 0)

    const thisYearRevenueUSD = thisYearPayments.reduce((sum, payment) => {
      if (payment.currency === 'USD') {
        return sum + Number(payment.amount)
      }
      return sum + (Number(payment.amount) / usdToArsRate)
    }, 0)

    // Last month revenue for growth calculation
    const lastMonthRevenuePesos = lastMonthPayments.reduce((sum, payment) => {
      if (payment.currency === 'USD') {
        return sum + (Number(payment.amount) * usdToArsRate)
      }
      return sum + Number(payment.amount)
    }, 0)

    // Calculate growth
    const monthlyGrowth = lastMonthRevenuePesos > 0
      ? ((thisMonthRevenuePesos - lastMonthRevenuePesos) / lastMonthRevenuePesos) * 100
      : 0

    // Payment method breakdown
    const paymentMethodBreakdown = Object.keys(PAYMENT_METHODS).map(methodKey => {
      const methodInfo = PAYMENT_METHODS[methodKey as keyof typeof PAYMENT_METHODS]
      const methodPayments = allCompletedPayments.filter(p => p.paymentMethod === methodKey)

      const totalAmount = methodPayments.reduce((sum, payment) => {
        return sum + Number(payment.amount)
      }, 0)

      const thisMonthAmount = thisMonthPayments
        .filter(p => p.paymentMethod === methodKey)
        .reduce((sum, payment) => sum + Number(payment.amount), 0)

      return {
        method: methodKey,
        methodInfo,
        count: methodPayments.length,
        totalAmount,
        thisMonthAmount,
        thisMonthCount: thisMonthPayments.filter(p => p.paymentMethod === methodKey).length
      }
    })

    // Get pending payments
    const pendingPayments = await prisma.payment.findMany({
      where: {
        status: PaymentStatus.PENDING
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
          select: {
            name: true,
            price: true
          }
        }
      }
    })

    const pendingPaymentsSummary = {
      count: pendingPayments.length,
      totalAmount: pendingPayments.reduce((sum, payment) => sum + Number(payment.amount), 0),
      payments: pendingPayments.map(payment => ({
        id: payment.id.toString(),
        amount: Number(payment.amount),
        currency: payment.currency,
        studentName: `${payment.user.firstName} ${payment.user.lastName}`,
        packageName: payment.package?.name,
        createdAt: payment.createdAt.toISOString()
      }))
    }

    // Monthly revenue trend (last 6 months)
    const monthlyTrends = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)

      const monthPayments = allCompletedPayments.filter(payment =>
        payment.paidAt &&
        payment.paidAt >= monthStart &&
        payment.paidAt <= monthEnd
      )

      const monthRevenuePesos = monthPayments.reduce((sum, payment) => {
        if (payment.currency === 'USD') {
          return sum + (Number(payment.amount) * usdToArsRate)
        }
        return sum + Number(payment.amount)
      }, 0)

      const monthRevenueUSD = monthPayments.reduce((sum, payment) => {
        if (payment.currency === 'USD') {
          return sum + Number(payment.amount)
        }
        return sum + (Number(payment.amount) / usdToArsRate)
      }, 0)

      monthlyTrends.push({
        month: monthStart.toLocaleDateString('es-AR', { year: 'numeric', month: 'short' }),
        revenuePesos: Math.round(monthRevenuePesos),
        revenueUSD: Math.round(monthRevenueUSD),
        paymentCount: monthPayments.length
      })
    }

    const overview = {
      totals: {
        revenuePesos: Math.round(totalRevenuePesos),
        revenueUSD: Math.round(totalRevenueUSD),
        thisMonthPesos: Math.round(thisMonthRevenuePesos),
        thisMonthUSD: Math.round(thisMonthRevenueUSD),
        thisYearPesos: Math.round(thisYearRevenuePesos),
        thisYearUSD: Math.round(thisYearRevenueUSD),
        monthlyGrowth: Math.round(monthlyGrowth * 100) / 100
      },
      paymentMethods: paymentMethodBreakdown,
      pendingPayments: pendingPaymentsSummary,
      monthlyTrends,
      summary: {
        totalPayments: allCompletedPayments.length,
        thisMonthPayments: thisMonthPayments.length,
        thisYearPayments: thisYearPayments.length,
        averagePaymentAmount: allCompletedPayments.length > 0
          ? Math.round(totalRevenuePesos / allCompletedPayments.length)
          : 0
      }
    }

    return NextResponse.json(overview)
  } catch (error) {
    console.error('Payment overview error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment overview' },
      { status: 500 }
    )
  }
}