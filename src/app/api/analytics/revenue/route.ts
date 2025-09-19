import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const timeframe = searchParams.get('timeframe') || '30'

    // Calculate date range
    const end = endDate ? new Date(endDate) : new Date()
    const start = startDate ? new Date(startDate) : new Date(Date.now() - parseInt(timeframe) * 24 * 60 * 60 * 1000)

    // Ensure end of day for end date
    end.setHours(23, 59, 59, 999)
    start.setHours(0, 0, 0, 0)

    console.log('Revenue Analytics Query:', { start, end, timeframe })

    // Get all payments with related data
    const payments = await prisma.payment.findMany({
      where: {
        status: 'COMPLETED',
        paidAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        package: {
          include: {
            classType: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            reservations: {
              include: {
                class: {
                  include: {
                    instructor: {
                      include: {
                        user: {
                          select: {
                            firstName: true,
                            lastName: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        paidAt: 'desc',
      },
    })

    // Get instructors for reference
    const instructors = await prisma.instructor.findMany({
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    // Calculate revenue breakdown by class type
    const revenueByClassType = calculateRevenueByClassType(payments)

    // Calculate revenue by instructor
    const revenueByInstructor = calculateRevenueByInstructor(payments, instructors)

    // Calculate revenue by time slot
    const revenueByTimeSlot = calculateRevenueByTimeSlot(payments)

    // Calculate payment method analysis by class type
    const paymentMethodAnalysis = calculatePaymentMethodAnalysis(payments)

    // Calculate monthly/yearly trends
    const { monthlyTrends, yearlyTrends } = calculateRevenueTrends(payments)

    // Calculate overall metrics
    const overallMetrics = calculateOverallMetrics(payments)

    const response = {
      dateRange: { start, end },
      overallMetrics,
      revenueByClassType,
      revenueByInstructor,
      revenueByTimeSlot,
      paymentMethodAnalysis,
      monthlyTrends,
      yearlyTrends,
      totalPayments: payments.length,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Revenue analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch revenue analytics' },
      { status: 500 }
    )
  }
}

function calculateRevenueByClassType(payments: any[]) {
  const breakdown: Record<string, {
    classType: string
    totalRevenue: number
    totalPayments: number
    averagePayment: number
    percentage: number
  }> = {}

  const totalRevenue = payments.reduce((sum, payment) => sum + Number(payment.amount), 0)

  payments.forEach(payment => {
    const classTypeName = payment.package?.classType?.name || 'Individual Classes'

    if (!breakdown[classTypeName]) {
      breakdown[classTypeName] = {
        classType: classTypeName,
        totalRevenue: 0,
        totalPayments: 0,
        averagePayment: 0,
        percentage: 0,
      }
    }

    breakdown[classTypeName].totalRevenue += Number(payment.amount)
    breakdown[classTypeName].totalPayments += 1
  })

  // Calculate averages and percentages
  Object.values(breakdown).forEach(item => {
    item.averagePayment = item.totalRevenue / item.totalPayments
    item.percentage = totalRevenue > 0 ? (item.totalRevenue / totalRevenue) * 100 : 0
  })

  return Object.values(breakdown).sort((a, b) => b.totalRevenue - a.totalRevenue)
}

function calculateRevenueByInstructor(payments: any[], instructors: any[]) {
  const instructorMap = new Map(
    instructors.map(inst => [
      inst.id,
      `${inst.user.firstName} ${inst.user.lastName}`
    ])
  )

  const breakdown: Record<string, {
    instructor: string
    instructorId: string
    totalRevenue: number
    totalClasses: number
    totalPayments: number
    averageRevenuePerClass: number
    classTypes: Record<string, { revenue: number, classes: number }>
  }> = {}

  payments.forEach(payment => {
    if (!payment.package?.reservations) return

    // Get unique classes from reservations to avoid double counting
    const uniqueClasses = new Map()
    payment.package.reservations.forEach((reservation: any) => {
      if (reservation.class?.instructor) {
        uniqueClasses.set(reservation.class.id, reservation.class)
      }
    })

    uniqueClasses.forEach((classInfo: any) => {
      const instructorId = classInfo.instructor.id
      const instructorName = instructorMap.get(instructorId) || 'Unknown'
      const classTypeName = payment.package?.classType?.name || 'Unknown'

      if (!breakdown[instructorName]) {
        breakdown[instructorName] = {
          instructor: instructorName,
          instructorId: instructorId.toString(),
          totalRevenue: 0,
          totalClasses: 0,
          totalPayments: 0,
          averageRevenuePerClass: 0,
          classTypes: {},
        }
      }

      // Distribute payment amount across classes in the package
      const classCount = uniqueClasses.size
      const revenuePerClass = Number(payment.amount) / classCount

      breakdown[instructorName].totalRevenue += revenuePerClass
      breakdown[instructorName].totalClasses += 1

      if (!breakdown[instructorName].classTypes[classTypeName]) {
        breakdown[instructorName].classTypes[classTypeName] = { revenue: 0, classes: 0 }
      }
      breakdown[instructorName].classTypes[classTypeName].revenue += revenuePerClass
      breakdown[instructorName].classTypes[classTypeName].classes += 1
    })

    // Count unique payments per instructor
    const instructorsInPayment = new Set()
    payment.package?.reservations?.forEach((reservation: any) => {
      if (reservation.class?.instructor) {
        instructorsInPayment.add(reservation.class.instructor.id)
      }
    })
    instructorsInPayment.forEach(instructorId => {
      const instructorName = instructorMap.get(instructorId) || 'Unknown'
      if (breakdown[instructorName]) {
        breakdown[instructorName].totalPayments += 1 / instructorsInPayment.size
      }
    })
  })

  // Calculate averages
  Object.values(breakdown).forEach(item => {
    item.averageRevenuePerClass = item.totalClasses > 0 ? item.totalRevenue / item.totalClasses : 0
  })

  return Object.values(breakdown).sort((a, b) => b.totalRevenue - a.totalRevenue)
}

function calculateRevenueByTimeSlot(payments: any[]) {
  const timeSlots: Record<string, {
    time: string
    totalRevenue: number
    classCount: number
    averageRevenue: number
    paymentCount: number
  }> = {}

  payments.forEach(payment => {
    if (!payment.package?.reservations) return

    payment.package.reservations.forEach((reservation: any) => {
      if (!reservation.class?.startsAt) return

      const date = new Date(reservation.class.startsAt)
      const timeSlot = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })

      if (!timeSlots[timeSlot]) {
        timeSlots[timeSlot] = {
          time: timeSlot,
          totalRevenue: 0,
          classCount: 0,
          averageRevenue: 0,
          paymentCount: 0,
        }
      }

      // Distribute payment across classes in package
      const classesInPackage = payment.package.reservations.length
      const revenuePerClass = Number(payment.amount) / classesInPackage

      timeSlots[timeSlot].totalRevenue += revenuePerClass
      timeSlots[timeSlot].classCount += 1
      timeSlots[timeSlot].paymentCount += 1 / classesInPackage
    })
  })

  // Calculate averages and sort by time
  return Object.values(timeSlots)
    .map(slot => ({
      ...slot,
      averageRevenue: slot.classCount > 0 ? slot.totalRevenue / slot.classCount : 0,
    }))
    .sort((a, b) => a.time.localeCompare(b.time))
}

function calculatePaymentMethodAnalysis(payments: any[]) {
  const byClassType: Record<string, Record<string, {
    count: number
    totalAmount: number
    percentage: number
  }>> = {}

  const overall: Record<string, {
    method: string
    count: number
    totalAmount: number
    percentage: number
  }> = {}

  // Initialize overall tracking
  const paymentMethods = ['CASH_PESOS', 'CASH_USD', 'TRANSFER_TO_MERI_PESOS', 'TRANSFER_TO_MALE_PESOS', 'TRANSFER_IN_USD']
  paymentMethods.forEach(method => {
    overall[method] = {
      method: formatPaymentMethod(method),
      count: 0,
      totalAmount: 0,
      percentage: 0,
    }
  })

  const totalRevenue = payments.reduce((sum, payment) => sum + Number(payment.amount), 0)

  payments.forEach(payment => {
    const classTypeName = payment.package?.classType?.name || 'Individual Classes'
    const method = payment.paymentMethod
    const amount = Number(payment.amount)

    // Track by class type
    if (!byClassType[classTypeName]) {
      byClassType[classTypeName] = {}
      paymentMethods.forEach(pm => {
        byClassType[classTypeName]![pm] = { count: 0, totalAmount: 0, percentage: 0 }
      })
    }

    if (!byClassType[classTypeName]![method]) {
      byClassType[classTypeName]![method] = { count: 0, totalAmount: 0, percentage: 0 }
    }

    byClassType[classTypeName]![method]!.count += 1
    byClassType[classTypeName]![method]!.totalAmount += amount

    // Track overall
    if (!overall[method]) {
      overall[method] = {
        method: formatPaymentMethod(method),
        count: 0,
        totalAmount: 0,
        percentage: 0,
      }
    }
    overall[method]!.count += 1
    overall[method]!.totalAmount += amount
  })

  // Calculate percentages
  Object.values(overall).forEach(item => {
    item.percentage = totalRevenue > 0 ? (item.totalAmount / totalRevenue) * 100 : 0
  })

  Object.keys(byClassType).forEach(classType => {
    const classTypeData = byClassType[classType]
    if (!classTypeData) return

    const classTypeTotal = Object.values(classTypeData).reduce((sum, method) => sum + method.totalAmount, 0)
    Object.values(classTypeData).forEach(method => {
      method.percentage = classTypeTotal > 0 ? (method.totalAmount / classTypeTotal) * 100 : 0
    })
  })

  return {
    overall: Object.values(overall).sort((a, b) => b.totalAmount - a.totalAmount),
    byClassType: Object.keys(byClassType).map(classType => {
      const classTypeData = byClassType[classType]
      if (!classTypeData) return { classType, methods: [] }

      return {
        classType,
        methods: Object.keys(classTypeData).map(method => {
          const methodData = classTypeData[method]
          if (!methodData) return { method: formatPaymentMethod(method), count: 0, totalAmount: 0, percentage: 0 }
          return {
            method: formatPaymentMethod(method),
            ...methodData,
          }
        }).sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0)),
      }
    }),
  }
}

function calculateRevenueTrends(payments: any[]) {
  const monthlyTrends: Record<string, {
    month: string
    year: number
    totalRevenue: number
    paymentCount: number
    intensivoRevenue: number
    recurrenteRevenue: number
    averagePayment: number
  }> = {}

  const yearlyTrends: Record<string, {
    year: number
    totalRevenue: number
    paymentCount: number
    monthlyAverage: number
    growth: number
  }> = {}

  payments.forEach(payment => {
    const date = new Date(payment.paidAt)
    const year = date.getFullYear()
    const month = date.toLocaleString('en-US', { month: 'long' })
    const monthKey = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const amount = Number(payment.amount)
    const classType = payment.package?.classType?.name

    // Monthly trends
    if (!monthlyTrends[monthKey]) {
      monthlyTrends[monthKey] = {
        month: `${month} ${year}`,
        year,
        totalRevenue: 0,
        paymentCount: 0,
        intensivoRevenue: 0,
        recurrenteRevenue: 0,
        averagePayment: 0,
      }
    }

    monthlyTrends[monthKey].totalRevenue += amount
    monthlyTrends[monthKey].paymentCount += 1

    if (classType === 'Intensivo') {
      monthlyTrends[monthKey].intensivoRevenue += amount
    } else if (classType === 'Recurrente') {
      monthlyTrends[monthKey].recurrenteRevenue += amount
    }

    // Yearly trends
    if (!yearlyTrends[year]) {
      yearlyTrends[year] = {
        year,
        totalRevenue: 0,
        paymentCount: 0,
        monthlyAverage: 0,
        growth: 0,
      }
    }

    yearlyTrends[year].totalRevenue += amount
    yearlyTrends[year].paymentCount += 1
  })

  // Calculate averages for monthly trends
  Object.values(monthlyTrends).forEach(trend => {
    trend.averagePayment = trend.paymentCount > 0 ? trend.totalRevenue / trend.paymentCount : 0
  })

  // Calculate yearly averages and growth
  const sortedYears = Object.values(yearlyTrends).sort((a, b) => a.year - b.year)
  sortedYears.forEach((trend, index) => {
    trend.monthlyAverage = trend.totalRevenue / 12
    if (index > 0) {
      const previousYear = sortedYears[index - 1]
      if (previousYear) {
        trend.growth = previousYear.totalRevenue > 0
          ? ((trend.totalRevenue - previousYear.totalRevenue) / previousYear.totalRevenue) * 100
          : 0
      }
    }
  })

  return {
    monthlyTrends: Object.values(monthlyTrends).sort((a, b) => a.month.localeCompare(b.month)),
    yearlyTrends: sortedYears,
  }
}

function calculateOverallMetrics(payments: any[]) {
  const totalRevenue = payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
  const totalPayments = payments.length
  const averagePayment = totalPayments > 0 ? totalRevenue / totalPayments : 0

  // Calculate revenue by currency
  const revenueByCurrency = payments.reduce((acc, payment) => {
    const currency = payment.currency || 'USD'
    acc[currency] = (acc[currency] || 0) + Number(payment.amount)
    return acc
  }, {} as Record<string, number>)

  // Calculate payment method distribution
  const paymentMethodCounts = payments.reduce((acc, payment) => {
    const method = formatPaymentMethod(payment.paymentMethod)
    acc[method] = (acc[method] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const mostPopularPaymentMethod = Object.entries(paymentMethodCounts)
    .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'Unknown'

  return {
    totalRevenue,
    totalPayments,
    averagePayment,
    revenueByCurrency,
    mostPopularPaymentMethod,
    paymentMethodCounts,
  }
}

function formatPaymentMethod(method: string): string {
  const methodMap: Record<string, string> = {
    CASH_PESOS: 'Cash (Pesos)',
    CASH_USD: 'Cash (USD)',
    TRANSFER_TO_MERI_PESOS: 'Transfer to Meri (Pesos)',
    TRANSFER_TO_MALE_PESOS: 'Transfer to Male (Pesos)',
    TRANSFER_IN_USD: 'Transfer (USD)',
  }
  return methodMap[method] || method
}