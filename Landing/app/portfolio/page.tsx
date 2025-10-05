"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { ProductGrid } from "@/components/portfolio/ProductGrid"

interface Category {
  id: string
  name: string
  slug: string
  _count: { products: number }
}

interface Product {
  id: string
  title: string
  description: string
  category?: { name: string } | null
  images: Array<{
    id: string
    url: string
    thumbnail_url: string
    alt_text?: string | null
  }>
}

export default function PortfolioPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchCategories()
    fetchProducts()
  }, [selectedCategory])

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories')
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
        params.set('category', selectedCategory)
      }

      const res = await fetch(`/api/products?${params}`)
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

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1">
        {/* Page Header */}
        <div className="bg-neutral-50 border-b border-neutral-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <h1 className="font-display text-5xl md:text-6xl tracking-tight mb-4">
              Portfolio
            </h1>
            <p className="text-neutral-600 text-lg">
              Explore our collection of handcrafted textile art
            </p>
          </div>
        </div>

        {/* Category Filter */}
        <div className="border-b border-neutral-200 bg-white sticky top-20 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-4 overflow-x-auto py-4">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`
                  px-6 py-2 rounded-full whitespace-nowrap transition-colors
                  ${selectedCategory === 'all'
                    ? 'bg-accent text-white'
                    : 'bg-neutral-100 hover:bg-neutral-200'
                  }
                `}
              >
                All
              </button>
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.slug)}
                  className={`
                    px-6 py-2 rounded-full whitespace-nowrap transition-colors
                    ${selectedCategory === category.slug
                      ? 'bg-accent text-white'
                      : 'bg-neutral-100 hover:bg-neutral-200'
                    }
                  `}
                >
                  {category.name} ({category._count.products})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {isLoading ? (
            <div className="text-center py-20">
              <div className="inline-block w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-neutral-600">Loading portfolio...</p>
            </div>
          ) : (
            <ProductGrid products={products} />
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
