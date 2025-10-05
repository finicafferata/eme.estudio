import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/utils'

// GET /api/admin/products - List all products
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const categoryId = searchParams.get('categoryId')
  const search = searchParams.get('search')

  const where: any = {}

  if (categoryId && categoryId !== 'all') {
    where.category_id = categoryId
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ]
  }

  const products = await prisma.product.findMany({
    where,
    include: {
      category: true,
      images: {
        orderBy: { order: 'asc' },
        take: 1
      }
    },
    orderBy: [
      { order: 'asc' },
      { created_at: 'desc' }
    ]
  })

  return NextResponse.json(products)
}

// POST /api/admin/products - Create new product
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { title, description, category_id, featured, visible, images } = body

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      )
    }

    // Generate unique slug
    let slug = slugify(title)
    let slugExists = await prisma.product.findUnique({ where: { slug } })
    let counter = 1

    while (slugExists) {
      slug = `${slugify(title)}-${counter}`
      slugExists = await prisma.product.findUnique({ where: { slug } })
      counter++
    }

    // Get max order for new products
    const maxOrder = await prisma.product.findFirst({
      orderBy: { order: 'desc' },
      select: { order: true }
    })

    const product = await prisma.product.create({
      data: {
        title,
        description,
        slug,
        category_id: category_id || null,
        featured: featured || false,
        visible: visible !== undefined ? visible : true,
        order: (maxOrder?.order || 0) + 1,
        images: images ? {
          create: images.map((img: any, index: number) => ({
            cloudinary_id: img.cloudinary_id,
            url: img.url,
            thumbnail_url: img.thumbnail_url,
            alt_text: img.alt_text || title,
            order: index
          }))
        } : undefined
      },
      include: {
        category: true,
        images: true
      }
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    )
  }
}
