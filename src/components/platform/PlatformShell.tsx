import Link from "next/link";
import type { ReactNode } from "react";

interface PlatformShellProps {
  /** Кто смотрит страницу: «Владелец», имя исполнителя, название заказчика */
  viewer: string;
  /** Подпись роли под именем */
  role: string;
  /** Ссылки навигации текущего кабинета */
  nav?: { href: string; label: string }[];
  children: ReactNode;
  /** Правый слот в шапке: выход, переключатель и т.п. */
  actions?: ReactNode;
}

/**
 * Общая рамка кабинетов платформы.
 * Намеренно простая: это рабочий инструмент, а не витрина.
 */
export default function PlatformShell({
  viewer,
  role,
  nav,
  children,
  actions,
}: PlatformShellProps) {
  return (
    <div className="min-h-screen bg-[var(--surface-muted)]">
      <header className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="mono text-lg font-medium tracking-[-0.03em] text-[var(--ink)]"
            >
              ratify
            </Link>
            <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] text-[var(--ink-muted)]">
              платформа
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium leading-tight text-[var(--ink)]">
                {viewer}
              </p>
              <p className="text-xs leading-tight text-[var(--ink-subtle)]">{role}</p>
            </div>
            {actions}
          </div>
        </div>

        {nav && nav.length > 0 && (
          <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-5 pb-2 sm:px-6">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-[var(--ink-muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-6">{children}</main>
    </div>
  );
}
