import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, UserStatus } from '@prisma/client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth()

    if (!session || (session.user as any).role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { userId } = await params

    if (!userId) {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 })
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    if (user.status !== UserStatus.PENDING_ACTIVATION) {
      return NextResponse.json(
        { error: 'El usuario no está pendiente de activación' },
        { status: 400 }
      )
    }

    // Activate the user
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        status: UserStatus.ACTIVE,
        activationToken: null,
        activationTokenExpiresAt: null,
        emailVerifiedAt: new Date()
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
        updatedAt: true
      }
    })

    // Log the activation
    await prisma.auditLog.create({
      data: {
        userId: BigInt((session.user as any).id),
        action: 'USER_ACTIVATED',
        entityType: 'User',
        entityId: user.id.toString(),
        details: {
          activatedUserId: user.id.toString(),
          activatedUserEmail: user.email,
          activatedUserName: `${user.firstName} ${user.lastName}`,
          previousStatus: UserStatus.PENDING_ACTIVATION,
          newStatus: UserStatus.ACTIVE
        }
      }
    })

    return NextResponse.json({
      message: 'Usuario activado exitosamente',
      user: {
        ...updatedUser,
        id: updatedUser.id.toString()
      }
    })

  } catch (error) {
    console.error('Error activating user:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}