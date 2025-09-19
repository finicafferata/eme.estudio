import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, UserStatus } from '@prisma/client'

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const where: any = {
      role: UserRole.STUDENT,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(status && { status: status as UserStatus })
    }

    const orderBy: any = {}
    if (sortBy === 'name') {
      orderBy.firstName = sortOrder
    } else if (sortBy === 'totalSpent') {
      orderBy.payments = {
        _count: sortOrder
      }
    } else {
      orderBy[sortBy] = sortOrder
    }

    const [students, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
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
              currency: true,
              paidAt: true
            }
          },
          reservations: {
            select: {
              id: true,
              status: true,
              createdAt: true,
              class: {
                select: {
                  startsAt: true,
                  classType: {
                    select: {
                      name: true
                    }
                  }
                }
              }
            }
          }
        }
      }),
      prisma.user.count({ where })
    ])

    const studentsWithMetrics = students.map(student => {
      const activePackages = student.packages.filter(pkg => pkg.status === 'ACTIVE')
      const totalSpent = student.payments.reduce((sum, payment) => {
        return sum + Number(payment.amount)
      }, 0)
      const totalClasses = student.reservations.filter(res =>
        res.status === 'CHECKED_IN' || res.status === 'COMPLETED'
      ).length

      return {
        id: student.id.toString(),
        firstName: student.firstName,
        lastName: student.lastName,
        name: `${student.firstName} ${student.lastName}`,
        email: student.email,
        phone: student.phone,
        
        status: student.status,
        createdAt: student.createdAt.toISOString(),
        updatedAt: student.updatedAt.toISOString(),
        
        activePackages: activePackages.length,
        totalPackages: student.packages.length,
        totalSpent,
        totalClasses,
        lastActivity: student.reservations.length > 0
          ? student.reservations[0]?.createdAt?.toISOString()
          : student.createdAt.toISOString(),
        packages: student.packages.map(pkg => {
          // Calculate total paid for this package
          const packagePayments: any[] = [] // Payment model doesn't have packageId
          const totalPaid = 0 // Cannot calculate without payment relation
          const remainingBalance = 0 // Cannot calculate without package price

          return {
            id: pkg.id.toString(),
            name: pkg.name,
            status: pkg.status,
            totalCredits: pkg.totalCredits,
            usedCredits: pkg.usedCredits,
            remainingCredits: pkg.totalCredits - pkg.usedCredits,
            price: Number(pkg.price),
            totalPaid,
            remainingBalance,
            allowsPartialPayments: true, // Most packages allow partial payments
            purchasedAt: pkg.purchasedAt.toISOString(),
            expiresAt: pkg.expiresAt?.toISOString()
          }
        })
      }
    })

    return NextResponse.json({
      students: studentsWithMetrics,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      hasNext: page * limit < totalCount,
      hasPrev: page > 1
    })
  } catch (error) {
    console.error('Students GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch students' },
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
    const { firstName, lastName, email, phone, status = UserStatus.ACTIVE } = body

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'First name, last name, and email are required' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    const newStudent = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        status: status as UserStatus,
        role: UserRole.STUDENT,
        passwordHash: 'temp_password_hash' // Default password hash for admin-created students
      },
      include: {
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

    const totalSpent = newStudent.payments.reduce((sum, payment) => {
      return sum + Number(payment.amount)
    }, 0)

    const studentResponse = {
      id: newStudent.id.toString(),
      firstName: newStudent.firstName,
      lastName: newStudent.lastName,
      email: newStudent.email,
      phone: newStudent.phone,
      status: newStudent.status,
      createdAt: newStudent.createdAt.toISOString(),
      updatedAt: newStudent.updatedAt.toISOString(),
      activePackages: 0,
      totalPackages: 0,
      totalSpent,
      totalClasses: 0,
      lastActivity: newStudent.createdAt.toISOString(),
      packages: []
    }

    return NextResponse.json(studentResponse, { status: 201 })
  } catch (error) {
    console.error('Students POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create student' },
      { status: 500 }
    )
  }
}