import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, ReservationStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const registrationType = searchParams.get('registrationType')
    const paymentStatus = searchParams.get('paymentStatus')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Build where clause based on filters
    const where: any = {}

    if (status && status !== 'all') {
      where.status = status as ReservationStatus
    }

    if (registrationType && registrationType !== 'all') {
      if (registrationType === 'null') {
        where.registrationType = null
      } else {
        where.registrationType = registrationType
      }
    }

    // Handle payment status filtering
    if (paymentStatus && paymentStatus !== 'all') {
      if (paymentStatus === 'package') {
        where.packageId = { not: null }
      } else if (paymentStatus === 'pending') {
        where.AND = [
          { packageId: null },
          { paymentDeadline: { not: null } },
          { paymentDeadline: { gte: new Date() } }
        ]
      } else if (paymentStatus === 'expired') {
        where.AND = [
          { packageId: null },
          { paymentDeadline: { not: null } },
          { paymentDeadline: { lt: new Date() } }
        ]
      }
    }

    const [reservations, totalCount] = await Promise.all([
      prisma.reservation.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          },
          class: {
            include: {
              classType: {
                select: {
                  name: true
                }
              },
              location: {
                select: {
                  name: true,
                  address: true
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
          },
          package: {
            select: {
              id: true,
              name: true,
              totalCredits: true,
              usedCredits: true
            }
          }
        },
        orderBy: {
          reservedAt: 'desc'
        },
        skip: offset,
        take: limit
      }),
      prisma.reservation.count({ where })
    ])

    // Calculate summary statistics
    const stats = await prisma.reservation.groupBy({
      by: ['status'],
      _count: true,
      where: {
        // Only count recent reservations for stats
        reservedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    })

    // Calculate payment deadline statistics
    const now = new Date()
    const paymentStats = await prisma.reservation.findMany({
      where: {
        status: ReservationStatus.CONFIRMED,
        NOT: {
          paymentDeadline: null
        },
        packageId: null
      },
      select: {
        paymentDeadline: true
      }
    })

    const paymentSummary = {
      total: paymentStats.length,
      expired: paymentStats.filter(r => r.paymentDeadline && new Date(r.paymentDeadline) < now).length,
      dueIn24h: paymentStats.filter(r => {
        if (!r.paymentDeadline) return false
        const deadline = new Date(r.paymentDeadline)
        const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)
        return hoursLeft > 0 && hoursLeft <= 24
      }).length,
      dueIn48h: paymentStats.filter(r => {
        if (!r.paymentDeadline) return false
        const deadline = new Date(r.paymentDeadline)
        const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)
        return hoursLeft > 24 && hoursLeft <= 48
      }).length
    }

    return NextResponse.json({
      reservations: reservations.map(reservation => ({
        ...reservation,
        id: reservation.id.toString(),
        userId: reservation.userId.toString(),
        classId: reservation.classId.toString(),
        packageId: reservation.packageId?.toString() || null
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      },
      stats: {
        byStatus: stats.reduce((acc, stat) => {
          acc[stat.status] = stat._count
          return acc
        }, {} as Record<string, number>),
        paymentSummary
      }
    })

  } catch (error) {
    console.error('Admin reservations GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reservations' },
      { status: 500 }
    )
  }
}