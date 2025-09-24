import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UserStatus, UserRole, ReservationStatus, PaymentStatus, PaymentMethod, FrameSize, RegistrationType, PackageStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { emailService, formatBookingForEmail } from '@/lib/email'

interface GuestBookingRequest {
  classId: string
  email: string
  firstName: string
  lastName: string
  frameSize: FrameSize
  registrationType?: RegistrationType
  packageId?: string
  paymentDeadline?: string
  paymentMethod: PaymentMethod
}

export async function POST(request: NextRequest) {
  try {
    const body: GuestBookingRequest = await request.json()
    const { classId, email, firstName, lastName, frameSize, registrationType, packageId, paymentDeadline, paymentMethod } = body

    // Input validation
    if (!classId || !email || !firstName || !lastName || !frameSize || !paymentMethod) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    // Validate intensive registration constraints
    if (registrationType === 'INTENSIVE' && frameSize !== 'SMALL') {
      return NextResponse.json(
        { error: 'Los cursos intensivos solo pueden usar bastidor PEQUEÑO' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Formato de correo electrónico inválido' },
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
        { error: 'Clase no encontrada' },
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
        { error: `No hay bastidores ${frameSize.toLowerCase()} disponibles. Prueba con otro tamaño.` },
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

    // Handle package usage if provided
    let usedPackage = false
    if (packageId) {
      const pkg = await prisma.package.findUnique({
        where: { id: BigInt(packageId) }
      })

      if (pkg && pkg.userId === user.id && pkg.status === PackageStatus.ACTIVE) {
        const availableCredits = pkg.totalCredits - pkg.usedCredits
        if (availableCredits > 0) {
          // Update package credits
          await prisma.package.update({
            where: { id: BigInt(packageId) },
            data: {
              usedCredits: pkg.usedCredits + 1,
              status: (pkg.usedCredits + 1 >= pkg.totalCredits) ? PackageStatus.USED_UP : PackageStatus.ACTIVE
            }
          })
          usedPackage = true
        }
      }
    }

    // Calculate payment deadline if not using a package
    const finalPaymentDeadline = !usedPackage && paymentDeadline ? new Date(paymentDeadline) : null

    // Create the reservation
    const reservation = await prisma.reservation.create({
      data: {
        userId: user.id,
        classId: BigInt(classId),
        packageId: usedPackage && packageId ? BigInt(packageId) : null,
        frameSize,
        registrationType: registrationType || null,
        paymentDeadline: finalPaymentDeadline,
        status: ReservationStatus.CONFIRMED,
        notes: userCreated ? 'Guest booking - account created automatically' : 'Guest booking'
      }
    })

    // For new users, create a package instead of payment
    let payment = null
    let createdPackage = null

    if (!usedPackage) {
      if (userCreated) {
        // New user: Create package with PENDING_PAYMENT status based on registration type
        let packageData

        if (registrationType === 'INTENSIVE') {
          // Create intensive package - price to be set by admin
          packageData = {
            userId: user.id,
            name: `Intensive Package - ${classItem.classType.name}`,
            classTypeId: classItem.classTypeId,
            totalCredits: 3,
            usedCredits: 1, // Already used for this reservation
            price: 0, // Price will be set manually by admin
            status: PackageStatus.PENDING_PAYMENT,
            purchasedAt: new Date(),
            metadata: {
              bookingType: 'guest-intensive-package',
              registrationType: registrationType,
              classId: classItem.id.toString(),
              reservationId: reservation.id.toString(),
              requiresManualPayment: true,
              isIntensive: true,
              priceSetByAdmin: true
            }
          }
        } else if (registrationType === 'RECURRENT') {
          // Create recurrent package - price to be set by admin
          packageData = {
            userId: user.id,
            name: `Recurrent Package - ${classItem.classType.name}`,
            classTypeId: classItem.classTypeId,
            totalCredits: 8,
            usedCredits: 1, // Already used for this reservation
            price: 0, // Price will be set manually by admin
            status: PackageStatus.PENDING_PAYMENT,
            purchasedAt: new Date(),
            metadata: {
              bookingType: 'guest-recurrent-package',
              registrationType: registrationType,
              classId: classItem.id.toString(),
              reservationId: reservation.id.toString(),
              requiresManualPayment: true,
              isRecurrent: true,
              priceSetByAdmin: true
            }
          }
        } else {
          // Single classes are not charged - create free package
          packageData = {
            userId: user.id,
            name: `Single Class - ${classItem.classType.name}`,
            classTypeId: classItem.classTypeId,
            totalCredits: 1,
            usedCredits: 1, // Already used for this reservation
            price: 0, // Single classes are free
            status: PackageStatus.ACTIVE, // Single classes are automatically active (free)
            purchasedAt: new Date(),
            metadata: {
              bookingType: 'guest-single-class-free',
              registrationType: registrationType || 'standard',
              classId: classItem.id.toString(),
              reservationId: reservation.id.toString(),
              isFree: true
            }
          }
        }

        createdPackage = await prisma.package.create({
          data: packageData
        })

        // Update reservation to link to the new package
        await prisma.reservation.update({
          where: { id: reservation.id },
          data: { packageId: createdPackage.id }
        })
      } else {
        // Existing user: Create payment record as before
        payment = await prisma.payment.create({
          data: {
            userId: user.id,
            amount: classItem.classType.defaultPrice,
            currency: 'USD',
            paymentMethod,
            status: PaymentStatus.PENDING,
            description: `Single class payment: ${classItem.classType.name}`,
            metadata: {
              reservationId: reservation.id.toString(),
              bookingType: 'guest-single-class',
              registrationType: registrationType || 'standard',
              paymentDeadline: finalPaymentDeadline?.toISOString() || null
            }
          }
        })
      }
    }

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
      payment: payment ? {
        id: payment.id.toString(),
        amount: Number(payment.amount),
        currency: payment.currency,
        method: payment.paymentMethod,
        status: payment.status,
        deadline: finalPaymentDeadline?.toISOString() || null
      } : null,
      package: createdPackage ? {
        id: createdPackage.id.toString(),
        name: createdPackage.name,
        totalCredits: createdPackage.totalCredits,
        usedCredits: createdPackage.usedCredits,
        remainingCredits: createdPackage.totalCredits - createdPackage.usedCredits,
        status: createdPackage.status,
        price: Number(createdPackage.price),
        requiresPayment: createdPackage.status === PackageStatus.PENDING_PAYMENT,
        isFree: Number(createdPackage.price) === 0 && createdPackage.status === PackageStatus.ACTIVE
      } : null,
      registrationType: registrationType || null,
      usedPackage,
      frameSize,
      nextSteps: {
        checkEmail: true,
        arriveEarly: true,
        activateAccount: userCreated,
        paymentRequired: createdPackage ? createdPackage.status === PackageStatus.PENDING_PAYMENT : false
      },
      paymentInstructions: createdPackage && createdPackage.status === PackageStatus.PENDING_PAYMENT ? {
        message: registrationType === 'INTENSIVE'
          ? "Tu paquete intensivo requiere pago. El estudio se contactará contigo para coordinar el pago."
          : registrationType === 'RECURRENT'
          ? "Tu paquete recurrente requiere pago. El estudio se contactará contigo para coordinar el pago."
          : "Se requiere pago para tu reserva. El estudio se contactará contigo.",
        contactInfo: "EME Studio se pondrá en contacto contigo para coordinar el pago según tu preferencia (efectivo, transferencia, etc.)."
      } : null
    }

    // Send confirmation email
    try {
      // Get the full reservation data with all necessary relations for email
      const reservationForEmail = await prisma.reservation.findUnique({
        where: { id: reservation.id },
        include: {
          user: true,
          class: {
            include: {
              classType: true,
              location: true,
              instructor: {
                include: {
                  user: true
                }
              }
            }
          },
          package: true
        }
      })

      if (reservationForEmail) {
        const emailData = formatBookingForEmail(reservationForEmail)
        const emailSent = await emailService.sendBookingConfirmation(emailData)

        if (emailSent) {
          console.log('✅ Confirmation email sent successfully to:', user.email)
        } else {
          console.warn('⚠️ Failed to send confirmation email to:', user.email)
        }
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError)
      // Don't fail the booking if email fails
    }

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