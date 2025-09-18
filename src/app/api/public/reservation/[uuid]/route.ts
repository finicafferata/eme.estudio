import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ uuid: string }> }
) {
  try {
    const params = await context.params
    const { uuid } = params

    if (!uuid) {
      return NextResponse.json(
        { error: 'Reservation UUID is required' },
        { status: 400 }
      )
    }

    // Find reservation by UUID
    const reservation = await prisma.reservation.findUnique({
      where: { uuid },
      include: {
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
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            status: true
          }
        }
      }
    })

    if (!reservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      )
    }

    // Find the related payment
    const payment = await prisma.payment.findFirst({
      where: {
        userId: reservation.userId,
        metadata: {
          path: ['reservationId'],
          equals: reservation.id.toString()
        }
      },
      select: {
        amount: true,
        currency: true,
        paymentMethod: true,
        status: true
      }
    })

    // Fetch user's packages and calculate available credits
    const userPackages = await prisma.package.findMany({
      where: {
        userId: reservation.userId,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        name: true,
        totalCredits: true,
        usedCredits: true,
        expiresAt: true,
        status: true
      },
      orderBy: {
        expiresAt: 'asc' // Show packages expiring soonest first
      }
    })

    // Calculate total available credits
    const totalAvailableCredits = userPackages.reduce((total, pkg) => {
      return total + (pkg.totalCredits - pkg.usedCredits)
    }, 0)

    // Find the next expiring package
    const nextExpiration = userPackages.length > 0 && userPackages[0].expiresAt
      ? userPackages[0].expiresAt
      : null

    // Format response
    const responseData = {
      id: reservation.id.toString(),
      uuid: reservation.uuid,
      status: reservation.status,
      frameSize: reservation.frameSize,
      class: {
        id: reservation.class.id.toString(),
        name: reservation.class.classType.name,
        startsAt: reservation.class.startsAt.toISOString(),
        endsAt: reservation.class.endsAt.toISOString(),
        location: {
          name: reservation.class.location.name,
          address: reservation.class.location.address
        },
        instructor: reservation.class.instructor ? {
          name: `${reservation.class.instructor.user.firstName} ${reservation.class.instructor.user.lastName}`
        } : null
      },
      user: {
        firstName: reservation.user.firstName,
        lastName: reservation.user.lastName,
        email: reservation.user.email,
        needsActivation: reservation.user.status === 'PENDING_ACTIVATION'
      },
      payment: payment ? {
        amount: Number(payment.amount),
        currency: payment.currency,
        method: payment.paymentMethod,
        status: payment.status
      } : {
        amount: 0,
        currency: 'USD',
        method: 'CASH_USD',
        status: 'PENDING'
      },
      credits: {
        totalAvailable: totalAvailableCredits,
        packages: userPackages.map(pkg => ({
          id: pkg.id.toString(),
          name: pkg.name,
          totalCredits: pkg.totalCredits,
          usedCredits: pkg.usedCredits,
          remainingCredits: pkg.totalCredits - pkg.usedCredits,
          expiresAt: pkg.expiresAt ? pkg.expiresAt.toISOString() : null
        })),
        nextExpiration: nextExpiration ? nextExpiration.toISOString() : null,
        hasPackages: userPackages.length > 0
      },
      nextSteps: {
        checkEmail: true,
        arriveEarly: true,
        activateAccount: reservation.user.status === 'PENDING_ACTIVATION'
      }
    }

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('Reservation fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reservation details' },
      { status: 500 }
    )
  }
}