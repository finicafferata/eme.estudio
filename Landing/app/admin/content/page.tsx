"use client"

import { useState, useEffect } from "react"

interface ContentItem {
  id: string
  key: string
  value: string
  updated_at: string
}

const contentLabels: Record<string, { label: string; description: string; multiline?: boolean }> = {
  'about': {
    label: 'About Us',
    description: 'Content for the About page',
    multiline: true
  },
  'contact_email': {
    label: 'Contact Email',
    description: 'Your contact email address'
  },
  'instagram_handle': {
    label: 'Instagram Handle',
    description: 'Your Instagram username (with @)'
  },
  'hero_title': {
    label: 'Hero Title',
    description: 'Main title on homepage'
  },
  'hero_subtitle': {
    label: 'Hero Subtitle',
    description: 'Subtitle on homepage'
  }
}

export default function ContentPage() {
  const [content, setContent] = useState<ContentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchContent()
  }, [])

  const fetchContent = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/content')
      if (res.ok) {
        const data = await res.json()
        setContent(data)

        // Initialize form data
        const initialData: Record<string, string> = {}
        data.forEach((item: ContentItem) => {
          initialData[item.key] = item.value
        })
        setFormData(initialData)
      }
    } catch (error) {
      console.error('Error fetching content:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const updates = Object.entries(formData).map(([key, value]) => ({
        key,
        value
      }))

      const res = await fetch('/api/admin/content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      })

      if (res.ok) {
        alert('Content updated successfully')
        fetchContent()
      } else {
        alert('Failed to update content')
      }
    } catch (error) {
      console.error('Error updating content:', error)
      alert('Failed to update content')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-neutral-600">Loading content...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-display tracking-tight mb-2">Content</h1>
          <p className="text-neutral-600">Edit website content</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-sm shadow-sm p-6 space-y-6">
          {Object.entries(contentLabels).map(([key, config]) => {
            const value = formData[key] || ''

            return (
              <div key={key}>
                <label htmlFor={key} className="block text-sm font-medium mb-2">
                  {config.label}
                </label>
                {config.multiline ? (
                  <textarea
                    id={key}
                    value={value}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                    rows={8}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  />
                ) : (
                  <input
                    id={key}
                    type="text"
                    value={value}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  />
                )}
                <p className="mt-1 text-sm text-neutral-500">{config.description}</p>
              </div>
            )
          })}

          <div className="pt-4 border-t border-neutral-200">
            <button
              type="submit"
              disabled={isSaving}
              className="px-8 py-3 bg-accent text-white rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
