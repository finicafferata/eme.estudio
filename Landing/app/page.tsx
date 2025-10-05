import { prisma } from "@/lib/prisma"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import Link from "next/link"
import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'

export default async function Home() {
  const t = await getTranslations('home')

  // Get featured products for hero
  const featuredProducts = await prisma.product.findMany({
    where: {
      visible: true,
      featured: true
    },
    include: {
      images: {
        orderBy: { order: 'asc' },
        take: 1
      }
    },
    take: 1,
    orderBy: { created_at: 'desc' }
  })

  const heroProduct = featuredProducts[0]

  // Get content
  const content = await prisma.content.findMany()
  const contentMap = content.reduce((acc, item) => {
    acc[item.key] = item.value
    return acc
  }, {} as Record<string, string>)

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      {/* Hero Section */}
      <main className="flex-1">
        <div className="relative h-[80vh] min-h-[600px] bg-neutral-900">
          {/* Background Image */}
          {heroProduct?.images[0] && (
            <div className="absolute inset-0">
              <img
                src={heroProduct.images[0].url}
                alt={heroProduct.images[0].alt_text || heroProduct.title}
                className="w-full h-full object-cover opacity-60"
              />
            </div>
          )}

          {/* Overlay Content */}
          <div className="relative h-full flex items-center justify-center text-center px-4">
            <div className="max-w-4xl space-y-6">
              <h1 className="font-display text-6xl md:text-7xl lg:text-8xl tracking-tight text-white">
                {contentMap.hero_title || t('hero.title')}
              </h1>
              <p className="text-xl md:text-2xl text-white/90">
                {contentMap.hero_subtitle || t('hero.subtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Two Sections: Atelier & Estudio */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {/* EME Atelier */}
            <div className="group relative overflow-hidden rounded-lg bg-neutral-100 hover:shadow-xl transition-shadow">
              <Link href="/atelier" className="block p-12 text-center h-full">
                <div className="space-y-6">
                  <h2 className="font-display text-4xl md:text-5xl tracking-tight">
                    {t('atelier.title')}
                  </h2>
                  <p className="text-neutral-600 text-lg">
                    {t('atelier.description')}
                  </p>
                  <div className="pt-4">
                    <span className="inline-block px-6 py-3 bg-accent text-white rounded-sm group-hover:opacity-90 transition-opacity">
                      {t('atelier.cta')}
                    </span>
                  </div>
                </div>
              </Link>
            </div>

            {/* EME Estudio */}
            <div className="group relative overflow-hidden rounded-lg bg-neutral-100 hover:shadow-xl transition-shadow">
              <Link href="/estudio" className="block p-12 text-center h-full">
                <div className="space-y-6">
                  <h2 className="font-display text-4xl md:text-5xl tracking-tight">
                    {t('estudio.title')}
                  </h2>
                  <p className="text-neutral-600 text-lg">
                    {t('estudio.description')}
                  </p>
                  <div className="pt-4">
                    <span className="inline-block px-6 py-3 bg-accent text-white rounded-sm group-hover:opacity-90 transition-opacity">
                      {t('estudio.cta')}
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
