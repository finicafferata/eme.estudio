'use client'

import { useSession } from 'next-auth/react'
import { UserRole, UserStatus } from '@prisma/client'

export function useAuth() {
  const { data: session, status } = useSession()

  const isLoading = status === 'loading'
  const isAuthenticated = status === 'authenticated'

  const user = session?.user
  const userRole = user?.role as UserRole
  const userStatus = user?.status as UserStatus

  const isAdmin = userRole === UserRole.ADMIN
  const isInstructor = userRole === UserRole.INSTRUCTOR
  const isStudent = userRole === UserRole.STUDENT

  const hasRole = (role: UserRole) => userRole === role
  const hasAnyRole = (roles: UserRole[]) => roles.includes(userRole)

  const canAccessAdmin = isAdmin
  const canAccessInstructor = isInstructor || isAdmin
  const canAccessStudent = isStudent || isAdmin

  return {
    // Session state
    isLoading,
    isAuthenticated,
    session,
    user,

    // User properties
    userRole,
    userStatus,

    // Role checks
    isAdmin,
    isInstructor,
    isStudent,

    // Role utilities
    hasRole,
    hasAnyRole,

    // Permission checks
    canAccessAdmin,
    canAccessInstructor,
    canAccessStudent,
  }
}