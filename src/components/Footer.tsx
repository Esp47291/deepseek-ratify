import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Logo from "@/components/Logo";
import ServiceCta from "@/components/ServiceCta";
import { EMAIL, EMAIL_MAILTO, PHONE_DISPLAY, PHONE_TEL, TELEGRAM_HANDLE, TELEGRAM_URL } from "@/lib/contacts";
import { services } from "@/lib/services-data";

const columns = [
  {
    title: "Услуги",
    links: services.map((s) => ({ name: s.title, href: `/services/${s.slug}` })),
  },
  {
    title: "Компания",
    links: [
      { name: "О нас", href: "/about" },
      { name: "Гарантии", href: "/guarantees" },
      { name: "Контакты", href: "/contacts" },
    ],
  },
  {
    title: "Полезное",
    links: [
      { name: "Цены", href: "/prices" },
      { name: "Калькулятор бюджета", href: "/calculator" },
      { name: "Частые вопросы", href: "/faq" },
    ],
  },
];

// Evaluated once per build/server start, not on every render.
const YEAR = new Date().getFullYear();

const linkClass = "text-[15px] text-[var(--night-ink)] transition-colors hover:text-[var(--night-muted)]";

/** Dark rolling hills along the bottom edge: the site's landscape motif at night. */
function NightHills() {
  return (
    <svg
      viewBox="0 0 1440 160"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full sm:h-32"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M0 96C200 62 380 70 560 82C760 96 940 54 1140 58C1290 61 1380 74 1440 70V160H0Z" fill="#101012" />
      <path d="M0 124C220 96 420 104 640 120C820 133 980 104 1180 104C1310 104 1390 114 1440 112V160H0Z" fill="#17171A" />
      <path d="M0 148C260 132 520 134 760 146C980 156 1220 144 1440 140V160H0Z" fill="#1E1E22" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="section-dark relative overflow-hidden">
      <div className="relative mx-auto max-w-[1240px] px-5 pb-36 pt-20 sm:px-8 sm:pb-44">
        <div className="mb-16 flex flex-col gap-8 border-b border-[var(--night-line)] pb-12 md:flex-row md:items-end md:justify-between">
          <div className="max-w-md">
            <Link href="/" className="mb-5 inline-block text-[var(--night-ink)]" aria-label="ratify, на главную">
              <Logo />
            </Link>
            <p className="text-[var(--night-muted)]">
              Интернет-маркетинг: Яндекс.Директ, SEO, аудит сайта и ведение карточек на картах. Честные методы и
              понятные отчёты.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="btn-secondary">
              Написать в Telegram
            </a>
            <ServiceCta label="Оставить заявку" className="btn-inverse" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-4">
          {columns.map((col) => (
            <div key={col.title}>
              <h2 className="mb-4 text-sm font-normal tracking-normal text-[var(--night-muted)]">{col.title}</h2>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={linkClass}>
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h2 className="mb-4 text-sm font-normal tracking-normal text-[var(--night-muted)]">Контакты</h2>
            <ul className="space-y-3">
              <li>
                <a href={PHONE_TEL} className={linkClass}>
                  {PHONE_DISPLAY}
                </a>
              </li>
              <li>
                <a href={EMAIL_MAILTO} className={`${linkClass} break-all`}>
                  {EMAIL}
                </a>
              </li>
              <li>
                <a
                  href={TELEGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${linkClass} inline-flex items-center gap-1`}
                >
                  {TELEGRAM_HANDLE}
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-3 text-sm text-[var(--night-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>© ratify, {YEAR}</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="transition-colors hover:text-[var(--night-ink)]">
              Политика конфиденциальности
            </Link>
            <Link href="/offer" className="transition-colors hover:text-[var(--night-ink)]">
              Оферта
            </Link>
          </div>
        </div>
      </div>
      <NightHills />
    </footer>
  );
}
