'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

export default function Home() {
  const { isLoading, isAuthenticated, userRole } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    // Redirect authenticated users to their appropriate dashboard
    switch (userRole) {
      case 'ADMIN':
        router.push('/admin/dashboard')
        break
      case 'INSTRUCTOR':
        router.push('/instructor/dashboard')
        break
      case 'STUDENT':
        router.push('/student/dashboard')
        break
      default:
        router.push('/login')
    }
  }, [isLoading, isAuthenticated, userRole, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="text-center">
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-primary mb-2">EME Estudio</h1>
            <p className="text-gray-600">Estudio Profesional de Tufting</p>
          </div>
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="text-center">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-primary mb-2">EME Estudio</h1>
          <p className="text-gray-600">Estudio Profesional de Tufting</p>
        </div>
        <p className="text-gray-600">Redirigiendo...</p>
      </div>
    </div>
  )
}