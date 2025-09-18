import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { UserRole } from '@prisma/client'

export async function middleware(req: NextRequest) {
  const session = await auth()
  const { pathname } = req.nextUrl

  // Public routes that don't require authentication
  if (
    pathname.startsWith('/api/auth') ||
    pathname === '/login' ||
    pathname === '/' ||
    pathname === '/unauthorized' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  // If no session, redirect to login
  if (!session) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Role-based route protection
  const userRole = (session.user as any).role as UserRole

  // Debug logging (remove in production)
  console.log('Middleware - User:', session.user?.email, 'Role:', userRole, 'Path:', pathname)

  // Admin routes - only admins can access
  if (pathname.startsWith('/admin')) {
    if (userRole !== UserRole.ADMIN) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }
  }

  // Student routes - students and admins can access
  if (pathname.startsWith('/student')) {
    if (userRole !== UserRole.STUDENT && userRole !== UserRole.ADMIN) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }
  }

  // Instructor routes - instructors and admins can access
  if (pathname.startsWith('/instructor')) {
    if (userRole !== UserRole.INSTRUCTOR && userRole !== UserRole.ADMIN) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }
  }

  // Role-based dashboard redirects
  if (pathname === '/dashboard') {
    // If role is not properly set, force re-authentication
    if (!userRole) {
      console.error('Middleware - No user role found, redirecting to login')
      return NextResponse.redirect(new URL('/login', req.url))
    }

    switch (userRole) {
      case UserRole.ADMIN:
        console.log('Middleware - Redirecting admin to admin dashboard')
        return NextResponse.redirect(new URL('/admin/dashboard', req.url))
      case UserRole.INSTRUCTOR:
        console.log('Middleware - Redirecting instructor to instructor dashboard')
        return NextResponse.redirect(new URL('/instructor/dashboard', req.url))
      case UserRole.STUDENT:
        console.log('Middleware - Redirecting student to student dashboard')
        return NextResponse.redirect(new URL('/student/dashboard', req.url))
      default:
        console.error('Middleware - Unknown role:', userRole, 'redirecting to login')
        return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth endpoints)
     * - api/health (health check)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!api/auth|api/health|_next/static|_next/image|favicon.ico|public).*)',
  ],
}