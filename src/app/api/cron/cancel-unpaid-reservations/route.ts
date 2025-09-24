import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ReservationStatus } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    // Verify cron job authentication (optional security measure)
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET_TOKEN

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()

    // Find all reservations with unpaid deadlines that have passed
    const expiredReservations = await prisma.reservation.findMany({
      where: {
        status: ReservationStatus.CONFIRMED,
        paymentDeadline: {
          not: null,
          lt: now // Payment deadline has passed
        },
        packageId: null // Only reservations without packages (need payment)
      },
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
                name: true
              }
            }
          }
        },
        package: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (expiredReservations.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No expired reservations found',
        cancelledCount: 0
      })
    }

    const cancelledReservations = []
    const notificationEmails = []

    // Process each expired reservation
    for (const reservation of expiredReservations) {
      try {
        // Cancel the reservation
        const updatedReservation = await prisma.reservation.update({
          where: { id: reservation.id },
          data: {
            status: ReservationStatus.CANCELLED,
            cancelledAt: now,
            cancellationReason: 'Automatically cancelled due to unpaid payment deadline'
          }
        })

        // Cancel associated pending payment
        await prisma.payment.updateMany({
          where: {
            userId: reservation.userId,
            status: 'PENDING',
            metadata: {
              path: ['reservationId'],
              equals: reservation.id.toString()
            }
          },
          data: {
            status: 'CANCELLED'
          }
        })

        // Check for waitlist and promote next person
        const waitlistEntry = await prisma.waitlist.findFirst({
          where: {
            classId: reservation.classId,
            frameSize: reservation.frameSize
          },
          orderBy: {
            priority: 'asc'
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true
              }
            }
          }
        })

        let promotedUser = null
        if (waitlistEntry) {
          // Remove from waitlist
          await prisma.waitlist.delete({
            where: { id: waitlistEntry.id }
          })

          // Create new reservation for waitlisted user
          const newReservation = await prisma.reservation.create({
            data: {
              userId: waitlistEntry.userId,
              classId: reservation.classId,
              frameSize: waitlistEntry.frameSize,
              registrationType: reservation.registrationType,
              status: ReservationStatus.CONFIRMED,
              notes: 'Promoted from waitlist due to cancellation'
            }
          })

          promotedUser = {
            user: waitlistEntry.user,
            reservationId: newReservation.id
          }

          // Add to notification queue for promoted user
          notificationEmails.push({
            type: 'waitlist_promotion',
            user: waitlistEntry.user,
            class: reservation.class,
            reservationId: newReservation.id
          })
        }

        cancelledReservations.push({
          reservationId: reservation.id.toString(),
          userId: reservation.userId.toString(),
          userEmail: reservation.user.email,
          className: reservation.class.classType.name,
          classDate: reservation.class.startsAt,
          paymentDeadline: reservation.paymentDeadline,
          promotedUser
        })

        // Add to notification queue for cancelled user
        notificationEmails.push({
          type: 'reservation_cancelled',
          user: reservation.user,
          class: reservation.class,
          paymentDeadline: reservation.paymentDeadline
        })

      } catch (error) {
        console.error(`Failed to cancel reservation ${reservation.id}:`, error)
      }
    }

    // Send notification emails (if email service is configured)
    const emailResults = await sendNotificationEmails(notificationEmails)

    return NextResponse.json({
      success: true,
      message: `Successfully cancelled ${cancelledReservations.length} expired reservations`,
      cancelledCount: cancelledReservations.length,
      cancelledReservations,
      emailNotifications: {
        sent: emailResults.sent,
        failed: emailResults.failed
      }
    })

  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process expired reservations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function sendNotificationEmails(notifications: any[]) {
  const sent = []
  const failed = []

  for (const notification of notifications) {
    try {
      if (notification.type === 'reservation_cancelled') {
        await sendCancellationEmail(notification)
      } else if (notification.type === 'waitlist_promotion') {
        await sendWaitlistPromotionEmail(notification)
      }
      sent.push(notification)
    } catch (error) {
      console.error('Failed to send email:', error)
      failed.push({ notification, error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  return { sent, failed }
}

async function sendCancellationEmail(notification: any) {
  // In development, just log the email
  if (process.env.NODE_ENV === 'development') {
    console.log('📧 CANCELLATION EMAIL:', {
      to: notification.user.email,
      subject: 'Class Reservation Cancelled - Payment Deadline Passed',
      content: {
        userName: `${notification.user.firstName} ${notification.user.lastName}`,
        className: notification.class.classType.name,
        classDate: notification.class.startsAt,
        location: notification.class.location.name,
        reason: 'Payment deadline expired',
        paymentDeadline: notification.paymentDeadline
      }
    })
    return
  }

  // TODO: Implement actual email sending in production
  // This would integrate with your email service (SendGrid, AWS SES, etc.)
}

async function sendWaitlistPromotionEmail(notification: any) {
  // In development, just log the email
  if (process.env.NODE_ENV === 'development') {
    console.log('📧 WAITLIST PROMOTION EMAIL:', {
      to: notification.user.email,
      subject: 'Great News! You\'ve Been Moved Off the Waitlist',
      content: {
        userName: `${notification.user.firstName} ${notification.user.lastName}`,
        className: notification.class.classType.name,
        classDate: notification.class.startsAt,
        location: notification.class.location.name,
        reservationId: notification.reservationId
      }
    })
    return
  }

  // TODO: Implement actual email sending in production
}