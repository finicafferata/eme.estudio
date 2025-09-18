'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  User,
  Settings,
  LogOut,
  ChevronDown,
  Crown,
  GraduationCap,
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'

interface UserMenuProps {
  className?: string
}

export function UserMenu({ className }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { user, userRole } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut({
      callbackUrl: '/login',
    })
  }

  const getRoleIcon = () => {
    switch (userRole) {
      case 'ADMIN':
        return Crown
      case 'INSTRUCTOR':
        return GraduationCap
      default:
        return User
    }
  }

  const getRoleColor = () => {
    switch (userRole) {
      case 'ADMIN':
        return 'text-primary'
      case 'INSTRUCTOR':
        return 'text-secondary'
      default:
        return 'text-gray-600'
    }
  }

  const getRoleText = () => {
    switch (userRole) {
      case 'ADMIN':
        return 'Administrador'
      case 'INSTRUCTOR':
        return 'Instructor'
      case 'STUDENT':
        return 'Estudiante'
      default:
        return 'Usuario'
    }
  }

  if (!user) {
    return null
  }

  const RoleIcon = getRoleIcon()

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors w-full text-left"
      >
        <div className="relative">
          <div className="h-10 w-10 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-medium text-sm">
            {getInitials(user.name.split(' ')[0] || '', user.name.split(' ')[1] || '')}
          </div>
          <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-white rounded-full flex items-center justify-center border border-gray-200">
            <RoleIcon className={cn('h-2.5 w-2.5', getRoleColor())} />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {user.name}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {getRoleText()}
          </p>
        </div>

        <ChevronDown
          className={cn(
            'h-4 w-4 text-gray-400 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900">
                {user.name}
              </p>
              <p className="text-xs text-gray-500">
                {user.email}
              </p>
              <div className="flex items-center space-x-1 mt-1">
                <RoleIcon className={cn('h-3 w-3', getRoleColor())} />
                <span className={cn('text-xs font-medium', getRoleColor())}>
                  {getRoleText()}
                </span>
              </div>
            </div>

            <div className="py-2">
              <button
                onClick={() => {
                  setIsOpen(false)
                  router.push('/admin/settings')
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Settings className="mr-3 h-4 w-4 text-gray-400" />
                Configuración
              </button>

              <button
                onClick={() => {
                  setIsOpen(false)
                  router.push('/profile')
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <User className="mr-3 h-4 w-4 text-gray-400" />
                Mi Perfil
              </button>
            </div>

            <div className="border-t border-gray-100 py-2">
              <button
                onClick={handleSignOut}
                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="mr-3 h-4 w-4 text-red-500" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}