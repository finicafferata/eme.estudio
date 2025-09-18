'use client'

import { signOut } from 'next-auth/react'
import { LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LogoutButtonProps {
  className?: string
  children?: React.ReactNode
  variant?: 'button' | 'menu-item'
}

export function LogoutButton({
  className,
  children,
  variant = 'button'
}: LogoutButtonProps) {
  const handleLogout = () => {
    signOut({
      callbackUrl: '/login',
    })
  }

  if (variant === 'menu-item') {
    return (
      <button
        onClick={handleLogout}
        className={cn(
          'flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900',
          className
        )}
      >
        <LogOut className="mr-3 h-4 w-4" />
        {children || 'Sign out'}
      </button>
    )
  }

  return (
    <button
      onClick={handleLogout}
      className={cn(
        'inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500',
        className
      )}
    >
      <LogOut className="mr-2 h-4 w-4" />
      {children || 'Sign out'}
    </button>
  )
}