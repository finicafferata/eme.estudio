"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ImageUploader } from "./ImageUploader"

interface Category {
  id: string
  name: string
}

interface ProductFormData {
  id?: string
  title: string
  description: string
  category_id: string
  featured: boolean
  visible: boolean
  images: Array<{
    cloudinary_id: string
    url: string
    thumbnail_url: string
    alt_text?: string
  }>
}

interface ProductFormProps {
  initialData?: ProductFormData
  isEdit?: boolean
}

export function ProductForm({ initialData, isEdit = false }: ProductFormProps) {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState<ProductFormData>({
    title: '',
    description: '',
    category_id: '',
    featured: false,
    visible: true,
    images: [],
    ...initialData
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/categories')
      if (res.ok) {
        const data = await res.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    } else if (formData.title.length > 200) {
      newErrors.title = 'Title must be less than 200 characters'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    } else if (formData.description.length > 2000) {
      newErrors.description = 'Description must be less than 2000 characters'
    }

    if (formData.images.length === 0) {
      newErrors.images = 'At least one image is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    setIsLoading(true)

    try {
      const url = isEdit
        ? `/api/admin/products/${initialData?.id}`
        : '/api/admin/products'

      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        router.push('/admin/products')
        router.refresh()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to save product')
      }
    } catch (error) {
      console.error('Error saving product:', error)
      alert('Failed to save product')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-2">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className={`w-full px-4 py-2 border rounded-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent ${
            errors.title ? 'border-red-500' : 'border-neutral-300'
          }`}
          placeholder="e.g., Sunset Waves Rug"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-500">{errors.title}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-2">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={6}
          className={`w-full px-4 py-2 border rounded-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent ${
            errors.description ? 'border-red-500' : 'border-neutral-300'
          }`}
          placeholder="Describe your piece, materials used, dimensions, inspiration, etc."
        />
        <div className="flex items-center justify-between mt-1">
          {errors.description ? (
            <p className="text-sm text-red-500">{errors.description}</p>
          ) : (
            <p className="text-sm text-neutral-500">
              {formData.description.length} / 2000 characters
            </p>
          )}
        </div>
      </div>

      {/* Category */}
      <div>
        <label htmlFor="category" className="block text-sm font-medium mb-2">
          Category
        </label>
        <select
          id="category"
          value={formData.category_id}
          onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
          className="w-full px-4 py-2 border border-neutral-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
        >
          <option value="">No category</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Images */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Images <span className="text-red-500">*</span>
        </label>
        <ImageUploader
          images={formData.images}
          onChange={(images) => setFormData({ ...formData, images })}
          maxImages={10}
        />
        {errors.images && (
          <p className="mt-2 text-sm text-red-500">{errors.images}</p>
        )}
        <p className="mt-2 text-sm text-neutral-500">
          First image will be used as the thumbnail
        </p>
      </div>

      {/* Checkboxes */}
      <div className="space-y-3">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={formData.featured}
            onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
            className="w-5 h-5 text-accent rounded focus:ring-2 focus:ring-accent"
          />
          <div>
            <span className="font-medium">Featured</span>
            <p className="text-sm text-neutral-600">
              Display this product on the homepage hero section
            </p>
          </div>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={formData.visible}
            onChange={(e) => setFormData({ ...formData, visible: e.target.checked })}
            className="w-5 h-5 text-accent rounded focus:ring-2 focus:ring-accent"
          />
          <div>
            <span className="font-medium">Visible</span>
            <p className="text-sm text-neutral-600">
              Show this product in the public portfolio
            </p>
          </div>
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 pt-4 border-t border-neutral-200">
        <button
          type="submit"
          disabled={isLoading}
          className="px-8 py-3 bg-accent text-white rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-8 py-3 border border-neutral-300 rounded-sm hover:bg-neutral-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
