import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Mail, MessageCircle, Phone, Send } from "lucide-react";
import DotArt, { type DotArtShape } from "@/components/DotArt";
import ExitIntentModal from "@/components/ExitIntentModal";
import Landscape from "@/components/Landscape";
import ServiceCta from "@/components/ServiceCta";
import ContactForm from "@/components/home/ContactForm";
import FaqList from "@/components/home/FaqList";
import HeroConsole from "@/components/home/HeroConsole";
import ServicesShowcase from "@/components/home/ServicesShowcase";
import { EMAIL, EMAIL_MAILTO, PHONE_DISPLAY, PHONE_TEL, TELEGRAM_HANDLE, TELEGRAM_URL } from "@/lib/contacts";
import { faqs, processSteps } from "@/lib/services-data";

// Tools we work in (not clients): names only, no third-party logos.
const platforms = ["Яндекс.Директ", "Яндекс Метрика", "Яндекс.Бизнес", "Яндекс Карты", "Поиск Google"];

// Draft copy, awaiting owner confirmation (see CLAUDE.md).
const principles: { shape: DotArtShape; title: string; desc: string }[] = [
  {
    shape: "report",
    title: "Прозрачная отчётность",
    desc: "Регулярно показываем расходы, заявки, позиции и трафик, а не общие слова.",
  },
  {
    shape: "shield",
    title: "Честные методы",
    desc: "Без накрутки поведенческих факторов и покупных отзывов: только то, что не подведёт ваш сайт.",
  },
  {
    shape: "chat",
    title: "Связь в мессенджерах",
    desc: "Пишите в Telegram, WhatsApp, Max или VK, чтобы быстро уточнять детали по задаче.",
  },
];

const shortcuts = [
  {
    word: "/калькулятор",
    title: "Посчитать бюджет",
    desc: "Сколько кликов, заявок и выручки даст реклама при ваших цифрах.",
    href: "/calculator",
  },
  {
    word: "/цены",
    title: "Посмотреть цены",
    desc: "Что стоит фиксированно, а что считаем после короткого брифа.",
    href: "/prices",
  },
];

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

export default function HomePage() {
  return (
    <main className="overflow-x-clip">
      <ExitIntentModal />

      {/* HERO */}
      <section className="relative isolate overflow-hidden pb-16 pt-36 sm:pb-24 sm:pt-44">
        <Landscape id="hero" variant="meadow" className="absolute inset-0 -z-10 h-full w-full" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-b from-transparent to-white" aria-hidden="true" />

        <div className="mx-auto max-w-[1240px] px-5 text-center sm:px-8">
          <h1 className="heading-xl rise mx-auto max-w-[15ch]">Клиенты из поиска, рекламы и карт</h1>
          <p className="lead rise mx-auto mt-6 max-w-[54ch]" style={delay(90)}>
            Настраиваем Яндекс.Директ, продвигаем сайты, проводим аудит и ведём карточки в Яндекс.Бизнесе. Без накруток,
            с понятными цифрами.
          </p>
          <div className="rise mt-9 flex flex-col justify-center gap-3 sm:flex-row" style={delay(180)}>
            <ServiceCta label="Оставить заявку" className="btn-primary min-w-[200px]" />
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary min-w-[200px]"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              Написать в Telegram
            </a>
          </div>

          <div className="rise mx-auto mt-16 max-w-[920px] sm:mt-24" style={delay(320)}>
            <HeroConsole />
          </div>
        </div>
      </section>

      {/* PLATFORMS */}
      <section className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-5 px-5 py-10 sm:px-8 lg:flex-row lg:items-center lg:gap-16">
          <p className="shrink-0 text-[15px] leading-snug text-[var(--ink-muted)]">
            Работаем в инструментах,
            <br className="hidden lg:block" /> которыми пользуются ваши клиенты:
          </p>
          <ul className="flex flex-wrap items-center gap-x-10 gap-y-3">
            {platforms.map((name) => (
              <li key={name} className="text-lg font-medium tracking-[-0.02em] text-[var(--ink)]">
                {name}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* SERVICES */}
      <section className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
          <ServicesShowcase />
        </div>
      </section>

      {/* PROCESS */}
      <section className="bg-white pb-24 sm:pb-32">
        <div className="mx-auto grid max-w-[1240px] gap-12 px-5 sm:px-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
          <div>
            <span className="section-label">Как мы работаем</span>
            <h2 className="heading-lg max-w-[14ch]">От заявки до первых отчётов</h2>
            <p className="lead mt-5 max-w-[40ch]">
              Сначала разбираемся в задаче, потом называем стоимость и сроки. Никаких работ без согласованного плана.
            </p>
          </div>
          <ol className="grid gap-x-10 sm:grid-cols-2">
            {processSteps.map((step, i) => (
              <li key={step.title} className="border-t border-[var(--ink)] pb-10 pt-5">
                <span className="mono text-sm text-[var(--ink-subtle)]">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-6 text-xl font-medium text-[var(--ink)]">{step.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--ink-muted)]">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* SHORTCUTS */}
      <section className="bg-white pb-24 sm:pb-32">
        <div className="mx-auto grid max-w-[1240px] gap-10 px-5 sm:px-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center lg:gap-20">
          <div>
            <h2 className="heading-lg max-w-[14ch]">Начните с цифр, а не со звонка</h2>
            <p className="lead mt-5 max-w-[40ch]">Посчитайте бюджет или посмотрите цены. Без обязательств.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {shortcuts.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="card-bg card-bg-hover group flex min-h-[200px] flex-col justify-between p-6"
              >
                <span className="mono text-[1.75rem] leading-none tracking-[-0.04em] text-[var(--border-strong)] transition-colors group-hover:text-[var(--ink-subtle)]">
                  {s.word}
                </span>
                <span className="mt-8 flex items-end justify-between gap-4">
                  <span>
                    <span className="block text-[17px] font-medium text-[var(--ink)]">{s.title}</span>
                    <span className="mt-1 block text-sm leading-snug text-[var(--ink-muted)]">{s.desc}</span>
                  </span>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-[var(--ink)] transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* PRINCIPLES + FAQ (dark) */}
      <section className="section-dark py-24 sm:py-32">
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="section-label">Принципы</span>
            <h2 className="heading-lg">Честно по умолчанию</h2>
            <p className="mt-5 text-lg leading-relaxed text-[var(--night-muted)]">
              Не обещаем того, что нельзя гарантировать, и не используем методы, из-за которых сайт или карточка могут
              попасть под санкции поисковиков.
            </p>
            <Link href="/guarantees" className="btn-secondary btn-sm mt-8">
              Что мы гарантируем
            </Link>
          </div>

          <ul className="mt-16 grid gap-3 md:grid-cols-3">
            {principles.map((p) => (
              <li
                key={p.title}
                className="rounded-[var(--round-lg)] border border-[var(--night-line)] bg-[var(--night-raised)] p-6"
              >
                <DotArt shape={p.shape} className="mx-auto mb-6 h-40 w-full max-w-[260px]" />
                <h3 className="text-lg font-medium text-[var(--night-ink)]">{p.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--night-muted)]">{p.desc}</p>
              </li>
            ))}
          </ul>

          <div className="mt-28 grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
            <div>
              <h2 className="heading-lg">Частые вопросы</h2>
              <p className="mt-5 max-w-[36ch] text-lg leading-relaxed text-[var(--night-muted)]">
                Не нашли ответ? Спросите в Telegram, ответим по делу.
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="btn-inverse btn-sm">
                  Задать вопрос
                </a>
                <Link href="/faq" className="btn-secondary btn-sm">
                  Все вопросы
                </Link>
              </div>
            </div>
            <FaqList items={faqs} />
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="scroll-mt-24 bg-white py-24 sm:py-32">
        <div className="mx-auto grid max-w-[1240px] gap-6 px-5 sm:px-8 lg:grid-cols-2 lg:gap-10">
          <div className="lg:py-6 lg:pr-8">
            <h2 className="heading-lg">Расскажите о задаче</h2>
            <p className="lead mb-10 mt-5 max-w-[44ch]">
              Оставьте контакты: вернёмся с уточняющими вопросами и предложим, с чего начать.
            </p>
            <ContactForm />
          </div>

          <div className="relative isolate flex min-h-[480px] flex-col justify-between overflow-hidden rounded-[28px] p-6 sm:p-10">
            <Landscape id="contact" variant="dawn" className="absolute inset-0 -z-10 h-full w-full" />
            <p className="max-w-[18ch] text-[clamp(1.75rem,3.2vw,2.5rem)] font-medium leading-[1.12] tracking-[-0.03em] text-[var(--ink)]">
              Сначала разберёмся в задаче, потом назовём стоимость и сроки.
            </p>
            <ul className="mt-10 space-y-2">
              {[
                { icon: Phone, label: PHONE_DISPLAY, href: PHONE_TEL, external: false },
                { icon: Mail, label: EMAIL, href: EMAIL_MAILTO, external: false },
                { icon: MessageCircle, label: TELEGRAM_HANDLE, href: TELEGRAM_URL, external: true },
              ].map(({ icon: Icon, label, href, external }) => (
                <li key={href}>
                  <a
                    href={href}
                    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="flex items-center gap-3 rounded-xl border border-white/70 bg-white/60 px-4 py-3 text-[15px] text-[var(--ink)] backdrop-blur-md transition-colors hover:bg-white/85"
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 truncate">{label}</span>
                    {external && <ArrowUpRight className="ml-auto h-4 w-4 opacity-50" aria-hidden="true" />}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
