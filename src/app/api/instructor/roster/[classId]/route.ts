import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id || session.user.role !== 'INSTRUCTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { classId } = await params

    // Get instructor record
    const instructor = await prisma.instructor.findUnique({
      where: {
        userId: BigInt(session.user.id),
      },
    })

    if (!instructor) {
      return NextResponse.json({ error: 'Instructor not found' }, { status: 404 })
    }

    // Get class details with full student roster
    const classDetails = await prisma.class.findUnique({
      where: {
        id: BigInt(classId),
        instructorId: instructor.id, // Ensure instructor can only see their own classes
      },
      include: {
        classType: {
          select: {
            name: true,
            slug: true,
            description: true,
            durationMinutes: true,
            defaultPrice: true,
          },
        },
        location: {
          select: {
            name: true,
            address: true,
            capacity: true,
          },
        },
        reservations: {
          where: {
            status: {
              in: ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'],
            },
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                instagramHandle: true,
                registeredAt: true,
              },
            },
            package: {
              include: {
                classType: {
                  select: {
                    name: true,
                    slug: true,
                  },
                },
              },
            },
          },
          orderBy: {
            reservedAt: 'asc',
          },
        },
        waitlist: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
          orderBy: {
            priority: 'asc',
          },
        },
      },
    })

    if (!classDetails) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    // Get detailed student information for each enrolled student
    const studentIds = classDetails.reservations.map(r => r.user.id)

    // Get student experience data
    const studentExperience = await Promise.all(
      studentIds.map(async (studentId) => {
        // Count total classes attended by this student
        const totalClassesAttended = await prisma.reservation.count({
          where: {
            userId: studentId,
            status: {
              in: ['CHECKED_IN', 'COMPLETED'],
            },
          },
        })

        // Count classes with this instructor specifically
        const classesWithInstructor = await prisma.reservation.count({
          where: {
            userId: studentId,
            status: {
              in: ['CHECKED_IN', 'COMPLETED'],
            },
            class: {
              instructorId: instructor.id,
            },
          },
        })

        // Get student's packages to understand their journey
        const studentPackages = await prisma.package.findMany({
          where: {
            userId: studentId,
          },
          include: {
            classType: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
          orderBy: {
            purchasedAt: 'desc',
          },
        })

        // Get recent reservations to understand patterns
        const recentReservations = await prisma.reservation.findMany({
          where: {
            userId: studentId,
          },
          include: {
            class: {
              select: {
                startsAt: true,
                classType: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            reservedAt: 'desc',
          },
          take: 5,
        })

        return {
          studentId,
          totalClassesAttended,
          classesWithInstructor,
          studentPackages,
          recentReservations,
          experienceLevel: getExperienceLevel(totalClassesAttended),
          isReturningStudent: classesWithInstructor > 0,
        }
      })
    )

    // Transform the data for the roster
    const roster = classDetails.reservations.map(reservation => {
      const studentExp = studentExperience.find(exp => exp.studentId === reservation.user.id)

      return {
        reservation: {
          id: reservation.id.toString(),
          status: reservation.status,
          reservedAt: reservation.reservedAt,
          checkedInAt: reservation.checkedInAt,
          notes: reservation.notes,
        },
        student: {
          id: reservation.user.id.toString(),
          name: `${reservation.user.firstName} ${reservation.user.lastName}`,
          firstName: reservation.user.firstName,
          lastName: reservation.user.lastName,
          email: reservation.user.email,
          phone: reservation.user.phone,
          instagramHandle: reservation.user.instagramHandle,
          registeredAt: reservation.user.registeredAt,
          experienceLevel: studentExp?.experienceLevel || 'beginner',
          totalClassesAttended: studentExp?.totalClassesAttended || 0,
          classesWithInstructor: studentExp?.classesWithInstructor || 0,
          isReturningStudent: studentExp?.isReturningStudent || false,
          recentReservations: studentExp?.recentReservations || [],
        },
        package: reservation.package ? {
          id: reservation.package.id.toString(),
          name: reservation.package.name,
          type: reservation.package.classType?.name || 'Unknown',
          typeSlug: reservation.package.classType?.slug || 'unknown',
          totalCredits: reservation.package.totalCredits,
          usedCredits: reservation.package.usedCredits,
          remainingCredits: reservation.package.totalCredits - reservation.package.usedCredits,
          status: reservation.package.status,
          purchasedAt: reservation.package.purchasedAt,
          expiresAt: reservation.package.expiresAt,
        } : null,
        studentHistory: {
          packages: studentExp?.studentPackages.map(pkg => ({
            id: pkg.id.toString(),
            name: pkg.name,
            type: pkg.classType?.name || 'Unknown',
            totalCredits: pkg.totalCredits,
            usedCredits: pkg.usedCredits,
            status: pkg.status,
            purchasedAt: pkg.purchasedAt,
          })) || [],
          recentClasses: studentExp?.recentReservations.map(res => ({
            date: res.class.startsAt,
            classType: res.class.classType.name,
            status: res.status,
          })) || [],
        },
      }
    })

    const response = {
      class: {
        id: classDetails.id.toString(),
        uuid: classDetails.uuid,
        title: classDetails.classType.name,
        description: classDetails.classType.description,
        startsAt: classDetails.startsAt,
        endsAt: classDetails.endsAt,
        status: classDetails.status,
        capacity: classDetails.capacity,
        price: Number(classDetails.classType.defaultPrice),
        location: classDetails.location,
        notes: classDetails.notes,
      },
      roster,
      waitlist: classDetails.waitlist.map(wait => ({
        id: wait.id.toString(),
        student: {
          id: wait.user.id.toString(),
          name: `${wait.user.firstName} ${wait.user.lastName}`,
          email: wait.user.email,
          phone: wait.user.phone,
        },
        priority: wait.priority,
        addedAt: wait.createdAt,
      })),
      summary: {
        totalEnrolled: roster.length,
        totalWaitlist: classDetails.waitlist.length,
        beginners: roster.filter(r => r.student.experienceLevel === 'beginner').length,
        returning: roster.filter(r => r.student.isReturningStudent).length,
        intensivoStudents: roster.filter(r => r.package?.typeSlug === 'intensivo').length,
        recurrenteStudents: roster.filter(r => r.package?.typeSlug === 'recurrente').length,
        averageExperience: roster.length > 0
          ? Math.round(roster.reduce((sum, r) => sum + r.student.totalClassesAttended, 0) / roster.length)
          : 0,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Roster fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch class roster' },
      { status: 500 }
    )
  }
}

function getExperienceLevel(totalClasses: number): 'beginner' | 'intermediate' | 'advanced' {
  if (totalClasses === 0) return 'beginner'
  if (totalClasses <= 5) return 'beginner'
  if (totalClasses <= 15) return 'intermediate'
  return 'advanced'
}