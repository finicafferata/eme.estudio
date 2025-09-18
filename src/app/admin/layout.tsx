'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Bell } from 'lucide-react'
import { AdminSidebar } from '@/components/layouts/admin-sidebar'
import { UserMenu } from '@/components/layouts/user-menu'
import { useAuth } from '@/hooks/use-auth'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { isLoading, isAuthenticated, canAccessAdmin } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      router.push('/login?callbackUrl=/admin/dashboard')
      return
    }

    if (!canAccessAdmin) {
      router.push('/unauthorized')
      return
    }
  }, [isLoading, isAuthenticated, canAccessAdmin, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !canAccessAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Verificando permisos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-lg font-semibold text-gray-900">
              Panel de Administración
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
            </button>

            {/* User Menu */}
            <UserMenu />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-4">
              <span>© 2025 EME Estudio</span>
              <span>•</span>
              <span>Buenos Aires, Argentina</span>
            </div>
            <div className="flex items-center space-x-4">
              <span>Versión 1.0.0</span>
              <span>•</span>
              <span>Sistema de Gestión</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}