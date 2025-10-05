"use client"

import { useTranslations } from 'next-intl'

export function Footer() {
  const currentYear = new Date().getFullYear()
  const t = useTranslations('footer')
  const tNav = useTranslations('nav')

  return (
    <footer className="bg-neutral-900 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <h3 className="font-display text-2xl mb-4">{t('brand')}</h3>
            <p className="text-neutral-400 text-sm">
              {t('tagline')}
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">{t('navigation')}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/" className="text-neutral-400 hover:text-white transition-colors">
                  {tNav('home')}
                </a>
              </li>
              <li>
                <a href="/portfolio" className="text-neutral-400 hover:text-white transition-colors">
                  {tNav('portfolio')}
                </a>
              </li>
              <li>
                <a href="/about" className="text-neutral-400 hover:text-white transition-colors">
                  {tNav('about')}
                </a>
              </li>
              <li>
                <a href="/contact" className="text-neutral-400 hover:text-white transition-colors">
                  {tNav('contact')}
                </a>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="font-semibold mb-4">{t('connect')}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://instagram.com/e.m.e.estudio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-400 hover:text-white transition-colors"
                >
                  {t('instagram')}
                </a>
              </li>
              <li>
                <a
                  href="mailto:hello@emeestudio.com"
                  className="text-neutral-400 hover:text-white transition-colors"
                >
                  {t('email')}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-neutral-800 text-center text-sm text-neutral-400">
          <p>&copy; {currentYear} {t('brand')}. {t('rights')}.</p>
        </div>
      </div>
    </footer>
  )
}
