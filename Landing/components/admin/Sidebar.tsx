"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: '📊' },
  { name: 'Products', href: '/admin/products', icon: '🎨' },
  { name: 'Categories', href: '/admin/categories', icon: '📁' },
  { name: 'Content', href: '/admin/content', icon: '📝' },
  { name: 'Settings', href: '/admin/settings', icon: '⚙️' },
]

export function Sidebar() {
  const pathname = usePathname()

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  return (
    <div className="flex flex-col h-full bg-neutral-900 text-white w-64">
      {/* Logo */}
      <div className="p-6 border-b border-neutral-800">
        <h1 className="font-display text-2xl">EME Estudio</h1>
        <p className="text-neutral-400 text-sm mt-1">Admin Panel</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-sm transition-colors
                ${isActive
                  ? 'bg-accent text-white'
                  : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                }
              `}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-neutral-800">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 text-neutral-300 hover:bg-neutral-800 hover:text-white rounded-sm transition-colors"
        >
          <span className="text-lg">🚪</span>
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  )
}
