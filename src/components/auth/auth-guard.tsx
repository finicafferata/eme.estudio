'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { UserRole } from '@prisma/client'
import { useAuth } from '@/hooks/use-auth'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  allowedRoles?: UserRole[]
  fallbackUrl?: string
}

export function AuthGuard({
  children,
  requireAuth = true,
  allowedRoles,
  fallbackUrl = '/login',
}: AuthGuardProps) {
  const { isLoading, isAuthenticated, userRole } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    if (requireAuth && !isAuthenticated) {
      router.push(fallbackUrl)
      return
    }

    if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
      router.push('/unauthorized')
      return
    }
  }, [isLoading, isAuthenticated, userRole, requireAuth, allowedRoles, router, fallbackUrl])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (requireAuth && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}