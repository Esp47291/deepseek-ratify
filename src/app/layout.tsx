import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Onest, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import SiteChrome from "@/components/SiteChrome";
import { EMAIL, PHONE_E164 } from "@/lib/contacts";

const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";

// Variable fonts, self-hosted by next/font: downloaded at build time, visitors never hit Google.
const onest = Onest({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-onest",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ratify — интернет-маркетинг: Яндекс.Директ, SEO, аудит сайта",
    template: "%s | ratify",
  },
  description:
    "Настройка Яндекс.Директа, SEO-продвижение, аудит сайта и продукта, ведение карточки в Яндекс.Бизнесе. Честные методы и понятная отчётность.",
  keywords:
    "настройка яндекс директ, seo продвижение, аудит сайта, яндекс бизнес, интернет-маркетинг, реклама в поиске",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "ratify — интернет-маркетинг",
    description: "Яндекс.Директ, SEO, аудит сайта и ведение карточки на картах. Честные методы и понятная отчётность.",
    type: "website",
    url: siteUrl,
    siteName: "ratify",
    locale: "ru_RU",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "ratify",
  url: siteUrl,
  description:
    "Интернет-маркетинг: настройка Яндекс.Директа, SEO-продвижение, аудит сайта и ведение карточки в Яндекс.Бизнесе.",
  telephone: PHONE_E164,
  email: EMAIL,
  availableLanguage: "Russian",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" className={`${onest.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body className="bg-[var(--surface-warm)] text-[var(--ink)] antialiased">
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
