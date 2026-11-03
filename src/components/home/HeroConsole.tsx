"use client";

import { useMemo, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUp, Check, CircleCheck, Globe, LoaderCircle } from "lucide-react";
import PhoneField from "@/components/PhoneField";
import { calcBudget } from "@/lib/budget-math";
import { submitLead } from "@/lib/leads-client";
import { getService } from "@/lib/services-data";

type Tab = "budget" | "audit";

const tabs: { id: Tab; label: string; hint: string }[] = [
  { id: "budget", label: "/бюджет", hint: "Посчитайте заявки от рекламы" },
  { id: "audit", label: "/аудит", hint: "Закажите разбор сайта" },
];

const sliders = [
  { key: "budget", label: "Бюджет в месяц", min: 10000, max: 500000, step: 5000, unit: "₽" },
  { key: "cpc", label: "Цена клика", min: 5, max: 300, step: 1, unit: "₽" },
  { key: "conversionPct", label: "Конверсия сайта", min: 0.5, max: 15, step: 0.5, unit: "%" },
] as const;

type SliderKey = (typeof sliders)[number]["key"];

// Same example values as on the calculator page; only for illustration.
const initialValues: Record<SliderKey, number> = { budget: 50000, cpc: 40, conversionPct: 3 };

function fmt(n: number, digits = 0): string {
  return n.toLocaleString("ru-RU", { maximumFractionDigits: digits });
}

function BudgetTab() {
  const [values, setValues] = useState(initialValues);
  const result = useMemo(
    () => calcBudget({ ...values, closePct: 0, avgCheck: 0 }),
    [values]
  );

  const tiles = [
    { label: "кликов", value: fmt(result.clicks) },
    { label: "заявок", value: fmt(result.leads, 1) },
    { label: "цена заявки", value: result.costPerLead === null ? "—" : `${fmt(result.costPerLead)} ₽` },
  ];

  return (
    <div>
      <div className="grid gap-5 sm:grid-cols-3 sm:gap-6">
        {sliders.map((s) => {
          const value = values[s.key];
          const fill = `${((value - s.min) / (s.max - s.min)) * 100}%`;
          return (
            <div key={s.key}>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <label htmlFor={`hero-${s.key}`} className="text-sm text-[var(--ink-muted)]">
                  {s.label}
                </label>
                <span className="text-[15px] font-medium tabular-nums text-[var(--ink)]">
                  {fmt(value, 1)} {s.unit}
                </span>
              </div>
              <input
                id={`hero-${s.key}`}
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={value}
                onChange={(e) => setValues({ ...values, [s.key]: Number(e.target.value) })}
                className="range-input"
                style={{ "--fill": fill } as CSSProperties}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-4">
        <p className="text-sm text-[var(--ink-muted)]">При этих цифрах в месяц</p>
        <Link
          href="/calculator"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--ink)] underline-offset-4 hover:underline"
        >
          Полный расчёт с выручкой
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2" aria-live="polite">
        {tiles.map((t) => (
          <div key={t.label} className="flex min-w-0 flex-col-reverse rounded-xl bg-[var(--surface-muted)] px-2.5 py-3.5 sm:px-4">
            <dt className="mt-0.5 text-xs text-[var(--ink-muted)] sm:text-sm">{t.label}</dt>
            <dd className="whitespace-nowrap text-[1.0625rem] font-medium tabular-nums tracking-[-0.02em] text-[var(--ink)] min-[420px]:text-xl sm:text-[1.75rem]">
              {t.value}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 text-xs leading-relaxed text-[var(--ink-subtle)]">
        Простая арифметика по вашим числам, а не прогноз и не обещание результата.
      </p>
    </div>
  );
}

function AuditTab() {
  const audit = getService("audit");
  const [form, setForm] = useState({ companyUrl: "", name: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const err = await submitLead({
      ...form,
      service: audit?.title,
      message: "Заявка на аудит с главной страницы",
      type: "order",
    });
    setLoading(false);
    if (err) setError(err);
    else setSent(true);
  };

  if (sent) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
        <CircleCheck className="mb-3 h-9 w-9 text-[var(--success)]" aria-hidden="true" />
        <p className="text-lg font-medium text-[var(--ink)]">Заявка на аудит принята</p>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">Свяжемся, уточним задачу и назовём стоимость.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-white p-1.5 shadow-[0_1px_2px_rgba(10,10,11,0.04)] lg:flex-row lg:items-center">
        <label className="flex min-w-0 flex-[1.4] items-center gap-2.5 rounded-lg px-3">
          <Globe className="h-4 w-4 shrink-0 text-[var(--ink-subtle)]" aria-hidden="true" />
          <span className="sr-only">Адрес сайта</span>
          <input
            type="text"
            inputMode="url"
            placeholder="Адрес сайта"
            value={form.companyUrl}
            onChange={(e) => setForm({ ...form, companyUrl: e.target.value })}
            className="h-11 w-full min-w-0 bg-transparent text-[15px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-subtle)]"
          />
        </label>
        <span className="hidden h-6 w-px bg-[var(--border)] lg:block" aria-hidden="true" />
        <label className="min-w-0 flex-1 px-3">
          <span className="sr-only">Имя</span>
          <input
            type="text"
            autoComplete="name"
            placeholder="Имя"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="h-11 w-full min-w-0 bg-transparent text-[15px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-subtle)]"
          />
        </label>
        <span className="hidden h-6 w-px bg-[var(--border)] lg:block" aria-hidden="true" />
        <label className="min-w-0 flex-1 px-3">
          <span className="sr-only">Телефон</span>
          <PhoneField
            value={form.phone}
            onChange={(phone) => setForm({ ...form, phone })}
            className="h-11 w-full min-w-0 bg-transparent text-[15px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-subtle)]"
          />
        </label>
        <button type="submit" disabled={loading} className="btn-primary btn-sm shrink-0 disabled:opacity-60">
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {loading ? "Отправляем" : "Запросить аудит"}
          {!loading && <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      <p className="mb-2 mt-5 text-sm text-[var(--ink-muted)]">Что проверим</p>
      <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {(audit?.includes ?? []).slice(0, 4).map((item) => (
          <li key={item} className="flex gap-2.5 text-[15px] leading-snug text-[var(--ink)]">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ink-subtle)]" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>

      <p className="mt-5 text-xs leading-relaxed text-[var(--ink-subtle)]">
        Стоимость аудита назовём после короткого разговора. Отправляя заявку, вы соглашаетесь с{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-[var(--ink)]">
          политикой конфиденциальности
        </Link>
        .
      </p>
    </form>
  );
}

export default function HeroConsole() {
  const [tab, setTab] = useState<Tab>("budget");
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ budget: null, audit: null });
  const active = tabs.find((t) => t.id === tab) ?? tabs[0];

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const idx = tabs.findIndex((t) => t.id === tab);
    const next = tabs[(idx + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length].id;
    setTab(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="glass-panel p-2 text-left sm:p-2.5">
      <div className="flex items-center justify-between gap-3 px-1 pb-2 pt-0.5">
        <div role="tablist" aria-label="Инструменты" onKeyDown={onTabKey} className="inline-flex rounded-xl bg-white/55 p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[t.id] = el;
              }}
              type="button"
              role="tab"
              id={`hero-tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`hero-panel-${t.id}`}
              tabIndex={tab === t.id ? 0 : -1}
              onClick={() => setTab(t.id)}
              className={`mono rounded-lg px-4 py-1.5 text-[15px] transition-colors sm:px-6 ${
                tab === t.id
                  ? "bg-white text-[var(--ink)] shadow-[0_1px_3px_rgba(10,10,11,0.1)]"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="hidden pr-2 text-sm text-[var(--ink-muted)] sm:block">{active.hint}</p>
      </div>

      <div
        role="tabpanel"
        id={`hero-panel-${tab}`}
        aria-labelledby={`hero-tab-${tab}`}
        className="min-h-[300px] rounded-2xl bg-white p-4 sm:p-6"
      >
        {tab === "budget" ? <BudgetTab /> : <AuditTab />}
      </div>
    </div>
  );
}
