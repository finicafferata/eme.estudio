import { prisma } from "@/lib/prisma"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { getTranslations } from 'next-intl/server'

export default async function ContactPage() {
  const t = await getTranslations('contact')

  const content = await prisma.content.findMany()
  const contentMap = content.reduce((acc, item) => {
    acc[item.key] = item.value
    return acc
  }, {} as Record<string, string>)

  const email = contentMap.contact_email || 'hello@emeestudio.com'
  const instagram = contentMap.instagram_handle || '@e.m.e.estudio'

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1">
        {/* Page Header */}
        <div className="bg-neutral-50 border-b border-neutral-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <h1 className="font-display text-5xl md:text-6xl tracking-tight mb-4">
              {t('title')}
            </h1>
            <p className="text-neutral-600 text-lg">
              {t('subtitle')}
            </p>
          </div>
        </div>

        {/* Contact Info */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Email */}
            <div className="bg-white rounded-sm shadow-sm p-8 border border-neutral-200">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center text-2xl">
                  📧
                </div>
                <h2 className="text-2xl font-semibold">{t('email')}</h2>
              </div>
              <a
                href={`mailto:${email}`}
                className="text-accent hover:underline text-lg"
              >
                {email}
              </a>
            </div>

            {/* Instagram */}
            <div className="bg-white rounded-sm shadow-sm p-8 border border-neutral-200">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center text-2xl">
                  📸
                </div>
                <h2 className="text-2xl font-semibold">{t('instagram')}</h2>
              </div>
              <a
                href={`https://instagram.com/${instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline text-lg"
              >
                {instagram}
              </a>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-16 text-center">
            <h3 className="text-2xl font-semibold mb-4">{t('commissions.title')}</h3>
            <p className="text-neutral-600 max-w-2xl mx-auto">
              {t('commissions.description')}
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
