import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, ClassStatus } from '@prisma/client'

// Utility function to recursively convert BigInt values to strings
function convertBigIntToString(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (typeof obj === 'bigint') {
    return obj.toString()
  }

  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToString)
  }

  if (typeof obj === 'object') {
    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = convertBigIntToString(value)
    }
    return result
  }

  return obj
}

// EME Studio Schedule Templates
const SCHEDULE_TEMPLATES = {
  morning_weekdays: {
    name: 'Morning Classes (Mon-Sat)',
    description: 'Monday to Saturday 10:00am - 12:30pm',
    days: [1, 2, 3, 4, 5, 6], // Mon-Sat
    startTime: '10:00',
    endTime: '12:30',
    duration: 150
  },
  afternoon_tue_thu: {
    name: 'Afternoon Classes (Tue/Thu)',
    description: 'Tuesday and Thursday 3:00pm - 5:30pm',
    days: [2, 4], // Tue, Thu
    startTime: '15:00',
    endTime: '17:30',
    duration: 150
  },
  afternoon_friday: {
    name: 'Afternoon Friday',
    description: 'Friday 2:00pm - 4:30pm',
    days: [5], // Friday
    startTime: '14:00',
    endTime: '16:30',
    duration: 150
  },
  evening_mon_wed: {
    name: 'Evening Classes (Mon/Wed)',
    description: 'Monday and Wednesday 6:00pm - 8:30pm',
    days: [1, 3], // Mon, Wed
    startTime: '18:00',
    endTime: '20:30',
    duration: 150
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const view = searchParams.get('view') || 'list'
    const week = searchParams.get('week') // YYYY-MM-DD format for week start
    const instructorId = searchParams.get('instructorId')
    const classTypeId = searchParams.get('classTypeId')
    const status = searchParams.get('status')

    let startDate: Date
    let endDate: Date

    if (week) {
      startDate = new Date(week)
      endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6)
    } else {
      // Default to current week
      const now = new Date()
      const dayOfWeek = now.getDay()
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      startDate = new Date(now)
      startDate.setDate(now.getDate() + diffToMonday)
      endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6)
    }

    // Set time boundaries
    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(23, 59, 59, 999)

    const where: any = {
      startsAt: {
        gte: startDate,
        lte: endDate
      },
      ...(instructorId && { instructorId: BigInt(instructorId) }),
      ...(classTypeId && { classTypeId: BigInt(classTypeId) }),
      ...(status && { status: status as ClassStatus })
    }

    console.log('Querying classes with where clause:', JSON.stringify(where, (key, value) => typeof value === 'bigint' ? value.toString() : value))

    const classes = await prisma.class.findMany({
      where,
      include: {
        classType: {
          select: {
            id: true,
            name: true,
            description: true,
            durationMinutes: true,
            defaultPrice: true,
            maxCapacity: true
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
        },
        reservations: {
          where: {
            status: {
              in: ['CONFIRMED', 'CHECKED_IN']
            }
          },
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
        waitlist: {
          orderBy: { priority: 'asc' },
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
        }
      },
      orderBy: {
        startsAt: 'asc'
      }
    })

    console.log(`Found ${classes.length} classes. First class sample:`, classes[0] ? Object.keys(classes[0]) : 'No classes found')

    // Format classes for response
    const formattedClasses = convertBigIntToString(classes.map(classItem => ({
      id: classItem.id.toString(),
      uuid: classItem.uuid,
      startsAt: classItem.startsAt.toISOString(),
      endsAt: classItem.endsAt.toISOString(),
      capacity: classItem.capacity,
      status: classItem.status,
      notes: classItem.notes,
      classType: {
        id: classItem.classType.id.toString(),
        name: classItem.classType.name,
        description: classItem.classType.description,
        durationMinutes: classItem.classType.durationMinutes,
        defaultPrice: Number(classItem.classType.defaultPrice),
        maxCapacity: classItem.classType.maxCapacity
      },
      instructor: classItem.instructor ? {
        id: classItem.instructor.id.toString(),
        name: `${classItem.instructor.user.firstName} ${classItem.instructor.user.lastName}`,
        email: classItem.instructor.user.email
      } : null,
      location: {
        id: classItem.location.id.toString(),
        name: classItem.location.name,
        address: classItem.location.address,
        capacity: classItem.location.capacity
      },
      reservations: classItem.reservations.map(res => ({
        id: res.id.toString(),
        status: res.status,
        reservedAt: res.reservedAt.toISOString(),
        student: {
          id: res.user.id.toString(),
          name: `${res.user.firstName} ${res.user.lastName}`,
          email: res.user.email
        }
      })),
      availableSpots: classItem.capacity - classItem.reservations.length,
      waitlistCount: classItem.waitlist.length,
      waitlist: classItem.waitlist.map(entry => ({
        id: entry.id.toString(),
        priority: entry.priority,
        student: {
          id: entry.user.id.toString(),
          name: `${entry.user.firstName} ${entry.user.lastName}`,
          email: entry.user.email
        },
        createdAt: entry.createdAt.toISOString()
      }))
    })))

    if (view === 'week') {
      // Group classes by day for weekly view
      const weeklySchedule = {
        week: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        },
        days: Array.from({ length: 7 }, (_, dayIndex) => {
          const date = new Date(startDate)
          date.setDate(startDate.getDate() + dayIndex)

          const dayClasses = formattedClasses.filter((classItem: any) => {
            const classDate = new Date(classItem.startsAt)
            return classDate.toDateString() === date.toDateString()
          })

          return {
            date: date.toISOString().split('T')[0],
            dayOfWeek: date.getDay(),
            dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
            classes: dayClasses
          }
        })
      }

      return NextResponse.json(convertBigIntToString({
        view: 'week',
        schedule: weeklySchedule,
        templates: SCHEDULE_TEMPLATES
      }))
    }

    return NextResponse.json(convertBigIntToString({
      view: 'list',
      classes: formattedClasses,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      templates: SCHEDULE_TEMPLATES
    }))

  } catch (error) {
    console.error('Classes GET error:', error)
    console.error('Error details:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
      view: new URL(request.url).searchParams.get('view'),
      week: new URL(request.url).searchParams.get('week')
    })
    return NextResponse.json(
      { error: 'Failed to fetch classes' },
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
      classTypeId,
      instructorId,
      locationId,
      startsAt,
      endsAt,
      capacity = 6,
      price,
      notes,
      scheduleTemplate
    } = body

    // If using a schedule template, create multiple classes
    if (scheduleTemplate && SCHEDULE_TEMPLATES[scheduleTemplate as keyof typeof SCHEDULE_TEMPLATES]) {
      const template = SCHEDULE_TEMPLATES[scheduleTemplate as keyof typeof SCHEDULE_TEMPLATES]
      const startDate = new Date(startsAt)
      const createdClasses = []

      // Create classes for the next 4 weeks
      for (let week = 0; week < 4; week++) {
        for (const dayOfWeek of template.days) {
          const classDate = new Date(startDate)
          classDate.setDate(startDate.getDate() + (week * 7))

          // Adjust to the correct day of week
          const currentDay = classDate.getDay()
          const daysToAdd = (dayOfWeek - currentDay + 7) % 7
          classDate.setDate(classDate.getDate() + daysToAdd)

          const [startHour, startMinute] = template.startTime.split(':').map(Number)
          const [endHour, endMinute] = template.endTime.split(':').map(Number)

          const classStartsAt = new Date(classDate)
          classStartsAt.setHours(startHour ?? 0, startMinute ?? 0, 0, 0)

          const classEndsAt = new Date(classDate)
          classEndsAt.setHours(endHour ?? 0, endMinute ?? 0, 0, 0)

          const newClass = await prisma.class.create({
            data: {
              classTypeId: BigInt(classTypeId),
              instructorId: instructorId ? BigInt(instructorId) : null,
              locationId: BigInt(locationId),
              startsAt: classStartsAt,
              endsAt: classEndsAt,
              capacity: parseInt(capacity),
              status: ClassStatus.SCHEDULED,
              notes: `${template.name} - ${notes || ''}`.trim()
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

          createdClasses.push({
            id: newClass.id.toString(),
            uuid: newClass.uuid,
            startsAt: newClass.startsAt.toISOString(),
            endsAt: newClass.endsAt.toISOString(),
            capacity: newClass.capacity,
            status: newClass.status,
            notes: newClass.notes,
            classType: {
              id: newClass.classType.id.toString(),
              name: newClass.classType.name,
              description: newClass.classType.description,
              durationMinutes: newClass.classType.durationMinutes,
              defaultPrice: Number(newClass.classType.defaultPrice),
              maxCapacity: newClass.classType.maxCapacity
            },
            instructor: newClass.instructor ? {
              id: newClass.instructor.id.toString(),
              name: `${newClass.instructor.user.firstName} ${newClass.instructor.user.lastName}`,
              email: newClass.instructor.user.email
            } : null,
            location: {
              id: newClass.location.id.toString(),
              name: newClass.location.name,
              address: newClass.location.address,
              capacity: newClass.location.capacity
            }
          })
        }
      }

      return NextResponse.json({
        message: `Created ${createdClasses.length} classes using ${template.name} template`,
        classes: createdClasses
      }, { status: 201 })
    }

    // Create single class
    if (!classTypeId || !locationId || !startsAt || !endsAt) {
      return NextResponse.json(
        { error: 'Class type, location, start time, and end time are required' },
        { status: 400 }
      )
    }

    const newClass = await prisma.class.create({
      data: {
        classTypeId: BigInt(classTypeId),
        instructorId: instructorId ? BigInt(instructorId) : null,
        locationId: BigInt(locationId),
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        capacity: parseInt(capacity),
        status: ClassStatus.SCHEDULED,
        notes
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

    const classResponse = {
      id: newClass.id.toString(),
      uuid: newClass.uuid,
      startsAt: newClass.startsAt.toISOString(),
      endsAt: newClass.endsAt.toISOString(),
      capacity: newClass.capacity,
      status: newClass.status,
      notes: newClass.notes,
      classType: {
        id: newClass.classType.id.toString(),
        name: newClass.classType.name,
        description: newClass.classType.description,
        durationMinutes: newClass.classType.durationMinutes,
        defaultPrice: Number(newClass.classType.defaultPrice),
        maxCapacity: newClass.classType.maxCapacity
      },
      instructor: newClass.instructor ? {
        id: newClass.instructor.id.toString(),
        name: `${newClass.instructor.user.firstName} ${newClass.instructor.user.lastName}`,
        email: newClass.instructor.user.email
      } : null,
      location: {
        id: newClass.location.id.toString(),
        name: newClass.location.name,
        address: newClass.location.address,
        capacity: newClass.location.capacity
      }
    }

    return NextResponse.json(classResponse, { status: 201 })

  } catch (error) {
    console.error('Classes POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create class' },
      { status: 500 }
    )
  }
}