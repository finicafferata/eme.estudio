import createMiddleware from 'next-intl/middleware';
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { locales, defaultLocale } from './i18n/request';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed'
});

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isAdminRoute = req.nextUrl.pathname.startsWith('/admin')

  if (isAdminRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return intlMiddleware(req)
})

export const config = {
  matcher: ['/', '/(es|en)/:path*', '/admin/:path*']
}
