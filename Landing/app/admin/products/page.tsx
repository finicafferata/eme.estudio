"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface Product {
  id: string
  title: string
  slug: string
  featured: boolean
  visible: boolean
  category: { id: string; name: string } | null
  images: Array<{ thumbnail_url: string; alt_text: string | null }>
  created_at: string
}

interface Category {
  id: string
  name: string
  _count: { products: number }
}

export default function ProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchCategories()
    fetchProducts()
  }, [selectedCategory, searchQuery])

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

  const fetchProducts = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedCategory !== 'all') {
        params.set('categoryId', selectedCategory)
      }
      if (searchQuery) {
        params.set('search', searchQuery)
      }

      const res = await fetch(`/api/admin/products?${params}`)
      if (res.ok) {
        const data = await res.json()
        setProducts(data)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return
    }

    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        fetchProducts()
      } else {
        alert('Failed to delete product')
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Failed to delete product')
    }
  }

  const toggleVisibility = async (product: Product) => {
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...product,
          category_id: product.category?.id,
          visible: !product.visible
        })
      })

      if (res.ok) {
        fetchProducts()
      }
    } catch (error) {
      console.error('Error updating product:', error)
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display tracking-tight mb-2">Products</h1>
          <p className="text-neutral-600">Manage your portfolio items</p>
        </div>
        <Link
          href="/admin/products/new"
          className="px-6 py-3 bg-accent text-white rounded-sm hover:opacity-90 transition-opacity"
        >
          + New Product
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-sm shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title or description..."
              className="w-full px-4 py-2 border border-neutral-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 border border-neutral-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat._count.products})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-neutral-600">Loading products...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-sm shadow-sm p-12 text-center">
          <p className="text-neutral-600 mb-4">
            {searchQuery || selectedCategory !== 'all'
              ? 'No products found matching your filters'
              : 'No products yet'}
          </p>
          <Link
            href="/admin/products/new"
            className="inline-block px-6 py-3 bg-accent text-white rounded-sm hover:opacity-90 transition-opacity"
          >
            Create your first product
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-sm shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Image */}
              <div className="aspect-square bg-neutral-200 relative">
                {product.images[0] ? (
                  <img
                    src={product.images[0].thumbnail_url}
                    alt={product.images[0].alt_text || product.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-6xl text-neutral-400">🎨</span>
                  </div>
                )}

                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-wrap gap-2">
                  {product.featured && (
                    <span className="px-2 py-1 bg-accent text-white text-xs rounded-sm">
                      ⭐ Featured
                    </span>
                  )}
                  {!product.visible && (
                    <span className="px-2 py-1 bg-orange-500 text-white text-xs rounded-sm">
                      📦 Draft
                    </span>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-1 truncate">{product.title}</h3>
                {product.category && (
                  <p className="text-sm text-neutral-600 mb-3">
                    {product.category.name}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Link
                    href={`/admin/products/${product.id}/edit`}
                    className="flex-1 px-3 py-2 text-center border border-neutral-300 rounded-sm hover:bg-neutral-50 transition-colors text-sm"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => toggleVisibility(product)}
                    className="flex-1 px-3 py-2 border border-neutral-300 rounded-sm hover:bg-neutral-50 transition-colors text-sm"
                    title={product.visible ? 'Hide' : 'Show'}
                  >
                    {product.visible ? '👁️ Hide' : '👁️‍🗨️ Show'}
                  </button>
                  <button
                    onClick={() => handleDelete(product.id, product.title)}
                    className="px-3 py-2 border border-red-300 text-red-600 rounded-sm hover:bg-red-50 transition-colors text-sm"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
