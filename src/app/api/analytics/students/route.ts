import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const timeframe = searchParams.get('timeframe') || '90' // Default to 90 days for meaningful student analytics

    // Calculate date range
    const end = endDate ? new Date(endDate) : new Date()
    const start = startDate ? new Date(startDate) : new Date(Date.now() - parseInt(timeframe) * 24 * 60 * 60 * 1000)

    // Ensure end of day for end date
    end.setHours(23, 59, 59, 999)
    start.setHours(0, 0, 0, 0)

    console.log('Student Analytics Query:', { start, end, timeframe })

    // Get all students with their reservations and packages
    const students = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        status: 'ACTIVE',
      },
      include: {
        reservations: {
          where: {
            createdAt: {
              gte: start,
              lte: end,
            },
          },
          include: {
            class: {
              select: {
                id: true,
                startsAt: true,
                classType: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            package: {
              select: {
                id: true,
                name: true,
                totalCredits: true,
                usedCredits: true,
                status: true,
                classType: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            reservedAt: 'asc',
          },
        },
        packages: {
          include: {
            classType: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    // Calculate attendance analytics for each student
    const studentAnalytics = students.map(student => calculateStudentMetrics(student, start, end))
      .filter(analytics => analytics.totalReservations > 0) // Only include students with activity
      .sort((a, b) => b.totalReservations - a.totalReservations)

    // Calculate overall metrics
    const overallMetrics = calculateOverallMetrics(studentAnalytics)

    // Identify students needing engagement
    const studentsNeedingEngagement = identifyStudentsNeedingEngagement(studentAnalytics)

    // Calculate package completion analytics
    const packageCompletionAnalytics = calculatePackageCompletionAnalytics(students)

    // Get high no-show students
    const highNoShowStudents = studentAnalytics
      .filter(student => student.noShowRate > 20 && student.totalReservations >= 3)
      .sort((a, b) => b.noShowRate - a.noShowRate)
      .slice(0, 10)

    // Get attendance trends
    const attendanceTrends = calculateAttendanceTrends(studentAnalytics, start, end)

    const response = {
      dateRange: { start, end },
      overallMetrics,
      studentAnalytics: studentAnalytics.slice(0, 50), // Limit for performance
      studentsNeedingEngagement,
      highNoShowStudents,
      packageCompletionAnalytics,
      attendanceTrends,
      totalActiveStudents: students.length,
      studentsWithActivity: studentAnalytics.length,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Student analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch student analytics' },
      { status: 500 }
    )
  }
}

function calculateStudentMetrics(student: any, startDate: Date, endDate: Date) {
  const reservations = student.reservations || []

  const totalReservations = reservations.length
  const attendedClasses = reservations.filter(r =>
    r.status === 'CHECKED_IN' || r.status === 'COMPLETED'
  ).length
  const noShows = reservations.filter(r => r.status === 'NO_SHOW').length
  const cancelled = reservations.filter(r => r.status === 'CANCELLED').length

  const attendanceRate = totalReservations > 0 ? (attendedClasses / totalReservations) * 100 : 0
  const noShowRate = totalReservations > 0 ? (noShows / totalReservations) * 100 : 0
  const cancellationRate = totalReservations > 0 ? (cancelled / totalReservations) * 100 : 0

  // Calculate average time between bookings
  const averageTimeBetweenBookings = calculateAverageTimeBetweenBookings(reservations)

  // Calculate booking frequency (bookings per month)
  const daysSinceFirstBooking = reservations.length > 0
    ? Math.max(1, (endDate.getTime() - new Date(reservations[0].reservedAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0
  const bookingFrequency = daysSinceFirstBooking > 0 ? (totalReservations / daysSinceFirstBooking) * 30 : 0

  // Calculate class type preferences
  const classTypeStats = reservations.reduce((acc, reservation) => {
    const classType = reservation.class?.classType?.name || 'Unknown'
    acc[classType] = (acc[classType] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const favoriteClassType = Object.entries(classTypeStats)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None'

  // Calculate engagement score (0-100)
  const engagementScore = calculateEngagementScore({
    attendanceRate,
    noShowRate,
    bookingFrequency,
    totalReservations,
    daysSinceLastBooking: calculateDaysSinceLastBooking(reservations),
  })

  // Get recent activity pattern
  const recentActivity = getRecentActivityPattern(reservations, 30) // Last 30 days

  // Package usage analysis
  const packageUsage = analyzePackageUsage(student.packages)

  return {
    student: {
      id: student.id,
      name: `${student.firstName} ${student.lastName}`,
      email: student.email,
      phone: student.phone,
      registeredAt: student.registeredAt,
    },
    totalReservations,
    attendedClasses,
    noShows,
    cancelled,
    attendanceRate: Math.round(attendanceRate * 10) / 10,
    noShowRate: Math.round(noShowRate * 10) / 10,
    cancellationRate: Math.round(cancellationRate * 10) / 10,
    averageTimeBetweenBookings,
    bookingFrequency: Math.round(bookingFrequency * 10) / 10,
    favoriteClassType,
    classTypeStats,
    engagementScore: Math.round(engagementScore),
    recentActivity,
    packageUsage,
    daysSinceLastBooking: calculateDaysSinceLastBooking(reservations),
    firstBookingDate: reservations.length > 0 ? reservations[0].reservedAt : null,
    lastBookingDate: reservations.length > 0 ? reservations[reservations.length - 1].reservedAt : null,
  }
}

function calculateAverageTimeBetweenBookings(reservations: any[]): number {
  if (reservations.length < 2) return 0

  const sortedReservations = reservations
    .sort((a, b) => new Date(a.reservedAt).getTime() - new Date(b.reservedAt).getTime())

  let totalDays = 0
  for (let i = 1; i < sortedReservations.length; i++) {
    const current = new Date(sortedReservations[i].reservedAt)
    const previous = new Date(sortedReservations[i - 1].reservedAt)
    totalDays += (current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24)
  }

  return Math.round((totalDays / (sortedReservations.length - 1)) * 10) / 10
}

function calculateDaysSinceLastBooking(reservations: any[]): number {
  if (reservations.length === 0) return Infinity

  const lastReservation = reservations
    .sort((a, b) => new Date(b.reservedAt).getTime() - new Date(a.reservedAt).getTime())[0]

  const now = new Date()
  const lastBookingDate = new Date(lastReservation.reservedAt)

  return Math.floor((now.getTime() - lastBookingDate.getTime()) / (1000 * 60 * 60 * 24))
}

function calculateEngagementScore(metrics: {
  attendanceRate: number
  noShowRate: number
  bookingFrequency: number
  totalReservations: number
  daysSinceLastBooking: number
}): number {
  let score = 0

  // Attendance rate (30% weight)
  score += (metrics.attendanceRate / 100) * 30

  // No-show penalty (20% weight)
  score += Math.max(0, (100 - metrics.noShowRate) / 100) * 20

  // Booking frequency (25% weight) - normalized to reasonable range
  const normalizedFrequency = Math.min(metrics.bookingFrequency / 4, 1) // 4 bookings per month = max score
  score += normalizedFrequency * 25

  // Total reservations (15% weight) - more bookings = higher engagement
  const normalizedReservations = Math.min(metrics.totalReservations / 10, 1) // 10 reservations = max score
  score += normalizedReservations * 15

  // Recency (10% weight) - recent activity = higher engagement
  const daysSince = Math.min(metrics.daysSinceLastBooking, 60) // Cap at 60 days
  const recencyScore = Math.max(0, (60 - daysSince) / 60)
  score += recencyScore * 10

  return Math.max(0, Math.min(100, score))
}

function getRecentActivityPattern(reservations: any[], days: number): any {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const recentReservations = reservations.filter(r =>
    new Date(r.reservedAt) >= cutoffDate
  )

  return {
    totalBookings: recentReservations.length,
    attended: recentReservations.filter(r => r.status === 'CHECKED_IN' || r.status === 'COMPLETED').length,
    noShows: recentReservations.filter(r => r.status === 'NO_SHOW').length,
    cancelled: recentReservations.filter(r => r.status === 'CANCELLED').length,
  }
}

function analyzePackageUsage(packages: any[]): any {
  const activePackages = packages.filter(p => p.status === 'ACTIVE')
  const expiredPackages = packages.filter(p => p.status === 'EXPIRED')
  const usedUpPackages = packages.filter(p => p.status === 'USED_UP')

  const totalPackages = packages.length
  const averageCreditsUsed = packages.length > 0
    ? packages.reduce((sum, p) => sum + p.usedCredits, 0) / packages.length
    : 0

  const averageCreditsTotal = packages.length > 0
    ? packages.reduce((sum, p) => sum + p.totalCredits, 0) / packages.length
    : 0

  const completionRate = averageCreditsTotal > 0
    ? (averageCreditsUsed / averageCreditsTotal) * 100
    : 0

  return {
    totalPackages,
    activePackages: activePackages.length,
    expiredPackages: expiredPackages.length,
    usedUpPackages: usedUpPackages.length,
    averageCreditsUsed: Math.round(averageCreditsUsed * 10) / 10,
    averageCreditsTotal: Math.round(averageCreditsTotal * 10) / 10,
    completionRate: Math.round(completionRate * 10) / 10,
  }
}

function calculateOverallMetrics(studentAnalytics: any[]): any {
  if (studentAnalytics.length === 0) {
    return {
      averageAttendanceRate: 0,
      averageNoShowRate: 0,
      averageEngagementScore: 0,
      totalReservations: 0,
      totalAttendedClasses: 0,
      totalNoShows: 0,
      highEngagementStudents: 0,
      lowEngagementStudents: 0,
    }
  }

  const averageAttendanceRate = studentAnalytics.reduce((sum, s) => sum + s.attendanceRate, 0) / studentAnalytics.length
  const averageNoShowRate = studentAnalytics.reduce((sum, s) => sum + s.noShowRate, 0) / studentAnalytics.length
  const averageEngagementScore = studentAnalytics.reduce((sum, s) => sum + s.engagementScore, 0) / studentAnalytics.length

  const totalReservations = studentAnalytics.reduce((sum, s) => sum + s.totalReservations, 0)
  const totalAttendedClasses = studentAnalytics.reduce((sum, s) => sum + s.attendedClasses, 0)
  const totalNoShows = studentAnalytics.reduce((sum, s) => sum + s.noShows, 0)

  const highEngagementStudents = studentAnalytics.filter(s => s.engagementScore >= 70).length
  const lowEngagementStudents = studentAnalytics.filter(s => s.engagementScore < 40).length

  return {
    averageAttendanceRate: Math.round(averageAttendanceRate * 10) / 10,
    averageNoShowRate: Math.round(averageNoShowRate * 10) / 10,
    averageEngagementScore: Math.round(averageEngagementScore),
    totalReservations,
    totalAttendedClasses,
    totalNoShows,
    highEngagementStudents,
    lowEngagementStudents,
  }
}

function identifyStudentsNeedingEngagement(studentAnalytics: any[]): any[] {
  const needsEngagement = studentAnalytics.filter(student => {
    const hasHighNoShow = student.noShowRate > 25
    const hasLowAttendance = student.attendanceRate < 70
    const isInactive = student.daysSinceLastBooking > 30
    const hasLowEngagement = student.engagementScore < 40
    const hasExpiredPackages = student.packageUsage.expiredPackages > 0

    return hasHighNoShow || hasLowAttendance || isInactive || hasLowEngagement || hasExpiredPackages
  })

  return needsEngagement
    .map(student => ({
      ...student,
      engagementFlags: {
        highNoShow: student.noShowRate > 25,
        lowAttendance: student.attendanceRate < 70,
        inactive: student.daysSinceLastBooking > 30,
        lowEngagement: student.engagementScore < 40,
        expiredPackages: student.packageUsage.expiredPackages > 0,
      },
    }))
    .sort((a, b) => a.engagementScore - b.engagementScore)
    .slice(0, 20) // Top 20 students needing engagement
}

function calculatePackageCompletionAnalytics(students: any[]): any {
  const allPackages = students.flatMap(student => student.packages || [])

  if (allPackages.length === 0) {
    return {
      totalPackages: 0,
      completedPackages: 0,
      expiredPackages: 0,
      activePackages: 0,
      averageCompletionRate: 0,
      packagesByClassType: [],
    }
  }

  const totalPackages = allPackages.length
  const completedPackages = allPackages.filter(p => p.status === 'USED_UP').length
  const expiredPackages = allPackages.filter(p => p.status === 'EXPIRED').length
  const activePackages = allPackages.filter(p => p.status === 'ACTIVE').length

  const totalCreditsIssued = allPackages.reduce((sum, p) => sum + p.totalCredits, 0)
  const totalCreditsUsed = allPackages.reduce((sum, p) => sum + p.usedCredits, 0)
  const averageCompletionRate = totalCreditsIssued > 0 ? (totalCreditsUsed / totalCreditsIssued) * 100 : 0

  // Analyze by class type
  const packagesByClassType = allPackages.reduce((acc, pkg) => {
    const classType = pkg.classType?.name || 'Unknown'

    if (!acc[classType]) {
      acc[classType] = {
        classType,
        totalPackages: 0,
        completedPackages: 0,
        expiredPackages: 0,
        totalCredits: 0,
        usedCredits: 0,
        completionRate: 0,
      }
    }

    acc[classType].totalPackages += 1
    acc[classType].totalCredits += pkg.totalCredits
    acc[classType].usedCredits += pkg.usedCredits

    if (pkg.status === 'USED_UP') acc[classType].completedPackages += 1
    if (pkg.status === 'EXPIRED') acc[classType].expiredPackages += 1

    return acc
  }, {} as Record<string, any>)

  // Calculate completion rates
  Object.values(packagesByClassType).forEach((stats: any) => {
    stats.completionRate = stats.totalCredits > 0
      ? Math.round((stats.usedCredits / stats.totalCredits) * 100 * 10) / 10
      : 0
  })

  return {
    totalPackages,
    completedPackages,
    expiredPackages,
    activePackages,
    averageCompletionRate: Math.round(averageCompletionRate * 10) / 10,
    packagesByClassType: Object.values(packagesByClassType),
    creditsIssued: totalCreditsIssued,
    creditsUsed: totalCreditsUsed,
    wasteRate: Math.round(((totalCreditsIssued - totalCreditsUsed) / totalCreditsIssued) * 100 * 10) / 10,
  }
}

function calculateAttendanceTrends(studentAnalytics: any[], startDate: Date, endDate: Date): any {
  // Group students by engagement level
  const highEngagement = studentAnalytics.filter(s => s.engagementScore >= 70)
  const mediumEngagement = studentAnalytics.filter(s => s.engagementScore >= 40 && s.engagementScore < 70)
  const lowEngagement = studentAnalytics.filter(s => s.engagementScore < 40)

  // Analyze trends by time period (monthly)
  const monthlyData = []
  const current = new Date(startDate)

  while (current <= endDate) {
    const monthStart = new Date(current.getFullYear(), current.getMonth(), 1)
    const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0)

    const monthStudents = studentAnalytics.filter(student => {
      const firstBooking = student.firstBookingDate ? new Date(student.firstBookingDate) : null
      return firstBooking && firstBooking >= monthStart && firstBooking <= monthEnd
    })

    monthlyData.push({
      month: current.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
      newStudents: monthStudents.length,
      averageEngagement: monthStudents.length > 0
        ? monthStudents.reduce((sum, s) => sum + s.engagementScore, 0) / monthStudents.length
        : 0,
    })

    current.setMonth(current.getMonth() + 1)
  }

  return {
    engagementDistribution: {
      high: { count: highEngagement.length, percentage: Math.round((highEngagement.length / studentAnalytics.length) * 100) },
      medium: { count: mediumEngagement.length, percentage: Math.round((mediumEngagement.length / studentAnalytics.length) * 100) },
      low: { count: lowEngagement.length, percentage: Math.round((lowEngagement.length / studentAnalytics.length) * 100) },
    },
    monthlyTrends: monthlyData,
    attendanceRateDistribution: calculateDistribution(studentAnalytics.map(s => s.attendanceRate)),
    noShowRateDistribution: calculateDistribution(studentAnalytics.map(s => s.noShowRate)),
  }
}

function calculateDistribution(values: number[]): any {
  if (values.length === 0) return { ranges: [], average: 0 }

  const ranges = [
    { label: '0-20%', min: 0, max: 20, count: 0 },
    { label: '21-40%', min: 21, max: 40, count: 0 },
    { label: '41-60%', min: 41, max: 60, count: 0 },
    { label: '61-80%', min: 61, max: 80, count: 0 },
    { label: '81-100%', min: 81, max: 100, count: 0 },
  ]

  values.forEach(value => {
    const range = ranges.find(r => value >= r.min && value <= r.max)
    if (range) range.count += 1
  })

  const average = values.reduce((sum, val) => sum + val, 0) / values.length

  return {
    ranges: ranges.map(r => ({
      ...r,
      percentage: Math.round((r.count / values.length) * 100),
    })),
    average: Math.round(average * 10) / 10,
  }
}