import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, ReservationStatus, ClassStatus, FrameSize } from '@prisma/client'
import { emailService, formatBookingForEmail } from '@/lib/email'
import { calculateClassCapacity, canAddFrameSize } from '@/lib/capacity'

// Create a new reservation with capacity validation
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      classId,
      userId,
      packageId,
      frameSize = FrameSize.MEDIUM, // Default to medium frame
      forceOverride = false // Admin can override capacity limits
    } = body

    if (!classId || !userId) {
      return NextResponse.json(
        { error: 'Class ID and User ID are required' },
        { status: 400 }
      )
    }

    // Get class with current reservations and waitlist
    const classData = await prisma.class.findUnique({
      where: { id: BigInt(classId) },
      include: {
        reservations: {
          where: {
            status: {
              in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN]
            }
          },
          select: {
            frameSize: true
          }
        },
        waitlist: {
          orderBy: { priority: 'asc' }
        }
      }
    })

    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    // Check if user already has a reservation
    const existingReservation = await prisma.reservation.findUnique({
      where: {
        userId_classId: {
          userId: BigInt(userId),
          classId: BigInt(classId)
        }
      }
    })

    if (existingReservation) {
      return NextResponse.json(
        { error: 'User already has a reservation for this class' },
        { status: 409 }
      )
    }

    // Use frame-aware capacity calculation
    const existingFrameSizes = classData.reservations.map(r => r.frameSize)
    const capacityResult = calculateClassCapacity(existingFrameSizes, classData.capacity, frameSize as FrameSize)
    const currentBookings = existingFrameSizes.length
    const isAdmin = (session.user as any).role === UserRole.ADMIN
    const hasCapacity = capacityResult.hasCapacity

    // Admin override check
    if (!hasCapacity && !forceOverride && isAdmin) {
      return NextResponse.json({
        error: 'Class is at full capacity',
        warning: `This class has ${currentBookings}/${classData.capacity} students. Continue anyway?`,
        currentBookings,
        capacity: classData.capacity,
        frameDistribution: capacityResult.currentFrameDistribution,
        requestedFrameSize: frameSize,
        requiresOverride: true
      }, { status: 409 })
    }

    // Check if user has available credits when using a package
    if (packageId) {
      const packageData = await prisma.package.findUnique({
        where: { id: BigInt(packageId) },
        select: {
          status: true,
          totalCredits: true,
          usedCredits: true,
          expiresAt: true
        }
      })

      if (!packageData) {
        return NextResponse.json(
          { error: 'Package not found' },
          { status: 404 }
        )
      }

      // Check if package is active
      if (packageData.status !== 'ACTIVE') {
        return NextResponse.json(
          { error: `Cannot use ${packageData.status.toLowerCase()} package` },
          { status: 400 }
        )
      }

      // Check if package has expired
      if (packageData.expiresAt && new Date() > packageData.expiresAt) {
        return NextResponse.json(
          { error: 'Package has expired and cannot be used' },
          { status: 400 }
        )
      }

      // Check if user has available credits
      const availableCredits = packageData.totalCredits - packageData.usedCredits
      if (availableCredits <= 0) {
        return NextResponse.json(
          { error: 'No credits remaining in this package' },
          { status: 400 }
        )
      }
    }

    // Regular capacity check for non-admins
    if (!hasCapacity && !isAdmin) {
      // Add to waitlist instead
      const waitlistEntry = await prisma.waitlist.create({
        data: {
          userId: BigInt(userId),
          classId: BigInt(classId),
          frameSize: frameSize as FrameSize,
          priority: classData.waitlist.length + 1
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          },
          class: {
            select: {
              startsAt: true,
              classType: {
                select: { name: true }
              }
            }
          }
        }
      })

      return NextResponse.json({
        message: 'Class is full. Added to waitlist.',
        waitlistEntry: {
          id: waitlistEntry.id.toString(),
          position: waitlistEntry.priority,
          classId: classData.id.toString(),
          className: waitlistEntry.class.classType.name,
          classTime: waitlistEntry.class.startsAt.toISOString()
        }
      }, { status: 202 })
    }

    // Create the reservation
    const reservation = await prisma.reservation.create({
      data: {
        userId: BigInt(userId),
        classId: BigInt(classId),
        packageId: packageId ? BigInt(packageId) : null,
        frameSize: frameSize as FrameSize,
        status: ReservationStatus.CONFIRMED
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        class: {
          select: {
            startsAt: true,
            capacity: true,
            classType: {
              select: { name: true }
            }
          }
        },
        package: {
          select: {
            name: true,
            usedCredits: true,
            totalCredits: true
          }
        }
      }
    })

    // Check if class should be marked as FULL
    const newBookingCount = currentBookings + 1
    if (newBookingCount >= classData.capacity && classData.status !== ClassStatus.FULL) {
      await prisma.class.update({
        where: { id: BigInt(classId) },
        data: { status: ClassStatus.FULL }
      })
    }

    // Update package credits if applicable
    if (packageId) {
      const updatedPackage = await prisma.package.update({
        where: { id: BigInt(packageId) },
        data: {
          usedCredits: {
            increment: 1
          }
        }
      })

      // Log the credit deduction
      await prisma.auditLog.create({
        data: {
          userId: BigInt(userId),
          action: 'CREDIT_DEDUCTED',
          tableName: 'packages',
          recordId: BigInt(packageId),
          newValues: {
            reservationId: reservation.id.toString(),
            classId: classId.toString(),
            className: reservation.class.classType.name,
            classDate: reservation.class.startsAt.toISOString(),
            creditsBefore: updatedPackage.usedCredits - 1,
            creditsAfter: updatedPackage.usedCredits,
            reason: 'RESERVATION_CREATED'
          }
        }
      })

      // Check if package should be marked as USED_UP
      if (updatedPackage.usedCredits >= updatedPackage.totalCredits) {
        await prisma.package.update({
          where: { id: BigInt(packageId) },
          data: { status: 'USED_UP' }
        })

        // Log the status change
        await prisma.auditLog.create({
          data: {
            userId: BigInt(userId),
            action: 'PACKAGE_STATUS_UPDATED',
            tableName: 'packages',
            recordId: BigInt(packageId),
            oldValues: { status: 'ACTIVE' },
            newValues: {
              status: 'USED_UP',
              reason: 'ALL_CREDITS_USED',
              triggeredBy: 'RESERVATION_CREATION'
            }
          }
        })
      }
    }

    // Get full reservation details for email confirmation
    const fullReservation = await prisma.reservation.findUnique({
      where: { id: reservation.id },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        class: {
          include: {
            classType: {
              select: {
                name: true,
                durationMinutes: true
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
            location: {
              select: {
                name: true,
                address: true
              }
            }
          }
        },
        package: {
          select: {
            name: true
          }
        }
      }
    })

    // Send email confirmation (don't block the response on email sending)
    if (fullReservation) {
      // Send email asynchronously
      emailService.sendBookingConfirmation(formatBookingForEmail(fullReservation))
        .catch(error => {
          console.error('Failed to send booking confirmation email:', error)
        })
    }

    return NextResponse.json({
      message: 'Reservation created successfully',
      reservation: {
        id: reservation.id.toString(),
        status: reservation.status,
        classId: classData.id.toString(),
        className: reservation.class.classType.name,
        classTime: reservation.class.startsAt.toISOString(),
        studentName: `${reservation.user.firstName} ${reservation.user.lastName}`,
        studentEmail: reservation.user.email,
        package: reservation.package ? {
          name: reservation.package.name,
          creditsUsed: reservation.package.usedCredits,
          totalCredits: reservation.package.totalCredits
        } : null
      },
      classStatus: {
        currentBookings: newBookingCount,
        capacity: classData.capacity,
        isFull: newBookingCount >= classData.capacity,
        availableSpots: Math.max(0, classData.capacity - newBookingCount)
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Reservation POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create reservation' },
      { status: 500 }
    )
  }
}

// Get reservations (with filtering)
export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')

    const where: any = {}

    if (classId) where.classId = BigInt(classId)
    if (userId) where.userId = BigInt(userId)
    if (status) where.status = status as ReservationStatus

    const reservations = await prisma.reservation.findMany({
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
            endsAt: true,
            capacity: true,
            status: true,
            classType: {
              select: {
                name: true,
                description: true
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
            name: true,
            usedCredits: true,
            totalCredits: true
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' }
      ]
    })

    const formattedReservations = reservations.map(reservation => ({
      id: reservation.id.toString(),
      status: reservation.status,
      frameSize: reservation.frameSize,
      reservedAt: reservation.reservedAt.toISOString(),
      checkedInAt: reservation.checkedInAt?.toISOString(),
      cancelledAt: reservation.cancelledAt?.toISOString(),
      cancellationReason: reservation.cancellationReason,
      notes: reservation.notes,
      student: {
        id: reservation.user.id.toString(),
        name: `${reservation.user.firstName} ${reservation.user.lastName}`,
        email: reservation.user.email
      },
      class: {
        id: reservation.class.id.toString(),
        name: reservation.class.classType.name,
        description: reservation.class.classType.description,
        startsAt: reservation.class.startsAt.toISOString(),
        endsAt: reservation.class.endsAt.toISOString(),
        capacity: reservation.class.capacity,
        status: reservation.class.status,
        location: reservation.class.location.name,
        instructor: reservation.class.instructor ?
          `${reservation.class.instructor.user.firstName} ${reservation.class.instructor.user.lastName}` :
          'No instructor assigned'
      },
      package: reservation.package ? {
        name: reservation.package.name,
        creditsUsed: reservation.package.usedCredits,
        totalCredits: reservation.package.totalCredits
      } : null
    }))

    return NextResponse.json({
      reservations: formattedReservations,
      total: reservations.length
    })

  } catch (error) {
    console.error('Reservations GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reservations' },
      { status: 500 }
    )
  }
}