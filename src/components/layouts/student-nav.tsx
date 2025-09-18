'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Calendar, Home, BookOpen, User, CreditCard } from 'lucide-react'

const studentNavItems = [
  {
    title: 'Dashboard',
    href: '/student/dashboard',
    icon: Home
  },
  {
    title: 'Available Classes',
    href: '/student/classes',
    icon: Calendar
  },
  {
    title: 'My Reservations',
    href: '/student/reservations',
    icon: BookOpen
  },
  {
    title: 'My Credits',
    href: '/student/credits',
    icon: CreditCard
  }
]

export function StudentNav() {
  const pathname = usePathname()

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-8">
          <Link href="/student/dashboard" className="text-xl font-bold text-gray-900">
            EME Estudio
          </Link>
          <div className="hidden md:flex items-center space-x-6">
            {studentNavItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    pathname === item.href
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              )
            })}
          </div>
        </div>
        <div className="flex items-center">
          <User className="h-8 w-8 text-gray-600" />
        </div>
      </div>
    </nav>
  )
}