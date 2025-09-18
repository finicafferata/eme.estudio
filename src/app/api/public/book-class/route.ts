import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UserStatus, UserRole, ReservationStatus, PaymentStatus, PaymentMethod, FrameSize } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

interface GuestBookingRequest {
  classId: string
  email: string
  firstName: string
  lastName: string
  frameSize: FrameSize
  paymentMethod: PaymentMethod
}

export async function POST(request: NextRequest) {
  try {
    const body: GuestBookingRequest = await request.json()
    const { classId, email, firstName, lastName, frameSize, paymentMethod } = body

    // Input validation
    if (!classId || !email || !firstName || !lastName || !frameSize || !paymentMethod) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Get class details and check availability
    const classItem = await prisma.class.findUnique({
      where: { id: BigInt(classId) },
      include: {
        classType: {
          select: {
            name: true,
            defaultPrice: true
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
        },
        reservations: {
          where: {
            status: {
              in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN]
            }
          },
          select: {
            id: true,
            userId: true,
            frameSize: true,
            status: true
          }
        }
      }
    })

    if (!classItem) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      )
    }

    // Check frame-specific availability
    const frameReservations = {
      SMALL: classItem.reservations.filter(r => r.frameSize === 'SMALL').length,
      MEDIUM: classItem.reservations.filter(r => r.frameSize === 'MEDIUM').length,
      LARGE: classItem.reservations.filter(r => r.frameSize === 'LARGE').length
    }

    const frameCapacities = {
      SMALL: classItem.smallFrameCapacity || 2,
      MEDIUM: classItem.mediumFrameCapacity || 3,
      LARGE: classItem.largeFrameCapacity || 1
    }

    const frameAvailable = frameCapacities[frameSize] - frameReservations[frameSize]

    if (frameAvailable <= 0) {
      return NextResponse.json(
        { error: `No ${frameSize.toLowerCase()} frames available. Try a different frame size.` },
        { status: 400 }
      )
    }

    // Check overall class capacity
    const totalReservations = classItem.reservations.length
    const totalCapacity = frameCapacities.SMALL + frameCapacities.MEDIUM + frameCapacities.LARGE

    if (totalReservations >= totalCapacity) {
      return NextResponse.json(
        { error: 'Class is full' },
        { status: 400 }
      )
    }

    // Check if class is in the future
    if (new Date(classItem.startsAt) <= new Date()) {
      return NextResponse.json(
        { error: 'Cannot book past classes' },
        { status: 400 }
      )
    }

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    let userCreated = false

    if (!user) {
      // Create new user with PENDING_ACTIVATION status
      const activationToken = randomBytes(32).toString('hex')
      const activationTokenExpiresAt = new Date()
      activationTokenExpiresAt.setDate(activationTokenExpiresAt.getDate() + 30) // 30 days

      // Generate a temporary password (user will need to activate account to set real password)
      const tempPassword = randomBytes(16).toString('hex')
      const passwordHash = await bcrypt.hash(tempPassword, 12)

      user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          firstName,
          lastName,
          passwordHash,
          role: UserRole.STUDENT,
          status: UserStatus.PENDING_ACTIVATION,
          activationToken,
          activationTokenExpiresAt,
          metadata: {
            createdVia: 'guest-booking',
            tempPassword // Store temp password for potential admin access
          }
        }
      })

      userCreated = true
    } else {
      // Check if user already has a reservation for this class
      const existingReservation = await prisma.reservation.findUnique({
        where: {
          userId_classId: {
            userId: user.id,
            classId: BigInt(classId)
          }
        }
      })

      if (existingReservation) {
        return NextResponse.json(
          { error: 'You already have a reservation for this class' },
          { status: 400 }
        )
      }
    }

    // Create the reservation
    const reservation = await prisma.reservation.create({
      data: {
        userId: user.id,
        classId: BigInt(classId),
        frameSize,
        status: ReservationStatus.CONFIRMED,
        notes: userCreated ? 'Guest booking - account created automatically' : 'Guest booking'
      }
    })

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        amount: classItem.classType.defaultPrice,
        currency: 'USD',
        paymentMethod,
        status: PaymentStatus.PENDING,
        description: `Single class payment: ${classItem.classType.name}`,
        metadata: {
          reservationId: reservation.id.toString(),
          bookingType: 'guest-single-class'
        }
      }
    })

    // Prepare response data
    const responseData = {
      success: true,
      reservation: {
        id: reservation.id.toString(),
        uuid: reservation.uuid,
        status: reservation.status
      },
      class: {
        id: classItem.id.toString(),
        name: classItem.classType.name,
        startsAt: classItem.startsAt.toISOString(),
        endsAt: classItem.endsAt.toISOString(),
        location: {
          name: classItem.location.name,
          address: classItem.location.address
        },
        instructor: classItem.instructor ? {
          name: `${classItem.instructor.user.firstName} ${classItem.instructor.user.lastName}`
        } : null
      },
      user: {
        id: user.id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isNewUser: userCreated,
        needsActivation: user.status === UserStatus.PENDING_ACTIVATION
      },
      payment: {
        id: payment.id.toString(),
        amount: Number(payment.amount),
        currency: payment.currency,
        method: payment.paymentMethod,
        status: payment.status
      },
      frameSize,
      nextSteps: {
        checkEmail: true,
        arriveEarly: true,
        activateAccount: userCreated
      }
    }

    // TODO: Send confirmation email (implement in next task)
    // await sendBookingConfirmationEmail(user, classItem, reservation, payment)

    return NextResponse.json(responseData, { status: 201 })

  } catch (error) {
    console.error('Guest booking error:', error)

    // Check for unique constraint violations
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'You already have a reservation for this class' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    )
  }
}