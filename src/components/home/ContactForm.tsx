"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { CircleCheck, LoaderCircle } from "lucide-react";
import PhoneField from "@/components/PhoneField";
import { submitLead } from "@/lib/leads-client";

const labelClass = "mb-2 block text-[15px] text-[var(--ink)]";

export default function ContactForm() {
  const [form, setForm] = useState({ name: "", phone: "", companyUrl: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const err = await submitLead({ ...form, type: "contact" });
    setLoading(false);
    if (err) setError(err);
    else {
      setSent(true);
      setForm({ name: "", phone: "", companyUrl: "", message: "" });
    }
  };

  if (sent) {
    return (
      <div className="flex min-h-[420px] flex-col items-start justify-center">
        <CircleCheck className="mb-4 h-10 w-10 text-[var(--success)]" aria-hidden="true" />
        <p className="heading-md">Заявка принята</p>
        <p className="mt-2 text-[var(--ink-muted)]">Свяжемся с вами в ближайшее время.</p>
        <button type="button" onClick={() => setSent(false)} className="btn-secondary btn-sm mt-6">
          Отправить ещё одну
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className={labelClass}>
            Имя
          </label>
          <input
            id="contact-name"
            type="text"
            autoComplete="name"
            placeholder="Как к вам обращаться"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input-field"
            required
          />
        </div>
        <div>
          <label htmlFor="contact-phone" className={labelClass}>
            Телефон
          </label>
          <PhoneField
            id="contact-phone"
            value={form.phone}
            onChange={(phone) => setForm({ ...form, phone })}
            required
          />
        </div>
      </div>
      <div>
        <label htmlFor="contact-site" className={labelClass}>
          Сайт или карточка компании <span className="text-[var(--ink-subtle)]">(если есть)</span>
        </label>
        <input
          id="contact-site"
          type="text"
          inputMode="url"
          placeholder="example.ru"
          value={form.companyUrl}
          onChange={(e) => setForm({ ...form, companyUrl: e.target.value })}
          className="input-field"
        />
      </div>
      <div>
        <label htmlFor="contact-message" className={labelClass}>
          Коротко о задаче
        </label>
        <textarea
          id="contact-message"
          rows={4}
          placeholder="Например: запускаем рекламу впервые, нужен Директ под интернет-магазин"
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="input-field resize-y"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-4 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-[40ch] text-xs leading-relaxed text-[var(--ink-subtle)]">
          Отправляя заявку, вы соглашаетесь с{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-[var(--ink)]">
            политикой конфиденциальности
          </Link>
          .
        </p>
        <button type="submit" disabled={loading} className="btn-primary shrink-0 disabled:opacity-60">
          {loading && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {loading ? "Отправляем" : "Отправить заявку"}
        </button>
      </div>
    </form>
  );
}
