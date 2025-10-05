"use client"

import { useState, useEffect } from "react"

interface Setting {
  id: string
  key: string
  value: string
}

const settingLabels: Record<string, { label: string; description: string; placeholder?: string }> = {
  'site_title': {
    label: 'Site Title',
    description: 'Used in browser tab and SEO',
    placeholder: 'EME Estudio - Tufting & Textile Art'
  },
  'site_description': {
    label: 'Site Description',
    description: 'Meta description for SEO (150-160 characters recommended)',
    placeholder: 'Handcrafted textile art, tufted rugs, and wall hangings'
  },
  'ga4_measurement_id': {
    label: 'Google Analytics 4 Measurement ID',
    description: 'Format: G-XXXXXXXXXX (leave empty to disable)',
    placeholder: 'G-XXXXXXXXXX'
  }
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/settings')
      if (res.ok) {
        const data = await res.json()
        setSettings(data)

        // Initialize form data
        const initialData: Record<string, string> = {}
        data.forEach((item: Setting) => {
          initialData[item.key] = item.value
        })
        setFormData(initialData)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
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

      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      })

      if (res.ok) {
        alert('Settings updated successfully')
        fetchSettings()
      } else {
        alert('Failed to update settings')
      }
    } catch (error) {
      console.error('Error updating settings:', error)
      alert('Failed to update settings')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-neutral-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-display tracking-tight mb-2">Settings</h1>
          <p className="text-neutral-600">Configure site settings and integrations</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-sm shadow-sm p-6 space-y-6">
          {Object.entries(settingLabels).map(([key, config]) => {
            const value = formData[key] || ''

            return (
              <div key={key}>
                <label htmlFor={key} className="block text-sm font-medium mb-2">
                  {config.label}
                </label>
                <input
                  id={key}
                  type="text"
                  value={value}
                  onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                  placeholder={config.placeholder}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                />
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
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-sm p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 About Google Analytics 4</h3>
          <p className="text-sm text-blue-800">
            To enable GA4 tracking, enter your Measurement ID above. You can find this in your Google Analytics property settings.
            Leave empty if you don't want to use analytics.
          </p>
        </div>
      </div>
    </div>
  )
}
