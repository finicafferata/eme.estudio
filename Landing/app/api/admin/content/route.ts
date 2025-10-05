import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/admin/content - Get all content
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const content = await prisma.content.findMany({
    orderBy: { key: 'asc' }
  })

  return NextResponse.json(content)
}

// PATCH /api/admin/content - Update content
export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { updates } = body // Array of { key, value }

    if (!Array.isArray(updates)) {
      return NextResponse.json(
        { error: 'Updates must be an array' },
        { status: 400 }
      )
    }

    // Update all content items
    await Promise.all(
      updates.map(({ key, value }) =>
        prisma.content.upsert({
          where: { key },
          update: { value },
          create: { key, value }
        })
      )
    )

    const content = await prisma.content.findMany({
      orderBy: { key: 'asc' }
    })

    return NextResponse.json(content)
  } catch (error) {
    console.error('Error updating content:', error)
    return NextResponse.json(
      { error: 'Failed to update content' },
      { status: 500 }
    )
  }
}
