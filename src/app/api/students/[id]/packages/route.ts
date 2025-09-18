import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, PackageStatus } from '@prisma/client'

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

    const studentId = parseInt(params.id)
    if (isNaN(studentId)) {
      return NextResponse.json({ error: 'Invalid student ID' }, { status: 400 })
    }

    // Verify student exists
    const student = await prisma.user.findUnique({
      where: {
        id: studentId,
        role: UserRole.STUDENT
      }
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const packages = await prisma.package.findMany({
      where: {
        userId: studentId
      },
      include: {
        classType: {
          select: {
            id: true,
            name: true,
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
      },
      orderBy: {
        purchasedAt: 'desc'
      }
    })

    const packagesWithDetails = packages.map(pkg => {
      const usagePercentage = pkg.totalCredits > 0
        ? (pkg.usedCredits / pkg.totalCredits) * 100
        : 0

      const isExpired = pkg.expiresAt && new Date(pkg.expiresAt) < new Date()
      const daysUntilExpiry = pkg.expiresAt
        ? Math.ceil((new Date(pkg.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : null

      return {
        id: pkg.id.toString(),
        name: pkg.name,
        description: "Package description",
        status: pkg.status,
        totalCredits: pkg.totalCredits,
        usedCredits: pkg.usedCredits,
        remainingCredits: pkg.totalCredits - pkg.usedCredits,
        usagePercentage: Math.round(usagePercentage),
        price: Number(pkg.price),
        purchasedAt: pkg.purchasedAt.toISOString(),
        expiresAt: pkg.expiresAt?.toISOString(),
        isExpired,
        daysUntilExpiry,
        classType: pkg.classType ? {
          id: pkg.classType.id.toString(),
          name: pkg.classType.name,
          color: "#3B82F6",
          description: "Class type description"
        } : null,
        usageHistory: pkg.reservations.map(reservation => ({
          id: reservation.id.toString(),
          status: reservation.status,
          createdAt: reservation.createdAt.toISOString(),
          creditsUsed: 1,
          class: {
            id: reservation.class.id.toString(),
            startsAt: reservation.class.startsAt.toISOString(),
            className: reservation.class.classType.name,
            instructor: reservation.class.instructor
              ? `${reservation.class.instructor.user.firstName} ${reservation.class.instructor.user.lastName}`
              : 'Sin instructor',
            location: reservation.class.location.name
          }
        }))
      }
    })

    // Calculate summary stats
    const activePackages = packagesWithDetails.filter(pkg => pkg.status === PackageStatus.ACTIVE)
    const totalCreditsRemaining = activePackages.reduce((sum, pkg) => sum + pkg.remainingCredits, 0)
    const totalCreditsUsed = packagesWithDetails.reduce((sum, pkg) => sum + pkg.usedCredits, 0)
    const totalCreditsEverPurchased = packagesWithDetails.reduce((sum, pkg) => sum + pkg.totalCredits, 0)
    const totalSpentOnPackages = packagesWithDetails.reduce((sum, pkg) => sum + pkg.price, 0)

    const summary = {
      totalPackages: packagesWithDetails.length,
      activePackages: activePackages.length,
      totalCreditsRemaining,
      totalCreditsUsed,
      totalCreditsEverPurchased,
      totalSpentOnPackages,
      overallUsagePercentage: totalCreditsEverPurchased > 0
        ? Math.round((totalCreditsUsed / totalCreditsEverPurchased) * 100)
        : 0,
      packagesExpiringSoon: activePackages.filter(pkg =>
        pkg.daysUntilExpiry !== null && pkg.daysUntilExpiry <= 30 && pkg.daysUntilExpiry > 0
      ).length
    }

    return NextResponse.json({
      packages: packagesWithDetails,
      summary
    })
  } catch (error) {
    console.error('Student packages GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch student packages' },
      { status: 500 }
    )
  }
}

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

    const studentId = parseInt(params.id)
    if (isNaN(studentId)) {
      return NextResponse.json({ error: 'Invalid student ID' }, { status: 400 })
    }

    // Verify student exists
    const student = await prisma.user.findUnique({
      where: {
        id: studentId,
        role: UserRole.STUDENT
      }
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const body = await request.json()
    const {
      name,
      totalCredits,
      price,
      classTypeId,
      expiresInDays
    } = body

    if (!name || !totalCredits || !price || totalCredits < 1) {
      return NextResponse.json(
        { error: 'Name, total credits (minimum 1), and price are required' },
        { status: 400 }
      )
    }

    // Verify class type exists if provided
    if (classTypeId) {
      const classType = await prisma.classType.findUnique({
        where: { id: parseInt(classTypeId) }
      })

      if (!classType) {
        return NextResponse.json(
          { error: 'Invalid class type' },
          { status: 400 }
        )
      }
    }

    // Calculate expiry date if provided
    let expiresAt = null
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays))
    }

    const newPackage = await prisma.package.create({
      data: {
        name,
        totalCredits: parseInt(totalCredits),
        usedCredits: 0,
        price: parseFloat(price),
        status: PackageStatus.ACTIVE,
        userId: studentId,
        classTypeId: classTypeId ? parseInt(classTypeId) : null,
        purchasedAt: new Date(),
        expiresAt
      },
      include: {
        classType: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    const packageResponse = {
      id: newPackage.id.toString(),
      name: newPackage.name,
      description: "Package description",
      status: newPackage.status,
      totalCredits: newPackage.totalCredits,
      usedCredits: newPackage.usedCredits,
      remainingCredits: newPackage.totalCredits - newPackage.usedCredits,
      usagePercentage: 0,
      price: Number(newPackage.price),
      purchasedAt: newPackage.purchasedAt.toISOString(),
      expiresAt: newPackage.expiresAt?.toISOString(),
      isExpired: false,
      daysUntilExpiry: expiresInDays || null,
      classType: newPackage.classType ? {
        id: newPackage.classType.id.toString(),
        name: newPackage.classType.name,
        color: "#3B82F6",
        description: "Class type description"
      } : null,
      usageHistory: []
    }

    return NextResponse.json(packageResponse, { status: 201 })
  } catch (error) {
    console.error('Student packages POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create package' },
      { status: 500 }
    )
  }
}