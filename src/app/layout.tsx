import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/components/auth/auth-provider'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'EME Estudio',
    template: '%s | EME Estudio'
  },
  description: 'Professional tufting studio management system - EME Estudio Buenos Aires',
  keywords: ['tufting', 'tapices', 'alfombras', 'EME Studio', 'Buenos Aires', 'art', 'textile'],
  authors: [{ name: 'EME Estudio' }],
  creator: 'EME Estudio',
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    url: 'https://emeestudio.com',
    title: 'EME Estudio',
    description: 'Professional tufting studio in Buenos Aires',
    siteName: 'EME Estudio',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EME Estudio',
    description: 'Professional tufting studio in Buenos Aires',
  },
  robots: {
    index: false, // Private admin system
    follow: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={inter.variable}>
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}