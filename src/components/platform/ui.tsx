import type { ReactNode } from "react";

/** Карточка-блок кабинета. */
export function Card({
  title,
  action,
  children,
  muted = false,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <section
      className={`rounded-[var(--round-lg)] border border-[var(--border)] p-5 ${
        muted ? "bg-[var(--surface-muted)]" : "bg-white"
      }`}
    >
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          {title && (
            <h2 className="text-[15px] font-medium text-[var(--ink)]">{title}</h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Крупная цифра с подписью. */
export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-[var(--round-md)] border border-[var(--border)] bg-white p-4">
      <p className="text-xs text-[var(--ink-subtle)]">{label}</p>
      <p className="mt-1 text-2xl font-medium tabular-nums text-[var(--ink)]">{value}</p>
      {hint && <p className="mt-1 text-xs text-[var(--ink-muted)]">{hint}</p>}
    </div>
  );
}

const TONES: Record<string, string> = {
  neutral: "border-[var(--border)] text-[var(--ink-muted)]",
  success: "border-[var(--success)] text-[var(--success)]",
  danger: "border-[var(--danger)] text-[var(--danger)]",
  accent: "border-[var(--ink)] text-[var(--ink)]",
};

/** Статус-пилюля. */
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: keyof typeof TONES;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] leading-5 ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

/** Пустое состояние: объясняет, что делать, вместо пустоты. */
export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-[var(--round-md)] border border-dashed border-[var(--border-strong)] px-4 py-6 text-center text-sm text-[var(--ink-muted)]">
      {children}
    </p>
  );
}
