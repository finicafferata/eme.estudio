"use client"

import { useState, useEffect } from "react"

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  order: number
  _count: {
    products: number
  }
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', description: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/categories')
      if (res.ok) {
        const data = await res.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      alert('Category name is required')
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setFormData({ name: '', description: '' })
        setShowForm(false)
        fetchCategories()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to create category')
      }
    } catch (error) {
      console.error('Error creating category:', error)
      alert('Failed to create category')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display tracking-tight mb-2">Categories</h1>
          <p className="text-neutral-600">Organize your products into categories</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-6 py-3 bg-accent text-white rounded-sm hover:opacity-90 transition-opacity"
        >
          {showForm ? 'Cancel' : '+ New Category'}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-sm shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">New Category</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-neutral-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                placeholder="e.g., Rugs"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-neutral-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                placeholder="Optional description for this category"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-accent text-white rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Category'}
            </button>
          </form>
        </div>
      )}

      {/* Categories List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-neutral-600">Loading categories...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-sm shadow-sm p-12 text-center">
          <p className="text-neutral-600 mb-4">No categories yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-block px-6 py-3 bg-accent text-white rounded-sm hover:opacity-90 transition-opacity"
          >
            Create your first category
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-sm shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-neutral-700">
                  Name
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium text-neutral-700">
                  Slug
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium text-neutral-700">
                  Description
                </th>
                <th className="text-right px-6 py-3 text-sm font-medium text-neutral-700">
                  Products
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {categories.map((category) => (
                <tr key={category.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-4 font-medium">{category.name}</td>
                  <td className="px-6 py-4 text-neutral-600 font-mono text-sm">
                    {category.slug}
                  </td>
                  <td className="px-6 py-4 text-neutral-600">
                    {category.description || '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-neutral-600">
                    {category._count.products}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
