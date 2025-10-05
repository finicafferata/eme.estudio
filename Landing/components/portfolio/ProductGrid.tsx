"use client"

import { useState } from "react"
import { ProductCard } from "./ProductCard"
import { Lightbox } from "./Lightbox"

interface Image {
  id: string
  url: string
  thumbnail_url: string
  alt_text?: string | null
}

interface Product {
  id: string
  title: string
  description: string
  category?: { name: string } | null
  images: Image[]
}

interface ProductGridProps {
  products: Product[]
}

export function ProductGrid({ products }: ProductGridProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const openLightbox = (product: Product, imageIndex: number = 0) => {
    setSelectedProduct(product)
    setCurrentImageIndex(imageIndex)
  }

  const closeLightbox = () => {
    setSelectedProduct(null)
    setCurrentImageIndex(0)
  }

  const nextImage = () => {
    if (selectedProduct && currentImageIndex < selectedProduct.images.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1)
    }
  }

  const previousImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1)
    }
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-neutral-600 text-lg">No products found</p>
      </div>
    )
  }

  return (
    <>
      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            title={product.title}
            category={product.category?.name}
            image={product.images[0]}
            onClick={() => openLightbox(product)}
          />
        ))}
      </div>

      {/* Lightbox */}
      {selectedProduct && (
        <Lightbox
          images={selectedProduct.images}
          currentIndex={currentImageIndex}
          onClose={closeLightbox}
          onNext={nextImage}
          onPrevious={previousImage}
        />
      )}
    </>
  )
}
