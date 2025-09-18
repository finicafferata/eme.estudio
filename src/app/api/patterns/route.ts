import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, ClassStatus } from '@prisma/client'

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const patterns = await prisma.recurringClassPattern.findMany({
      include: {
        classType: {
          select: {
            id: true,
            name: true,
            description: true,
            durationMinutes: true
          }
        },
        instructor: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        location: {
          select: {
            id: true,
            name: true,
            address: true,
            capacity: true
          }
        }
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    })

    const formattedPatterns = patterns.map(pattern => ({
      id: pattern.id.toString(),
      name: pattern.name,
      dayOfWeek: pattern.dayOfWeek,
      dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][pattern.dayOfWeek],
      startTime: pattern.startTime.toTimeString().slice(0, 5), // HH:MM format
      durationMinutes: pattern.durationMinutes,
      endTime: new Date(new Date(`1970-01-01T${pattern.startTime.toTimeString().slice(0, 8)}`).getTime() + pattern.durationMinutes * 60000).toTimeString().slice(0, 5),
      capacity: pattern.capacity,
      price: Number(pattern.price),
      isActive: pattern.isActive,
      validFrom: pattern.validFrom.toISOString().split('T')[0],
      validUntil: pattern.validUntil?.toISOString().split('T')[0],
      createdAt: pattern.createdAt.toISOString(),
      classType: pattern.classType,
      instructor: pattern.instructor ? {
        id: pattern.instructor.id.toString(),
        name: `${pattern.instructor.user.firstName} ${pattern.instructor.user.lastName}`,
        firstName: pattern.instructor.user.firstName,
        lastName: pattern.instructor.user.lastName,
        email: pattern.instructor.user.email
      } : null,
      location: pattern.location
    }))

    return NextResponse.json({
      patterns: formattedPatterns
    })

  } catch (error) {
    console.error('Patterns GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recurring patterns' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      classTypeId,
      instructorId,
      locationId,
      dayOfWeek,
      startTime,
      durationMinutes = 150,
      capacity = 6,
      price,
      validFrom,
      validUntil,
      generateWeeks = 4,
      skipHolidays = true
    } = body

    if (!name || !classTypeId || !locationId || dayOfWeek === undefined || !startTime || !price || !validFrom) {
      return NextResponse.json(
        { error: 'Name, class type, location, day of week, start time, price, and valid from date are required' },
        { status: 400 }
      )
    }

    // Validate day of week (0-6, Sunday-Saturday)
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return NextResponse.json(
        { error: 'Day of week must be between 0 (Sunday) and 6 (Saturday)' },
        { status: 400 }
      )
    }

    // Create the time object for startTime
    const [hours, minutes] = startTime.split(':').map(Number)
    const timeDate = new Date()
    timeDate.setHours(hours, minutes, 0, 0)

    // Create the recurring pattern
    const newPattern = await prisma.recurringClassPattern.create({
      data: {
        name,
        classTypeId: parseInt(classTypeId),
        instructorId: instructorId ? parseInt(instructorId) : null,
        locationId: parseInt(locationId),
        dayOfWeek: parseInt(dayOfWeek),
        startTime: timeDate,
        durationMinutes: parseInt(durationMinutes),
        capacity: parseInt(capacity),
        price: parseFloat(price),
        isActive: true,
        validFrom: new Date(validFrom),
        validUntil: validUntil ? new Date(validUntil) : null
      },
      include: {
        classType: true,
        instructor: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        location: true
      }
    })

    // Auto-generate classes for the specified number of weeks
    if (generateWeeks > 0) {
      const generatedClasses = await generateClassesFromPattern(
        newPattern.id,
        generateWeeks,
        skipHolidays
      )

      return NextResponse.json({
        pattern: {
          id: newPattern.id.toString(),
          name: newPattern.name,
          dayOfWeek: newPattern.dayOfWeek,
          dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][newPattern.dayOfWeek],
          startTime: newPattern.startTime.toTimeString().slice(0, 5),
          durationMinutes: newPattern.durationMinutes,
          capacity: newPattern.capacity,
          price: Number(newPattern.price),
          isActive: newPattern.isActive,
          validFrom: newPattern.validFrom.toISOString().split('T')[0],
          validUntil: newPattern.validUntil?.toISOString().split('T')[0],
          classType: newPattern.classType,
          instructor: newPattern.instructor ? {
            id: newPattern.instructor.id.toString(),
            name: `${newPattern.instructor.user.firstName} ${newPattern.instructor.user.lastName}`,
            email: newPattern.instructor.user.email
          } : null,
          location: newPattern.location
        },
        generatedClasses: generatedClasses.length,
        message: `Created pattern and generated ${generatedClasses.length} classes for the next ${generateWeeks} weeks`
      }, { status: 201 })
    }

    return NextResponse.json({
      pattern: {
        id: newPattern.id.toString(),
        name: newPattern.name,
        dayOfWeek: newPattern.dayOfWeek,
        dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][newPattern.dayOfWeek],
        startTime: newPattern.startTime.toTimeString().slice(0, 5),
        durationMinutes: newPattern.durationMinutes,
        capacity: newPattern.capacity,
        price: Number(newPattern.price),
        isActive: newPattern.isActive,
        validFrom: newPattern.validFrom.toISOString().split('T')[0],
        validUntil: newPattern.validUntil?.toISOString().split('T')[0],
        classType: newPattern.classType,
        instructor: newPattern.instructor ? {
          id: newPattern.instructor.id.toString(),
          name: `${newPattern.instructor.user.firstName} ${newPattern.instructor.user.lastName}`,
          email: newPattern.instructor.user.email
        } : null,
        location: newPattern.location
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Patterns POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create recurring pattern' },
      { status: 500 }
    )
  }
}

// Helper function to generate classes from a pattern
async function generateClassesFromPattern(
  patternId: bigint,
  weeksAhead: number,
  skipHolidays: boolean = true
): Promise<any[]> {
  const pattern = await prisma.recurringClassPattern.findUnique({
    where: { id: patternId }
  })

  if (!pattern) {
    throw new Error('Pattern not found')
  }

  const generatedClasses = []
  const startDate = new Date()

  // Get holidays if we need to skip them
  const holidays = skipHolidays ? await prisma.holiday.findMany({
    where: {
      date: {
        gte: startDate,
        lte: new Date(Date.now() + weeksAhead * 7 * 24 * 60 * 60 * 1000)
      }
    }
  }) : []

  const holidayDates = new Set(holidays.map(h => h.date.toISOString().split('T')[0]))

  for (let week = 0; week < weeksAhead; week++) {
    const targetDate = new Date(startDate)
    targetDate.setDate(startDate.getDate() + (week * 7))

    // Find the next occurrence of the target day of week
    const daysUntilTarget = (pattern.dayOfWeek - targetDate.getDay() + 7) % 7
    targetDate.setDate(targetDate.getDate() + daysUntilTarget)

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