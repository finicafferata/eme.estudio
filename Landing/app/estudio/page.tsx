import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import Link from "next/link"
import { getTranslations } from 'next-intl/server'

export default async function EstudioPage() {
  const t = await getTranslations('estudio')

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1">
        {/* Page Header */}
        <div className="bg-neutral-50 border-b border-neutral-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <h1 className="font-display text-5xl md:text-6xl tracking-tight mb-4">
              {t('title')}
            </h1>
            <p className="text-neutral-600 text-lg">
              {t('subtitle')}
            </p>
          </div>
        </div>

        {/* About Section */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="space-y-8">
            <div>
              <h2 className="font-display text-3xl md:text-4xl tracking-tight mb-4">
                {t('about.title')}
              </h2>
              <p className="text-neutral-600 text-lg leading-relaxed">
                {t('about.description')}
              </p>
            </div>

            <div>
              <h2 className="font-display text-3xl md:text-4xl tracking-tight mb-4">
                {t('offer.title')}
              </h2>
              <ul className="space-y-4 text-neutral-600 text-lg">
                <li className="flex gap-3">
                  <span className="text-accent">•</span>
                  <span>{t('offer.yoga')}</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-accent">•</span>
                  <span>{t('offer.pilates')}</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-accent">•</span>
                  <span>{t('offer.workshops')}</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-accent">•</span>
                  <span>{t('offer.smallGroup')}</span>
                </li>
              </ul>
            </div>

            {/* CTA Section */}
            <div className="bg-neutral-100 rounded-lg p-8 md:p-12 text-center">
              <h3 className="font-display text-2xl md:text-3xl tracking-tight mb-4">
                {t('cta.title')}
              </h3>
              <p className="text-neutral-600 mb-6">
                {t('cta.description')}
              </p>
              <Link
                href="https://emeestudio.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-8 py-4 bg-accent text-white rounded-sm hover:opacity-90 transition-opacity text-lg font-medium"
              >
                {t('cta.button')}
              </Link>
            </div>

            {/* Contact Info */}
            <div className="border-t border-neutral-200 pt-8">
              <h3 className="font-display text-2xl md:text-3xl tracking-tight mb-4">
                {t('contact.title')}
              </h3>
              <p className="text-neutral-600 text-lg">
                {t('contact.description')}
              </p>
              <div className="mt-4">
                <Link
                  href="/contact"
                  className="inline-block px-6 py-3 border border-neutral-300 rounded-sm hover:bg-neutral-50 transition-colors"
                >
                  {t('contact.button')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
