"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SocialFloatingWidget from "@/components/SocialFloatingWidget";

/**
 * Маркетинговый хром сайта.
 *
 * Кабинеты платформы (/admin, /work, /r) — отдельный интерфейс, им шапка
 * и подвал агентства мешают. Проверяем путь на клиенте, чтобы не двигать
 * все страницы сайта в route group ради одного условия.
 */
const PLATFORM_PREFIXES = ["/admin", "/work", "/r"];

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const isPlatform = PLATFORM_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isPlatform) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      {children}
      <Footer />
      <ScrollToTop />
      <SocialFloatingWidget />
    </>
  );
}
