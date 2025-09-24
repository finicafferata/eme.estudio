import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, UserStatus, ReservationStatus } from '@prisma/client'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const studentId = BigInt(params.id)
    if (!params.id || isNaN(Number(params.id))) {
      return NextResponse.json({ error: 'Invalid student ID' }, { status: 400 })
    }

    const student = await prisma.user.findUnique({
      where: {
        id: studentId,
        role: UserRole.STUDENT
      },
      include: {
        packages: {
          include: {
            classType: {
              select: {
                name: true,
              }
            }
          },
          orderBy: {
            purchasedAt: 'desc'
          }
        },
        payments: {
          where: {
            status: 'COMPLETED'
          },
          orderBy: {
            paidAt: 'desc'
          }
        },
        reservations: {
          include: {
            class: {
              include: {
                classType: {
                  select: {
                    name: true
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
                    name: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const activePackages = student.packages.filter(pkg => pkg.status === 'ACTIVE')
    const totalSpent = student.payments.reduce((sum, payment) => {
      return sum + Number(payment.amount)
    }, 0)

    const attendedClasses = student.reservations.filter(res =>
      res.status === ReservationStatus.CHECKED_IN || res.status === ReservationStatus.COMPLETED
    ).length

    const upcomingClasses = student.reservations.filter(res =>
      res.status === ReservationStatus.CONFIRMED &&
      new Date(res.class.startsAt) > new Date()
    )

    const studentDetails = {
      id: student.id.toString(),
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      phone: student.phone,
      instagram: student.instagramHandle,
      notes: student.notes,
      status: student.status,
      
      createdAt: student.createdAt.toISOString(),
      updatedAt: student.updatedAt.toISOString(),
      metrics: {
        activePackages: activePackages.length,
        totalPackages: student.packages.length,
        totalSpent,
        attendedClasses,
        upcomingClasses: upcomingClasses.length,
        totalCreditsRemaining: activePackages.reduce((sum, pkg) =>
          sum + (pkg.totalCredits - pkg.usedCredits), 0
        )
      },
      packages: student.packages.map(pkg => ({
        id: pkg.id.toString(),
        name: pkg.name,
        status: pkg.status,
        totalCredits: pkg.totalCredits,
        usedCredits: pkg.usedCredits,
        remainingCredits: pkg.totalCredits - pkg.usedCredits,
        price: Number(pkg.price),
        purchasedAt: pkg.purchasedAt.toISOString(),
        expiresAt: pkg.expiresAt?.toISOString(),
        classType: pkg.classType ? {
          name: pkg.classType.name,
          color: "#3B82F6"
        } : null
      })),
      payments: student.payments.map(payment => ({
        id: payment.id.toString(),
        amount: Number(payment.amount),
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        paidAt: payment.paidAt?.toISOString(),
        description: payment.description
      })),
      classHistory: student.reservations.map(reservation => ({
        id: reservation.id.toString(),
        status: reservation.status,
        createdAt: reservation.createdAt.toISOString(),
        class: {
          id: reservation.class.id.toString(),
          startsAt: reservation.class.startsAt.toISOString(),
          endsAt: reservation.class.endsAt.toISOString(),
          className: reservation.class.classType.name,
          instructor: reservation.class.instructor ?
            `${reservation.class.instructor.user.firstName} ${reservation.class.instructor.user.lastName}` :
            'Sin instructor',
          location: reservation.class.location.name
        }
      }))
    }

    return NextResponse.json(studentDetails)
  } catch (error) {
    console.error('Student GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch student details' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  let studentId: BigInt | undefined
  let firstName: string | undefined
  let lastName: string | undefined
  let email: string | undefined
  let phone: string | undefined
  let instagram: string | undefined
  let notes: string | undefined
  let status: string | undefined

  try {
    const params = await context.params
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    studentId = BigInt(params.id)
    if (!params.id || isNaN(Number(params.id))) {
      return NextResponse.json({ error: 'Invalid student ID' }, { status: 400 })
    }

    const body = await request.json()
    const requestBody = body as { firstName: string; lastName: string; email: string; phone?: string; instagram?: string; notes?: string; status?: string }
    firstName = requestBody.firstName
    lastName = requestBody.lastName
    email = requestBody.email
    phone = requestBody.phone
    instagram = requestBody.instagram
    notes = requestBody.notes
    status = requestBody.status

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'First name, last name, and email are required' },
        { status: 400 }
      )
    }

    // Check if student exists
    const existingStudent = await prisma.user.findUnique({
      where: {
        id: studentId,
        role: UserRole.STUDENT
      }
    })

    if (!existingStudent) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Check if email is already taken by another user
    if (email !== existingStudent.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email }
      })

      if (emailExists) {
        return NextResponse.json(
          { error: 'Email is already taken by another user' },
          { status: 409 }
        )
      }
    }

    const updatedStudent = await prisma.user.update({
      where: { id: studentId },
      data: {
        firstName,
        lastName,
        email,
        phone,
        instagramHandle: instagram,
        notes,
        ...(status && { status: status as UserStatus })
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        instagramHandle: true,
        notes: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        packages: {
          select: {
            id: true,
            name: true,
            status: true,
            totalCredits: true,
            usedCredits: true,
            price: true,
            purchasedAt: true,
            expiresAt: true
          }
        },
        payments: {
          where: {
            status: 'COMPLETED'
          },
          select: {
            amount: true,
            currency: true
          }
        }
      }
    })

    const activePackages = updatedStudent.packages.filter(pkg => pkg.status === 'ACTIVE')
    const totalSpent = updatedStudent.payments.reduce((sum, payment) => {
      return sum + Number(payment.amount)
    }, 0)

    const studentResponse = {
      id: updatedStudent.id.toString(),
      firstName: updatedStudent.firstName,
      lastName: updatedStudent.lastName,
      email: updatedStudent.email,
      phone: updatedStudent.phone,
      instagram: updatedStudent.instagramHandle,
      notes: updatedStudent.notes,
      status: updatedStudent.status,
      
      createdAt: updatedStudent.createdAt.toISOString(),
      updatedAt: updatedStudent.updatedAt.toISOString(),
      activePackages: activePackages.length,
      totalPackages: updatedStudent.packages.length,
      totalSpent,
      packages: updatedStudent.packages.map(pkg => ({
        id: pkg.id.toString(),
        name: pkg.name,
        status: pkg.status,
        totalCredits: pkg.totalCredits,
        usedCredits: pkg.usedCredits,
        remainingCredits: pkg.totalCredits - pkg.usedCredits,
        price: Number(pkg.price),
        purchasedAt: pkg.purchasedAt.toISOString(),
        expiresAt: pkg.expiresAt?.toISOString()
      }))
    }

    return NextResponse.json(studentResponse)
  } catch (error) {
    console.error('Student PUT error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      studentId,
      updatedData: { firstName, lastName, email, phone, instagram, notes, status }
    })
    return NextResponse.json(
      { error: 'Failed to update student' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const studentId = BigInt(params.id)
    if (!params.id || isNaN(Number(params.id))) {
      return NextResponse.json({ error: 'Invalid student ID' }, { status: 400 })
    }

    // Check if student exists and has no active packages or pending payments
    const student = await prisma.user.findUnique({
      where: {
        id: studentId,
        role: UserRole.STUDENT
      },
      include: {
        packages: {
          where: {
            status: 'ACTIVE'
          }
        },
        payments: {
          where: {
            status: 'PENDING'
          }
        },
        reservations: {
          where: {
            status: {
              in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN]
            }
          }
        }
      }
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    if (student.packages.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete student with active packages' },
        { status: 400 }
      )
    }

    if (student.payments.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete student with pending payments' },
        { status: 400 }
      )
    }

    if (student.reservations.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete student with active reservations' },
        { status: 400 }
      )
    }

    // Soft delete - change status to INACTIVE instead of actual deletion
    await prisma.user.update({
      where: { id: studentId },
      data: {
        status: UserStatus.INACTIVE,
        email: `deleted_${Date.now()}_${student.email}` // Prevent email conflicts
      }
    })

    return NextResponse.json({ message: 'Student deleted successfully' })
  } catch (error) {
    console.error('Student DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete student' },
      { status: 500 }
    )
  }
}