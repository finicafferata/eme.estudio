import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { UserRole } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { jobType } = await request.json()

    if (!jobType || !['cancel-unpaid-reservations', 'send-payment-reminders'].includes(jobType)) {
      return NextResponse.json({ error: 'Invalid job type' }, { status: 400 })
    }

    // Make internal request to the cron endpoint
    const cronResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3002'}/api/cron/${jobType}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET_TOKEN || 'dev-token'}`
      }
    })

    const result = await cronResponse.json()

    if (!cronResponse.ok) {
      throw new Error(result.error || 'Cron job failed')
    }

    return NextResponse.json({
      success: true,
      jobType,
      result
    })

  } catch (error) {
    console.error('Admin cron trigger error:', error)
    return NextResponse.json(
      {
        error: 'Failed to run cron job',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}