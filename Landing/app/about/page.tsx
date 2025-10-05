import { prisma } from "@/lib/prisma"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { getTranslations } from 'next-intl/server'

export default async function AboutPage() {
  const t = await getTranslations('about')

  const content = await prisma.content.findMany()
  const contentMap = content.reduce((acc, item) => {
    acc[item.key] = item.value
    return acc
  }, {} as Record<string, string>)

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
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="prose prose-lg max-w-none">
            <p className="text-lg leading-relaxed whitespace-pre-wrap">
              {contentMap.about || t('loading')}
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
