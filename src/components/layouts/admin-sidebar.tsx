'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Package,
  Calendar,
  CreditCard,
  Settings,
  Sparkles,
  BookOpen,
  BarChart3,
} from 'lucide-react'

const navigation = [
  {
    name: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
    description: 'Vista general del estudio',
  },
  {
    name: 'Students',
    href: '/admin/students',
    icon: Users,
    description: 'Gestión de estudiantes',
  },
  {
    name: 'Packages',
    href: '/admin/packages',
    icon: Package,
    description: 'Paquetes y suscripciones',
  },
  {
    name: 'Classes',
    href: '/admin/classes',
    icon: Calendar,
    description: 'Calendario de clases',
  },
  {
    name: 'Reservations',
    href: '/admin/reservations',
    icon: BookOpen,
    description: 'Gestión de reservas',
  },
  {
    name: 'Payments',
    href: '/admin/payments',
    icon: CreditCard,
    description: 'Pagos y facturación',
  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
    description: 'Análisis y reportes',
  },
  {
    name: 'Settings',
    href: '/admin/settings',
    icon: Settings,
    description: 'Configuración del sistema',
  },
]

interface AdminSidebarProps {
  className?: string
}

export function AdminSidebar({ className }: AdminSidebarProps) {
  const pathname = usePathname()

  return (
    <div className={cn('flex h-full w-64 flex-col bg-white border-r border-gray-200', className)}>
      {/* Logo and Brand */}
      <div className="flex h-16 items-center justify-center px-6 border-b border-gray-200">
        <Link href="/admin/dashboard" className="flex items-center space-x-2">
          <div className="relative">
            <Sparkles className="h-8 w-8 text-primary" />
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-secondary rounded-full"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-gray-900">EME</span>
            <span className="text-xs text-gray-500 -mt-1">ESTUDIO</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Administración
          </p>
        </div>

        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <Icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0 transition-colors',
                  isActive
                    ? 'text-white'
                    : 'text-gray-400 group-hover:text-gray-600'
                )}
              />
              <div className="flex flex-col">
                <span>{item.name}</span>
                <span
                  className={cn(
                    'text-xs transition-colors',
                    isActive
                      ? 'text-primary-100'
                      : 'text-gray-500 group-hover:text-gray-600'
                  )}
                >
                  {item.description}
                </span>
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Studio Info Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              EME Estudio
            </p>
            <p className="text-xs text-gray-500 truncate">
              Tufting Studio • Buenos Aires
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}