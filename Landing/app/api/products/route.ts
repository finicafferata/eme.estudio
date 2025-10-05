import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/products - Public endpoint for visible products
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const categorySlug = searchParams.get('category')
  const featured = searchParams.get('featured')

  const where: any = {
    visible: true
  }

  if (categorySlug && categorySlug !== 'all') {
    where.category = {
      slug: categorySlug
    }
  }

  if (featured === 'true') {
    where.featured = true
  }

  try {
    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        images: {
          orderBy: { order: 'asc' }
        }
      },
      orderBy: [
        { order: 'asc' },
        { created_at: 'desc' }
      ]
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}
