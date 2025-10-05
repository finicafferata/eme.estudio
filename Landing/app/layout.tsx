import type { Metadata } from "next";
import { Inter, Libre_Baskerville } from "next/font/google";
import { prisma } from "@/lib/prisma";
import { GoogleAnalytics } from "@/lib/analytics";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const libreBaskerville = Libre_Baskerville({
  variable: "--font-display",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await prisma.settings.findMany();
  const settingsMap = settings.reduce((acc, item) => {
    acc[item.key] = item.value;
    return acc;
  }, {} as Record<string, string>);

  return {
    title: settingsMap.site_title || "EME Estudio - Tufting & Textile Art",
    description: settingsMap.site_description || "Handcrafted textile art, tufted rugs, and wall hangings by EME Estudio",
    openGraph: {
      title: settingsMap.site_title || "EME Estudio - Tufting & Textile Art",
      description: settingsMap.site_description || "Handcrafted textile art, tufted rugs, and wall hangings",
      type: "website",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  // Get GA4 measurement ID
  const settings = await prisma.settings.findMany();
  const settingsMap = settings.reduce((acc, item) => {
    acc[item.key] = item.value;
    return acc;
  }, {} as Record<string, string>);

  const ga4MeasurementId = settingsMap.ga4_measurement_id;

  return (
    <html lang={locale}>
      <head>
        <GoogleAnalytics measurementId={ga4MeasurementId} />
      </head>
      <body
        className={`${inter.variable} ${libreBaskerville.variable} font-sans antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
