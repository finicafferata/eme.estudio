import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { ProductForm } from "@/components/admin/ProductForm"

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      images: {
        orderBy: { order: 'asc' }
      }
    }
  })

  if (!product) {
    notFound()
  }

  const initialData = {
    id: product.id,
    title: product.title,
    description: product.description,
    category_id: product.category_id || '',
    featured: product.featured,
    visible: product.visible,
    images: product.images.map(img => ({
      cloudinary_id: img.cloudinary_id,
      url: img.url,
      thumbnail_url: img.thumbnail_url,
      alt_text: img.alt_text || undefined
    }))
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-display tracking-tight mb-2">Edit Product</h1>
          <p className="text-neutral-600">{product.title}</p>
        </div>

        <div className="bg-white rounded-sm shadow-sm p-6">
          <ProductForm initialData={initialData} isEdit />
        </div>
      </div>
    </div>
  )
}
