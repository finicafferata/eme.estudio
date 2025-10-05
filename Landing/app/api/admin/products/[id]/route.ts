import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/utils'
import { deleteFromCloudinary } from '@/lib/cloudinary'

// GET /api/admin/products/[id] - Get single product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      images: {
        orderBy: { order: 'asc' }
      }
    }
  })

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  return NextResponse.json(product)
}

// PATCH /api/admin/products/[id] - Update product
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { title, description, category_id, featured, visible, images } = body

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      )
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: { images: true }
    })

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Generate new slug if title changed
    let slug = existingProduct.slug
    if (title !== existingProduct.title) {
      slug = slugify(title)
      let slugExists = await prisma.product.findUnique({
        where: { slug },
        select: { id: true }
      })
      let counter = 1

      while (slugExists && slugExists.id !== id) {
        slug = `${slugify(title)}-${counter}`
        slugExists = await prisma.product.findUnique({
          where: { slug },
          select: { id: true }
        })
        counter++
      }
    }

    // Handle image updates
    let imageOperations = {}
    if (images !== undefined) {
      // Delete removed images from Cloudinary
      const newImageIds = images.map((img: any) => img.cloudinary_id)
      const imagesToDelete = existingProduct.images.filter(
        img => !newImageIds.includes(img.cloudinary_id)
      )

      for (const img of imagesToDelete) {
        try {
          await deleteFromCloudinary(img.cloudinary_id)
        } catch (error) {
          console.error('Error deleting image from Cloudinary:', error)
        }
      }

      // Delete all existing images and recreate
      imageOperations = {
        deleteMany: {},
        create: images.map((img: any, index: number) => ({
          cloudinary_id: img.cloudinary_id,
          url: img.url,
          thumbnail_url: img.thumbnail_url,
          alt_text: img.alt_text || title,
          order: index
        }))
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        title,
        description,
        slug,
        category_id: category_id || null,
        featured: featured || false,
        visible: visible !== undefined ? visible : true,
        images: imageOperations
      },
      include: {
        category: true,
        images: {
          orderBy: { order: 'asc' }
        }
      }
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/products/[id] - Delete product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const product = await prisma.product.findUnique({
      where: { id },
      include: { images: true }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Delete images from Cloudinary
    for (const image of product.images) {
      try {
        await deleteFromCloudinary(image.cloudinary_id)
      } catch (error) {
        console.error('Error deleting image from Cloudinary:', error)
      }
    }

    // Delete product (images will cascade delete)
    await prisma.product.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    )
  }
}
