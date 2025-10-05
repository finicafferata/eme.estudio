import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/content - Public endpoint for content
export async function GET() {
  try {
    const content = await prisma.content.findMany()

    // Convert to key-value object for easier use
    const contentObj = content.reduce((acc, item) => {
      acc[item.key] = item.value
      return acc
    }, {} as Record<string, string>)

    return NextResponse.json(contentObj)
  } catch (error) {
    console.error('Error fetching content:', error)
    return NextResponse.json(
      { error: 'Failed to fetch content' },
      { status: 500 }
    )
  }
}
