"use client"

interface Image {
  url: string
  thumbnail_url: string
  alt_text?: string | null
}

interface ProductCardProps {
  title: string
  category?: string
  image: Image
  onClick: () => void
}

export function ProductCard({ title, category, image, onClick }: ProductCardProps) {
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer overflow-hidden rounded-sm bg-neutral-100 relative aspect-square"
    >
      <img
        src={image.thumbnail_url}
        alt={image.alt_text || title}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300">
        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 text-center">
          <h3 className="text-white font-semibold text-lg mb-1">{title}</h3>
          {category && (
            <p className="text-white/80 text-sm">{category}</p>
          )}
        </div>
      </div>
    </div>
  )
}
