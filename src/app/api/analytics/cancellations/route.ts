import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, ReservationStatus } from '@prisma/client'

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const timeframe = parseInt(searchParams.get('timeframe') || '30')
    const classId = searchParams.get('classId')
    const studentId = searchParams.get('studentId')

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - timeframe)

    const where: any = {
      status: ReservationStatus.CANCELLED,
      cancelledAt: {
        gte: startDate
      }
    }

    if (classId) where.classId = BigInt(classId)
    if (studentId) where.userId = BigInt(studentId)

    // Get cancelled reservations with details
    const cancelledReservations = await prisma.reservation.findMany({
      where,
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
          select: {
            id: true,
            startsAt: true,
            classType: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        cancelledAt: 'desc'
      }
    })

    // Get total reservations for rate calculation
    const totalReservations = await prisma.reservation.count({
      where: {
        createdAt: {
          gte: startDate
        },
        ...(classId && { classId: BigInt(classId) }),
        ...(studentId && { userId: BigInt(studentId) })
      }
    })

    // Calculate basic stats
    const totalCancellations = cancelledReservations.length
    const cancellationRate = totalReservations > 0 ? (totalCancellations / totalReservations) * 100 : 0

    // Analyze cancellation reasons
    const reasonBreakdown = cancelledReservations.reduce((acc, reservation) => {
      const reason = reservation.cancellationReason || 'UNKNOWN'
      if (!acc[reason]) {
        acc[reason] = { count: 0, category: getCategoryForReason(reason) }
      }
      acc[reason].count++
      return acc
    }, {} as Record<string, { count: number; category: string }>)

    const reasonBreakdownArray = Object.entries(reasonBreakdown).map(([reason, data]) => ({
      reason,
      count: data.count,
      percentage: (data.count / totalCancellations) * 100,
      category: data.category
    })).sort((a, b) => b.count - a.count)

    // Analyze student patterns
    const studentPatterns = cancelledReservations.reduce((acc, reservation) => {
      const studentId = reservation.user.id.toString()
      if (!acc[studentId]) {
        acc[studentId] = {
          studentId,
          studentName: `${reservation.user.firstName} ${reservation.user.lastName}`,
          studentEmail: reservation.user.email,
          cancellationCount: 0,
          lastCancellation: reservation.cancelledAt,
          reasonPattern: []
        }
      }
      acc[studentId].cancellationCount++
      if (reservation.cancelledAt! > acc[studentId].lastCancellation!) {
        acc[studentId].lastCancellation = reservation.cancelledAt
      }
      if (reservation.cancellationReason) {
        acc[studentId].reasonPattern.push(reservation.cancellationReason)
      }
      return acc
    }, {} as Record<string, any>)

    const studentPatternsArray = Object.values(studentPatterns).map((student: any) => ({
      ...student,
      lastCancellation: student.lastCancellation?.toISOString(),
      reasonPattern: [...new Set(student.reasonPattern)] // Remove duplicates
    }))

    // Analyze timing patterns
    const timePatterns = cancelledReservations.reduce((acc, reservation) => {
      const classStart = new Date(reservation.class.startsAt)
      const cancelledAt = new Date(reservation.cancelledAt!)
      const hoursBeforeClass = Math.max(0, Math.floor((classStart.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60)))

      const timeRange = getTimeRange(hoursBeforeClass)
      if (!acc[timeRange]) {
        acc[timeRange] = { count: 0, creditsRestored: 0 }
      }
      acc[timeRange].count++
      // Assume credits restored if cancellation was more than 24 hours before or had admin override
      if (hoursBeforeClass >= 24) {
        acc[timeRange].creditsRestored++
      }
      return acc
    }, {} as Record<string, { count: number; creditsRestored: number }>)

    const timePatternsArray = Object.entries(timePatterns).map(([hoursBeforeClass, data]) => ({
      hoursBeforeClass,
      count: data.count,
      percentage: (data.count / totalCancellations) * 100,
      creditsRestored: data.creditsRestored
    })).sort((a, b) => parseInt(a.hoursBeforeClass) - parseInt(b.hoursBeforeClass))

    // Calculate monthly trends (simplified for now)
    const monthlyTrends = [
      { month: 'Current', cancellations: totalCancellations, rate: cancellationRate }
    ]

    return NextResponse.json({
      totalCancellations,
      cancellationRate,
      reasonBreakdown: reasonBreakdownArray,
      studentPatterns: studentPatternsArray,
      timePatterns: timePatternsArray,
      monthlyTrends
    })

  } catch (error) {
    console.error('Cancellation analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cancellation analytics' },
      { status: 500 }
    )
  }
}

function getCategoryForReason(reason: string): string {
  const categoryMap: Record<string, string> = {
    'STUDENT_SICK': 'health',
    'STUDENT_EMERGENCY': 'emergency',
    'STUDENT_REQUEST': 'request',
    'STUDIO_CLOSED': 'studio',
    'INSTRUCTOR_UNAVAILABLE': 'studio',
    'WEATHER_CONDITIONS': 'external',
    'EQUIPMENT_FAILURE': 'studio',
    'DOUBLE_BOOKING': 'admin',
    'ADMIN_OVERRIDE': 'admin',
    'OTHER': 'other'
  }
  return categoryMap[reason] || 'other'
}

function getTimeRange(hours: number): string {
  if (hours < 1) return '0'
  if (hours < 4) return '1-3'
  if (hours < 12) return '4-11'
  if (hours < 24) return '12-23'
  if (hours < 48) return '24-47'
  if (hours < 168) return '48+'
  return '168+'
}