"use client"

import { useState, useRef } from "react"

interface UploadedImage {
  cloudinary_id: string
  url: string
  thumbnail_url: string
  alt_text?: string
}

interface ImageUploaderProps {
  images: UploadedImage[]
  onChange: (images: UploadedImage[]) => void
  maxImages?: number
}

export function ImageUploader({ images, onChange, maxImages = 10 }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList) => {
    if (images.length >= maxImages) {
      alert(`Maximum ${maxImages} images allowed`)
      return
    }

    const filesToUpload = Array.from(files).slice(0, maxImages - images.length)

    setUploading(true)

    try {
      const uploadPromises = filesToUpload.map(async (file) => {
        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          body: formData
        })

        if (!res.ok) {
          throw new Error('Upload failed')
        }

        return await res.json()
      })

      const uploadedImages = await Promise.all(uploadPromises)
      onChange([...images, ...uploadedImages])
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload images')
    } finally {
      setUploading(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
  }

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index))
  }

  const moveImage = (fromIndex: number, toIndex: number) => {
    const newImages = [...images]
    const [movedImage] = newImages.splice(fromIndex, 1)
    newImages.splice(toIndex, 0, movedImage)
    onChange(newImages)
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`
          border-2 border-dashed rounded-sm p-8 text-center cursor-pointer transition-colors
          ${dragActive
            ? 'border-accent bg-accent/5'
            : 'border-neutral-300 hover:border-accent'
          }
          ${uploading ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleChange}
          className="hidden"
        />

        {uploading ? (
          <div>
            <div className="inline-block w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-neutral-600">Uploading images...</p>
          </div>
        ) : (
          <div>
            <span className="text-5xl mb-4 block">📸</span>
            <p className="text-neutral-700 font-medium mb-2">
              Drag and drop images here, or click to browse
            </p>
            <p className="text-sm text-neutral-500">
              Max {maxImages} images • JPG, PNG, WebP up to 10MB each
            </p>
            <p className="text-sm text-neutral-500 mt-1">
              {images.length} / {maxImages} images uploaded
            </p>
          </div>
        )}
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div
              key={image.cloudinary_id}
              className="relative group aspect-square bg-neutral-100 rounded-sm overflow-hidden"
            >
              <img
                src={image.thumbnail_url}
                alt={image.alt_text || `Image ${index + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {/* Move Left */}
                {index > 0 && (
                  <button
                    onClick={() => moveImage(index, index - 1)}
                    className="p-2 bg-white rounded-sm hover:bg-neutral-100 transition-colors"
                    title="Move left"
                  >
                    ←
                  </button>
                )}

                {/* Remove */}
                <button
                  onClick={() => removeImage(index)}
                  className="p-2 bg-red-500 text-white rounded-sm hover:bg-red-600 transition-colors"
                  title="Remove"
                >
                  🗑️
                </button>

                {/* Move Right */}
                {index < images.length - 1 && (
                  <button
                    onClick={() => moveImage(index, index + 1)}
                    className="p-2 bg-white rounded-sm hover:bg-neutral-100 transition-colors"
                    title="Move right"
                  >
                    →
                  </button>
                )}
              </div>

              {/* Order Badge */}
              <div className="absolute top-2 left-2 w-6 h-6 bg-accent text-white text-xs rounded-full flex items-center justify-center font-bold">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
