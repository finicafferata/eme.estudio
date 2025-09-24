import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PackageStatus } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const { email, classId } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        status: true,
        packages: {
          where: {
            status: PackageStatus.ACTIVE,
            OR: [
              { expiresAt: null },
              { expiresAt: { gte: new Date() } }
            ]
          },
          select: {
            id: true,
            name: true,
            totalCredits: true,
            usedCredits: true,
            expiresAt: true,
            metadata: true,
            classType: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        },
        reservations: {
          where: {
            registrationType: { not: null }
          },
          select: {
            registrationType: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5 // Check last 5 reservations to determine pattern
        }
      }
    })

    if (!user) {
      // User doesn't exist - they can register as either intensive or recurrent
      return NextResponse.json({
        userExists: false,
        canRegister: true,
        hasExistingReservation: false,
        registrationOptions: {
          intensive: {
            available: true,
            frameSize: 'SMALL', // Fixed frame size for intensive
            requiresPayment: true,
            paymentDeadlineHours: 24
          },
          recurrent: {
            available: true,
            frameSizes: ['SMALL', 'MEDIUM', 'LARGE'],
            requiresPayment: true,
            paymentDeadlineHours: 24
          }
        }
      })
    }

    // Check if user already has a reservation for this specific class
    let hasExistingReservation = false
    if (classId) {
      const existingReservation = await prisma.reservation.findFirst({
        where: {
          userId: user.id,
          classId: BigInt(classId),
          status: {
            in: ['CONFIRMED', 'CHECKED_IN'] // Only check confirmed/active reservations
          }
        }
      })
      hasExistingReservation = !!existingReservation
    }

    // User exists - check their packages
    const activePackages = user.packages.map(pkg => {
      const remainingCredits = pkg.totalCredits - pkg.usedCredits
      const isIntensive = pkg.metadata &&
        typeof pkg.metadata === 'object' &&
        'type' in pkg.metadata &&
        (pkg.metadata as any).type === 'intensive'

      return {
        id: pkg.id.toString(),
        name: pkg.name,
        remainingCredits,
        expiresAt: pkg.expiresAt?.toISOString() || null,
        type: isIntensive ? 'intensive' : 'recurrent',
        classType: pkg.classType
      }
    })

    // Check user's registration history to determine preference
    let preferredType = null
    let autoSelectType = false

    if (user.reservations && user.reservations.length > 0) {
      // Count registration types from recent reservations
      const typeCounts = user.reservations.reduce((acc, r) => {
        if (r.registrationType) {
          acc[r.registrationType] = (acc[r.registrationType] || 0) + 1
        }
        return acc
      }, {} as Record<string, number>)

      // If user has consistently used one type, auto-select it
      if (typeCounts['RECURRENT'] && !typeCounts['INTENSIVE']) {
        preferredType = 'RECURRENT'
        autoSelectType = true
      } else if (typeCounts['INTENSIVE'] && !typeCounts['RECURRENT']) {
        preferredType = 'INTENSIVE'
        autoSelectType = true
      } else if (typeCounts['RECURRENT'] > (typeCounts['INTENSIVE'] || 0)) {
        preferredType = 'RECURRENT'
        autoSelectType = true
      } else if (typeCounts['INTENSIVE'] > (typeCounts['RECURRENT'] || 0)) {
        preferredType = 'INTENSIVE'
        autoSelectType = true
      }
    }

    // Determine registration options based on packages
    const hasIntensivePackage = activePackages.some(pkg => pkg.type === 'intensive' && pkg.remainingCredits > 0)
    const hasRecurrentPackage = activePackages.some(pkg => pkg.type === 'recurrent' && pkg.remainingCredits > 0)

    const registrationOptions = {
      intensive: {
        available: true,
        hasPackage: hasIntensivePackage,
        frameSize: 'SMALL', // Always SMALL for intensive
        requiresPayment: !hasIntensivePackage, // Only if no package
        paymentDeadlineHours: 24,
        suggestedPackages: hasIntensivePackage
          ? activePackages.filter(pkg => pkg.type === 'intensive' && pkg.remainingCredits > 0)
          : []
      },
      recurrent: {
        available: true,
        hasPackage: hasRecurrentPackage,
        frameSizes: ['SMALL', 'MEDIUM', 'LARGE'],
        requiresPayment: !hasRecurrentPackage, // Only if no package
        paymentDeadlineHours: 24,
        suggestedPackages: hasRecurrentPackage
          ? activePackages.filter(pkg => pkg.type === 'recurrent' && pkg.remainingCredits > 0)
          : []
      }
    }

    return NextResponse.json({
      userExists: true,
      canRegister: !hasExistingReservation, // Can't register if already has reservation
      hasExistingReservation,
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        hasActivePackages: activePackages.length > 0
      },
      packages: activePackages,
      registrationOptions: hasExistingReservation ? null : registrationOptions, // Don't show options if already registered
      preferredType,
      autoSelectType
    })

  } catch (error) {
    console.error('Error checking user packages:', error)
    return NextResponse.json(
      { error: 'Failed to check user packages' },
      { status: 500 }
    )
  }
}