import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, ReservationStatus, PaymentStatus } from '@prisma/client'

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const classTypeId = searchParams.get('classTypeId')

    // Default to last 30 days if no date range provided
    const end = endDate ? new Date(endDate) : new Date()
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Get all classes in the date range
    const classes = await prisma.class.findMany({
      where: {
        startsAt: {
          gte: start,
          lte: end
        },
        ...(classTypeId && { classTypeId: parseInt(classTypeId) })
      },
      include: {
        classType: true,
        location: true,
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
        reservations: {
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
              select: {
                id: true,
                name: true,
                price: true
              }
            }
          }
        },
        waitlist: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    })

    // Calculate time slot utilization
    const timeSlotUtilization = calculateTimeSlotUtilization(classes)

    // Calculate day of week patterns
    const dayOfWeekPatterns = calculateDayOfWeekPatterns(classes)

    // Calculate instructor performance
    const instructorPerformance = calculateInstructorPerformance(classes)

    // Calculate no-show statistics
    const noShowStats = await calculateNoShowStats(start, end)

    // Calculate revenue metrics
    const revenueMetrics = calculateRevenueMetrics(classes)

    // Calculate overall metrics
    const overallMetrics = calculateOverallMetrics(classes)

    // Get trending information
    const trends = await calculateTrends(start, end)

    return NextResponse.json({
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
        days: Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      },
      overallMetrics,
      timeSlotUtilization,
      dayOfWeekPatterns,
      instructorPerformance,
      noShowStats,
      revenueMetrics,
      trends,
      rawData: {
        totalClasses: classes.length,
        classDetails: classes.map(c => ({
          id: c.id.toString(),
          date: c.startsAt.toISOString(),
          type: c.classType.name,
          capacity: c.capacity,
          booked: c.reservations.filter(r =>
            r.status === ReservationStatus.CONFIRMED ||
            r.status === ReservationStatus.CHECKED_IN
          ).length,
          waitlisted: c.waitlist.length
        }))
      }
    })

  } catch (error) {
    console.error('Class utilization analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch utilization analytics' },
      { status: 500 }
    )
  }
}

function calculateTimeSlotUtilization(classes: any[]) {
  const slots: Record<string, {
    totalClasses: number
    totalCapacity: number
    totalBooked: number
    totalRevenue: number
    averageUtilization: number
    classes: any[]
  }> = {}

  classes.forEach(classItem => {
    const hour = new Date(classItem.startsAt).getHours()
    const minute = new Date(classItem.startsAt).getMinutes()
    const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`

    if (!slots[timeSlot]) {
      slots[timeSlot] = {
        totalClasses: 0,
        totalCapacity: 0,
        totalBooked: 0,
        totalRevenue: 0,
        averageUtilization: 0,
        classes: []
      }
    }

    const confirmedReservations = classItem.reservations.filter((r: any) =>
      r.status === ReservationStatus.CONFIRMED ||
      r.status === ReservationStatus.CHECKED_IN
    )

    const revenue = confirmedReservations.reduce((sum: number, r: any) => {
      if (r.package?.price) {
        // Estimate revenue per class (package price / estimated classes per package)
        return sum + (Number(r.package.price) / 4) // Assuming 4 classes per package average
      }
      return sum
    }, 0)

    slots[timeSlot].totalClasses++
    slots[timeSlot].totalCapacity += classItem.capacity
    slots[timeSlot].totalBooked += confirmedReservations.length
    slots[timeSlot].totalRevenue += revenue
    slots[timeSlot].classes.push({
      id: classItem.id.toString(),
      date: classItem.startsAt,
      type: classItem.classType.name,
      utilization: (confirmedReservations.length / classItem.capacity) * 100
    })
  })

  // Calculate averages
  Object.keys(slots).forEach(timeSlot => {
    const slot = slots[timeSlot]
    if (slot) {
      slot.averageUtilization = slot.totalCapacity > 0
        ? (slot.totalBooked / slot.totalCapacity) * 100
        : 0
    }
  })

  // Sort by time
  const sortedSlots = Object.entries(slots)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, data]) => ({
      time,
      ...data,
      averageRevenue: data.totalRevenue / data.totalClasses
    }))

  return sortedSlots
}

function calculateDayOfWeekPatterns(classes: any[]) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const patterns: Record<string, {
    totalClasses: number
    totalCapacity: number
    totalBooked: number
    averageUtilization: number
    popularTimes: Record<string, number>
  }> = {}

  days.forEach(day => {
    patterns[day] = {
      totalClasses: 0,
      totalCapacity: 0,
      totalBooked: 0,
      averageUtilization: 0,
      popularTimes: {}
    }
  })

  classes.forEach(classItem => {
    const dayOfWeek = days[new Date(classItem.startsAt).getDay()]
    if (!dayOfWeek) return // Skip if invalid day

    const hour = new Date(classItem.startsAt).getHours()
    const timeSlot = `${hour.toString().padStart(2, '0')}:00`

    const confirmedReservations = classItem.reservations.filter((r: any) =>
      r.status === ReservationStatus.CONFIRMED ||
      r.status === ReservationStatus.CHECKED_IN
    )

    patterns[dayOfWeek]!.totalClasses++
    patterns[dayOfWeek]!.totalCapacity += classItem.capacity
    patterns[dayOfWeek]!.totalBooked += confirmedReservations.length

    if (!patterns[dayOfWeek]!.popularTimes[timeSlot]) {
      patterns[dayOfWeek]!.popularTimes[timeSlot] = 0
    }
    patterns[dayOfWeek]!.popularTimes[timeSlot] += confirmedReservations.length
  })

  // Calculate averages and find most popular times
  Object.keys(patterns).forEach(day => {
    const pattern = patterns[day]
    if (pattern) {
      pattern.averageUtilization = pattern.totalCapacity > 0
        ? (pattern.totalBooked / pattern.totalCapacity) * 100
        : 0
    }
  })

  return Object.entries(patterns).map(([day, data]) => ({
    day,
    ...data,
    mostPopularTime: Object.entries(data.popularTimes).sort(([,a], [,b]) => b - a)[0]?.[0] || null
  }))
}

function calculateInstructorPerformance(classes: any[]) {
  const instructors: Record<string, {
    name: string
    totalClasses: number
    totalCapacity: number
    totalBooked: number
    averageUtilization: number
    totalRevenue: number
    noShows: number
  }> = {}

  classes.forEach(classItem => {
    if (!classItem.instructor) return

    const instructorName = `${classItem.instructor.user.firstName} ${classItem.instructor.user.lastName}`
    const instructorId = classItem.instructor.id.toString()

    if (!instructors[instructorId]) {
      instructors[instructorId] = {
        name: instructorName,
        totalClasses: 0,
        totalCapacity: 0,
        totalBooked: 0,
        averageUtilization: 0,
        totalRevenue: 0,
        noShows: 0
      }
    }

    const confirmedReservations = classItem.reservations.filter((r: any) =>
      r.status === ReservationStatus.CONFIRMED ||
      r.status === ReservationStatus.CHECKED_IN
    )

    const noShows = classItem.reservations.filter((r: any) =>
      r.status === ReservationStatus.NO_SHOW
    ).length

    const revenue = confirmedReservations.reduce((sum: number, r: any) => {
      if (r.package?.price) {
        return sum + (Number(r.package.price) / 4) // Estimated revenue per class
      }
      return sum
    }, 0)

    instructors[instructorId].totalClasses++
    instructors[instructorId].totalCapacity += classItem.capacity
    instructors[instructorId].totalBooked += confirmedReservations.length
    instructors[instructorId].noShows += noShows
    instructors[instructorId].totalRevenue += revenue
  })

  // Calculate averages
  Object.keys(instructors).forEach(id => {
    const instructor = instructors[id]
    if (instructor) {
      instructor.averageUtilization = instructor.totalCapacity > 0
        ? (instructor.totalBooked / instructor.totalCapacity) * 100
        : 0
    }
  })

  return Object.entries(instructors)
    .map(([id, data]) => ({
      id,
      ...data,
      averageRevenue: data.totalRevenue / data.totalClasses
    }))
    .sort((a, b) => b.averageUtilization - a.averageUtilization)
}

async function calculateNoShowStats(startDate: Date, endDate: Date) {
  // Get no-show reservations
  const noShowReservations = await prisma.reservation.findMany({
    where: {
      status: ReservationStatus.NO_SHOW,
      class: {
        startsAt: {
          gte: startDate,
          lte: endDate
        }
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
      },
      class: {
        include: {
          classType: true
        }
      }
    }
  })

  // Group no-shows by student
  const studentNoShows: Record<string, {
    student: any
    count: number
    classes: any[]
  }> = {}

  noShowReservations.forEach(reservation => {
    const studentId = reservation.user.id.toString()

    if (!studentNoShows[studentId]) {
      studentNoShows[studentId] = {
        student: {
          id: studentId,
          name: `${reservation.user.firstName} ${reservation.user.lastName}`,
          email: reservation.user.email
        },
        count: 0,
        classes: []
      }
    }

    studentNoShows[studentId].count++
    studentNoShows[studentId].classes.push({
      date: reservation.class.startsAt,
      type: reservation.class.classType.name
    })
  })

  // Group no-shows by time slot
  const timeSlotNoShows: Record<string, number> = {}

  noShowReservations.forEach(reservation => {
    const hour = new Date(reservation.class.startsAt).getHours()
    const timeSlot = `${hour.toString().padStart(2, '0')}:00`

    if (!timeSlotNoShows[timeSlot]) {
      timeSlotNoShows[timeSlot] = 0
    }
    timeSlotNoShows[timeSlot]++
  })

  // Get total reservations for calculating rates
  const totalReservations = await prisma.reservation.count({
    where: {
      class: {
        startsAt: {
          gte: startDate,
          lte: endDate
        }
      }
    }
  })

  return {
    totalNoShows: noShowReservations.length,
    noShowRate: totalReservations > 0
      ? (noShowReservations.length / totalReservations) * 100
      : 0,
    byStudent: Object.values(studentNoShows).sort((a, b) => b.count - a.count),
    byTimeSlot: Object.entries(timeSlotNoShows)
      .map(([time, count]) => ({ time, count }))
      .sort((a, b) => b.count - a.count)
  }
}

function calculateRevenueMetrics(classes: any[]) {
  let totalRevenue = 0
  let classesWithRevenue = 0

  const revenueByType: Record<string, number> = {}
  const revenueByTimeSlot: Record<string, number> = {}
  const revenueByDay: Record<string, number> = {}

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  classes.forEach(classItem => {
    const confirmedReservations = classItem.reservations.filter((r: any) =>
      r.status === ReservationStatus.CONFIRMED ||
      r.status === ReservationStatus.CHECKED_IN
    )

    const classRevenue = confirmedReservations.reduce((sum: number, r: any) => {
      if (r.package?.price) {
        return sum + (Number(r.package.price) / 4) // Estimated revenue per class
      }
      return sum
    }, 0)

    if (classRevenue > 0) {
      classesWithRevenue++
      totalRevenue += classRevenue

      // By type
      const type = classItem.classType.name
      if (!revenueByType[type]) revenueByType[type] = 0
      revenueByType[type] += classRevenue

      // By time slot
      const hour = new Date(classItem.startsAt).getHours()
      const timeSlot = `${hour.toString().padStart(2, '0')}:00`
      if (!revenueByTimeSlot[timeSlot]) revenueByTimeSlot[timeSlot] = 0
      revenueByTimeSlot[timeSlot] += classRevenue

      // By day of week
      const dayOfWeek = days[new Date(classItem.startsAt).getDay()]
      if (dayOfWeek) {
        if (!revenueByDay[dayOfWeek]) revenueByDay[dayOfWeek] = 0
        revenueByDay[dayOfWeek] += classRevenue
      }
    }
  })

  return {
    totalRevenue,
    averageRevenuePerClass: classesWithRevenue > 0 ? totalRevenue / classesWithRevenue : 0,
    byType: Object.entries(revenueByType).map(([type, revenue]) => ({ type, revenue })),
    byTimeSlot: Object.entries(revenueByTimeSlot)
      .map(([time, revenue]) => ({ time, revenue }))
      .sort((a, b) => a.time.localeCompare(b.time)),
    byDayOfWeek: Object.entries(revenueByDay).map(([day, revenue]) => ({ day, revenue }))
  }
}

function calculateOverallMetrics(classes: any[]) {
  let totalCapacity = 0
  let totalBooked = 0
  let totalWaitlisted = 0
  let fullClasses = 0
  let emptyClasses = 0

  classes.forEach(classItem => {
    const confirmedReservations = classItem.reservations.filter((r: any) =>
      r.status === ReservationStatus.CONFIRMED ||
      r.status === ReservationStatus.CHECKED_IN
    )

    totalCapacity += classItem.capacity
    totalBooked += confirmedReservations.length
    totalWaitlisted += classItem.waitlist.length

    if (confirmedReservations.length >= classItem.capacity) {
      fullClasses++
    }
    if (confirmedReservations.length === 0) {
      emptyClasses++
    }
  })

  return {
    totalClasses: classes.length,
    totalCapacity,
    totalBooked,
    totalWaitlisted,
    averageUtilization: totalCapacity > 0 ? (totalBooked / totalCapacity) * 100 : 0,
    fullClasses,
    emptyClasses,
    fullClassRate: classes.length > 0 ? (fullClasses / classes.length) * 100 : 0,
    emptyClassRate: classes.length > 0 ? (emptyClasses / classes.length) * 100 : 0
  }
}

async function calculateTrends(startDate: Date, endDate: Date) {
  // Get previous period data for comparison
  const periodLength = endDate.getTime() - startDate.getTime()
  const previousStart = new Date(startDate.getTime() - periodLength)
  const previousEnd = new Date(startDate.getTime())

  const currentClasses = await prisma.class.count({
    where: {
      startsAt: {
        gte: startDate,
        lte: endDate
      }
    }
  })

  const previousClasses = await prisma.class.count({
    where: {
      startsAt: {
        gte: previousStart,
        lte: previousEnd
      }
    }
  })

  const currentReservations = await prisma.reservation.count({
    where: {
      class: {
        startsAt: {
          gte: startDate,
          lte: endDate
        }
      },
      status: {
        in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN]
      }
    }
  })

  const previousReservations = await prisma.reservation.count({
    where: {
      class: {
        startsAt: {
          gte: previousStart,
          lte: previousEnd
        }
      },
      status: {
        in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN]
      }
    }
  })

  return {
    classGrowth: previousClasses > 0
      ? ((currentClasses - previousClasses) / previousClasses) * 100
      : 0,
    bookingGrowth: previousReservations > 0
      ? ((currentReservations - previousReservations) / previousReservations) * 100
      : 0,
    utilizationTrend: currentClasses > 0 && previousClasses > 0
      ? ((currentReservations / currentClasses) - (previousReservations / previousClasses)) * 100
      : 0
  }
}