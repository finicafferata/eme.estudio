import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, ClassStatus } from '@prisma/client'

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const patternId = parseInt(params.id)
    if (isNaN(patternId)) {
      return NextResponse.json({ error: 'Invalid pattern ID' }, { status: 400 })
    }

    const body = await request.json()
    const {
      weeksAhead = 4,
      skipHolidays = true,
      startFromDate
    } = body

    // Get the pattern
    const pattern = await prisma.recurringClassPattern.findUnique({
      where: { id: patternId },
      include: {
        classType: true,
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
        location: true
      }
    })

    if (!pattern) {
      return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })
    }

    if (!pattern.isActive) {
      return NextResponse.json({ error: 'Cannot generate classes from inactive pattern' }, { status: 400 })
    }

    const generatedClasses = await generateClassesFromPattern(
      pattern,
      weeksAhead,
      skipHolidays,
      startFromDate ? new Date(startFromDate) : undefined
    )

    return NextResponse.json({
      message: `Generated ${generatedClasses.length} classes for pattern "${pattern.name}"`,
      generatedClasses: generatedClasses.length,
      pattern: {
        id: pattern.id.toString(),
        name: pattern.name,
        dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][pattern.dayOfWeek],
        startTime: pattern.startTime.toTimeString().slice(0, 5)
      },
      classes: generatedClasses.map(cls => ({
        id: cls.id.toString(),
        startsAt: cls.startsAt.toISOString(),
        endsAt: cls.endsAt.toISOString()
      }))
    })

  } catch (error) {
    console.error('Pattern generate error:', error)
    return NextResponse.json(
      { error: 'Failed to generate classes from pattern' },
      { status: 500 }
    )
  }
}

// Helper function to generate classes from a pattern
async function generateClassesFromPattern(
  pattern: any,
  weeksAhead: number,
  skipHolidays: boolean = true,
  startFromDate?: Date
): Promise<any[]> {
  const generatedClasses = []
  const startDate = startFromDate || new Date()

  // Get holidays if we need to skip them
  const holidays = skipHolidays ? await prisma.holiday.findMany({
    where: {
      date: {
        gte: startDate,
        lte: new Date(startDate.getTime() + weeksAhead * 7 * 24 * 60 * 60 * 1000)
      }
    }
  }) : []

  const holidayDates = new Set(holidays.map(h => h.date.toISOString().split('T')[0]))

  for (let week = 0; week < weeksAhead; week++) {
    const targetDate = new Date(startDate)
    targetDate.setDate(startDate.getDate() + (week * 7))

    // Find the next occurrence of the target day of week
    const daysUntilTarget = (pattern.dayOfWeek - targetDate.getDay() + 7) % 7
    if (week === 0 && daysUntilTarget === 0 && targetDate.getHours() > pattern.startTime.getHours()) {
      // If it's the same day but time has passed, move to next week
      targetDate.setDate(targetDate.getDate() + 7)
    } else {
      targetDate.setDate(targetDate.getDate() + daysUntilTarget)
    }

    // Skip if it's a holiday
    const dateString = targetDate.toISOString().split('T')[0]
    if (holidayDates.has(dateString)) {
      continue
    }

    // Skip if date is before validFrom or after validUntil
    if (targetDate < pattern.validFrom) {
      continue
    }
    if (pattern.validUntil && targetDate > pattern.validUntil) {
      continue
    }

    // Create the class start and end times
    const classStartTime = new Date(targetDate)
    const patternTime = pattern.startTime
    classStartTime.setHours(patternTime.getHours(), patternTime.getMinutes(), 0, 0)

    const classEndTime = new Date(classStartTime.getTime() + pattern.durationMinutes * 60000)

    // Check if class already exists for this date/time
    const existingClass = await prisma.class.findFirst({
      where: {
        startsAt: classStartTime,
        classTypeId: pattern.classTypeId,
        locationId: pattern.locationId
      }
    })

    if (existingClass) {
      continue // Skip if class already exists
    }

    // Create the class
    const newClass = await prisma.class.create({
      data: {
        classTypeId: pattern.classTypeId,
        instructorId: pattern.instructorId,
        locationId: pattern.locationId,
        startsAt: classStartTime,
        endsAt: classEndTime,
        capacity: pattern.capacity,
        price: pattern.price,
        status: ClassStatus.SCHEDULED,
        notes: `Generated from pattern: ${pattern.name}`
      }
    })

    generatedClasses.push(newClass)
  }

  return generatedClasses
}