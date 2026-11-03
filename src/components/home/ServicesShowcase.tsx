"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import Landscape, { type LandscapeVariant } from "@/components/Landscape";
import { services } from "@/lib/services-data";

const scenery: Record<string, LandscapeVariant> = {
  "yandex-direct": "blush",
  seo: "meadow",
  audit: "sage",
  "yandex-business": "dawn",
};

type Detail = "includes" | "forWho";

export default function ServicesShowcase() {
  const reduceMotion = useReducedMotion();
  const [activeSlug, setActiveSlug] = useState(services[0].slug);
  const [detail, setDetail] = useState<Detail>("includes");
  const active = services.find((s) => s.slug === activeSlug) ?? services[0];
  const fade = reduceMotion ? { duration: 0 } : { duration: 0.35, ease: [0.2, 0.7, 0.2, 1] as const };

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
      <div>
        <span className="section-label">Услуги</span>
        <h2 className="heading-lg max-w-[15ch]">Поиск, реклама и карты в одних руках</h2>
        <p className="lead mt-5 max-w-[46ch]">
          Можно взять одну услугу или собрать связку. Если не знаете, с чего начать, начните с аудита: он покажет, что
          даст результат быстрее.
        </p>

        <ul className="mt-10 space-y-1.5">
          {services.map((s) => {
            const isActive = s.slug === activeSlug;
            return (
              <li
                key={s.slug}
                className={`relative flex items-center gap-4 rounded-xl py-4 pl-5 pr-4 transition-colors ${
                  isActive ? "lg:bg-[var(--surface-muted)]" : "lg:hover:bg-[var(--surface-muted)]/60"
                }`}
              >
                <span
                  className={`absolute bottom-4 left-0 top-4 w-[3px] rounded-full transition-colors ${
                    isActive ? "bg-[var(--border)] lg:bg-[var(--ink)]" : "bg-[var(--border)] lg:bg-transparent"
                  }`}
                  aria-hidden="true"
                />
                {/* Desktop: selects the service for the preview panel. Phones: goes to the page. */}
                <button
                  type="button"
                  onClick={() => setActiveSlug(s.slug)}
                  aria-pressed={isActive}
                  className="hidden w-full min-w-0 flex-1 text-left lg:block"
                >
                  <span className="block text-[17px] font-medium text-[var(--ink)]">{s.title}</span>
                  <span className="mt-1 block text-[15px] leading-snug text-[var(--ink-muted)]">{s.short}</span>
                </button>
                <Link
                  href={`/services/${s.slug}`}
                  className="flex w-full min-w-0 flex-1 items-center justify-between gap-4 lg:hidden"
                >
                  <span>
                    <span className="block text-[17px] font-medium text-[var(--ink)]">{s.title}</span>
                    <span className="mt-1 block text-[15px] leading-snug text-[var(--ink-muted)]">{s.short}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[var(--ink)]" aria-hidden="true" />
                </Link>
                <span className="hidden shrink-0 lg:block">
                  <Link href={`/services/${s.slug}`} className={`${isActive ? "btn-primary" : "btn-secondary"} btn-sm`}>
                    Подробнее
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Preview panel over a landscape, like a product screenshot */}
      {/* Desktop only: on phones the rows link straight to the service pages */}
      <div className="relative hidden min-h-[520px] overflow-hidden rounded-[28px] bg-[var(--haze)] lg:sticky lg:top-28 lg:block">
        <AnimatePresence initial={false}>
          <motion.div
            key={active.slug}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fade}
            className="absolute inset-0"
          >
            <Landscape
              id={`svc-${active.slug}`}
              variant={scenery[active.slug] ?? "meadow"}
              className="h-full w-full"
            />
          </motion.div>
        </AnimatePresence>

        <div className="relative p-4 sm:p-10">
          <div className="glass-panel space-y-2 p-2">
            <div className="rounded-2xl bg-white p-5">
              <p className="mb-2 text-sm text-[var(--ink-muted)]">Услуга</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="flex min-h-11 flex-1 items-center rounded-lg border border-[var(--border)] px-3.5 text-[15px] text-[var(--ink)]">
                  {active.title}
                </div>
                <Link href={`/services/${active.slug}`} className="btn-primary btn-sm">
                  Подробнее
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
              <p className="mt-2 text-xs text-[var(--ink-subtle)]">
                Стоимость: <span className="text-[var(--ink-muted)]">{active.price}</span>
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-sm text-[var(--ink-muted)]">
                  {detail === "includes" ? "Что входит" : "Кому подходит"}
                </p>
                <div className="inline-flex rounded-lg bg-[var(--surface-muted)] p-0.5 text-xs" role="group" aria-label="Показать">
                  {(
                    [
                      ["includes", "Состав"],
                      ["forWho", "Кому"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setDetail(id)}
                      aria-pressed={detail === id}
                      className={`rounded-md px-2.5 py-1 transition-colors ${
                        detail === id
                          ? "bg-white text-[var(--ink)] shadow-[0_1px_2px_rgba(10,10,11,0.08)]"
                          : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <AnimatePresence mode="wait" initial={false}>
                <motion.ul
                  key={`${active.slug}-${detail}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={reduceMotion ? { duration: 0 } : { duration: 0.18 }}
                  className="space-y-2.5"
                >
                  {active[detail].map((item) => (
                    <li key={item} className="flex gap-2.5 text-[15px] leading-snug text-[var(--ink)]">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ink-subtle)]" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </motion.ul>
              </AnimatePresence>
              {active.note && detail === "includes" && (
                <p className="mt-4 border-t border-[var(--border)] pt-3 text-xs leading-relaxed text-[var(--ink-muted)]">
                  {active.note}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
