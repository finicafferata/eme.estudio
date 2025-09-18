import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all available options for class creation
    const [instructors, locations, classTypes] = await Promise.all([
      // Get instructors (Male and Meri)
      prisma.instructor.findMany({
        where: {
          isAvailable: true
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
        },
        orderBy: {
          user: {
            firstName: 'asc'
          }
        }
      }),

      // Get all active locations
      prisma.location.findMany({
        where: {
          isActive: true
        },
        orderBy: {
          name: 'asc'
        }
      }),

      // Get all active class types
      prisma.classType.findMany({
        where: {
          isActive: true
        },
        orderBy: {
          name: 'asc'
        }
      })
    ])

    const options = {
      instructors: instructors.map(instructor => ({
        id: instructor.id.toString(),
        name: `${instructor.user.firstName} ${instructor.user.lastName}`,
        firstName: instructor.user.firstName,
        lastName: instructor.user.lastName,
        email: instructor.user.email,
        specialties: instructor.specialties,
        hourlyRate: instructor.hourlyRate ? Number(instructor.hourlyRate) : null,
        isAvailable: instructor.isAvailable
      })),

      locations: locations.map(location => ({
        id: location.id.toString(),
        name: location.name,
        address: location.address,
        capacity: location.capacity,
        amenities: location.amenities
      })),

      classTypes: classTypes.map(classType => ({
        id: classType.id.toString(),
        name: classType.name,
        description: classType.description,
        durationMinutes: classType.durationMinutes,
        defaultPrice: Number(classType.defaultPrice),
        maxCapacity: classType.maxCapacity
      })),

      // EME Studio predefined schedules
      scheduleTemplates: {
        morning_weekdays: {
          name: 'Morning Classes (Mon-Sat)',
          description: 'Monday to Saturday 10:00am - 12:30pm',
          days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          startTime: '10:00',
          endTime: '12:30',
          duration: 150
        },
        afternoon_tue_thu: {
          name: 'Afternoon Classes (Tue/Thu)',
          description: 'Tuesday and Thursday 3:00pm - 5:30pm',
          days: ['Tuesday', 'Thursday'],
          startTime: '15:00',
          endTime: '17:30',
          duration: 150
        },
        afternoon_friday: {
          name: 'Afternoon Friday',
          description: 'Friday 2:00pm - 4:30pm',
          days: ['Friday'],
          startTime: '14:00',
          endTime: '16:30',
          duration: 150
        },
        evening_mon_wed: {
          name: 'Evening Classes (Mon/Wed)',
          description: 'Monday and Wednesday 6:00pm - 8:30pm',
          days: ['Monday', 'Wednesday'],
          startTime: '18:00',
          endTime: '20:30',
          duration: 150
        }
      },

      // Package types that can be linked to classes
      packageTypes: [
        {
          name: 'Intensivo',
          description: 'Intensive package allowing partial payments',
          allowsPartialPayments: true
        },
        {
          name: 'Recurrente',
          description: 'Recurring package requiring full payment',
          allowsPartialPayments: false
        }
      ]
    }

    return NextResponse.json(options)

  } catch (error) {
    console.error('Class options GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch class options' },
      { status: 500 }
    )
  }
}