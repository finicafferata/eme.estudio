"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations, useLocale } from 'next-intl'

export function Header() {
  const pathname = usePathname()
  const t = useTranslations('nav')
  const locale = useLocale()

  const navigation = [
    { name: t('home'), href: '/' },
    { name: t('atelier'), href: '/atelier' },
    { name: t('estudio'), href: '/estudio' },
    { name: t('about'), href: '/about' },
    { name: t('contact'), href: '/contact' },
  ]

  const toggleLocale = () => {
    const newLocale = locale === 'es' ? 'en' : 'es'
    const path = pathname.replace(`/${locale}`, `/${newLocale}`)
    window.location.href = path
  }

  return (
    <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="font-display text-2xl tracking-tight hover:opacity-70 transition-opacity">
            EME
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navigation.map((item) => {
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    text-sm font-medium transition-colors
                    ${isActive
                      ? 'text-accent'
                      : 'text-neutral-700 hover:text-accent'
                    }
                  `}
                >
                  {item.name}
                </Link>
              )
            })}

            {/* Language Switcher */}
            <button
              onClick={toggleLocale}
              className="text-sm font-medium text-neutral-700 hover:text-accent transition-colors"
              aria-label="Switch language"
            >
              {locale === 'es' ? 'EN' : 'ES'}
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2" aria-label="Menu">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}
