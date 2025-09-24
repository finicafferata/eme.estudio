import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ReservationStatus } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    // Verify cron job authentication
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET_TOKEN

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()

    // Find reservations with payment deadlines approaching
    const upcomingDeadlines = await findUpcomingPaymentDeadlines(now)

    const reminderResults = {
      sent48h: [] as string[],
      sent24h: [] as string[],
      sent6h: [] as string[],
      failed: [] as any[]
    }

    // Process 48-hour reminders
    for (const reservation of upcomingDeadlines.in48Hours) {
      try {
        await sendPaymentReminder(reservation, '48_hours')
        reminderResults.sent48h.push(reservation.id.toString())
      } catch (error) {
        reminderResults.failed.push({
          reservationId: reservation.id.toString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Process 24-hour reminders
    for (const reservation of upcomingDeadlines.in24Hours) {
      try {
        await sendPaymentReminder(reservation, '24_hours')
        reminderResults.sent24h.push(reservation.id.toString())
      } catch (error) {
        reminderResults.failed.push({
          reservationId: reservation.id.toString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Process 6-hour urgent reminders
    for (const reservation of upcomingDeadlines.in6Hours) {
      try {
        await sendPaymentReminder(reservation, '6_hours')
        reminderResults.sent6h.push(reservation.id.toString())
      } catch (error) {
        reminderResults.failed.push({
          reservationId: reservation.id.toString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Payment reminders processed',
      results: {
        remindersSent48h: reminderResults.sent48h.length,
        remindersSent24h: reminderResults.sent24h.length,
        remindersSent6h: reminderResults.sent6h.length,
        failed: reminderResults.failed.length,
        details: reminderResults
      }
    })

  } catch (error) {
    console.error('Payment reminder cron job error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process payment reminders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function findUpcomingPaymentDeadlines(now: Date) {
  const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000)
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const in6Hours = new Date(now.getTime() + 6 * 60 * 60 * 1000)

  const baseQuery = {
    where: {
      status: ReservationStatus.CONFIRMED,
      paymentDeadline: { not: null },
      packageId: null // Only unpaid reservations
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
          classType: { select: { name: true } },
          location: { select: { name: true, address: true } },
          instructor: {
            include: {
              user: { select: { firstName: true, lastName: true } }
            }
          }
        }
      }
    }
  }

  // 48-hour reminders (between 47-49 hours from now)
  const reservations48h = await prisma.reservation.findMany({
    ...baseQuery,
    where: {
      ...baseQuery.where,
      paymentDeadline: {
        gte: new Date(now.getTime() + 47 * 60 * 60 * 1000),
        lte: new Date(now.getTime() + 49 * 60 * 60 * 1000)
      }
    }
  })

  // 24-hour reminders (between 23-25 hours from now)
  const reservations24h = await prisma.reservation.findMany({
    ...baseQuery,
    where: {
      ...baseQuery.where,
      paymentDeadline: {
        gte: new Date(now.getTime() + 23 * 60 * 60 * 1000),
        lte: new Date(now.getTime() + 25 * 60 * 60 * 1000)
      }
    }
  })

  // 6-hour urgent reminders (between 5-7 hours from now)
  const reservations6h = await prisma.reservation.findMany({
    ...baseQuery,
    where: {
      ...baseQuery.where,
      paymentDeadline: {
        gte: new Date(now.getTime() + 5 * 60 * 60 * 1000),
        lte: new Date(now.getTime() + 7 * 60 * 60 * 1000)
      }
    }
  })

  return {
    in48Hours: reservations48h,
    in24Hours: reservations24h,
    in6Hours: reservations6h
  }
}

async function sendPaymentReminder(reservation: any, urgency: string) {
  const reminderTypes = {
    '48_hours': {
      subject: 'Payment Reminder - 48 Hours Left',
      urgency: 'normal',
      message: 'friendly reminder that your payment is due in 48 hours'
    },
    '24_hours': {
      subject: 'Payment Deadline Tomorrow',
      urgency: 'warning',
      message: 'urgent reminder that your payment is due tomorrow'
    },
    '6_hours': {
      subject: 'URGENT: Payment Due in 6 Hours',
      urgency: 'critical',
      message: 'final reminder that your payment is due in just 6 hours'
    }
  }

  const reminder = reminderTypes[urgency as keyof typeof reminderTypes]

  // In development, just log the email
  if (process.env.NODE_ENV === 'development') {
    console.log(`📧 PAYMENT REMINDER (${urgency}):`, {
      to: reservation.user.email,
      subject: reminder.subject,
      urgency: reminder.urgency,
      content: {
        userName: `${reservation.user.firstName} ${reservation.user.lastName}`,
        className: reservation.class.classType.name,
        classDate: reservation.class.startsAt,
        location: reservation.class.location.name,
        instructor: reservation.class.instructor ?
          `${reservation.class.instructor.user.firstName} ${reservation.class.instructor.user.lastName}` :
          'TBA',
        paymentDeadline: reservation.paymentDeadline,
        registrationType: reservation.registrationType,
        frameSize: reservation.frameSize,
        message: reminder.message,
        hoursLeft: Math.floor((new Date(reservation.paymentDeadline).getTime() - Date.now()) / (1000 * 60 * 60))
      }
    })
    return
  }

  // TODO: Implement actual email sending in production
  // This would integrate with your email service (SendGrid, AWS SES, etc.)

  // Example structure for production email:
  /*
  await emailService.send({
    to: reservation.user.email,
    subject: reminder.subject,
    template: 'payment-reminder',
    data: {
      userName: `${reservation.user.firstName} ${reservation.user.lastName}`,
      className: reservation.class.classType.name,
      classDate: format(new Date(reservation.class.startsAt), 'PPP p'),
      location: reservation.class.location.name,
      paymentDeadline: format(new Date(reservation.paymentDeadline), 'PPP p'),
      hoursLeft: Math.floor((new Date(reservation.paymentDeadline).getTime() - Date.now()) / (1000 * 60 * 60)),
      urgency: reminder.urgency,
      paymentInstructions: 'Please contact the studio to complete your payment.',
      cancelationPolicy: 'Reservations will be automatically cancelled if payment is not received by the deadline.'
    }
  })
  */
}