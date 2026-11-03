import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loginAction } from "@/app/admin/actions";
import PlatformShell from "@/components/platform/PlatformShell";
import { isAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Вход в кабинет",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAdmin()) {
    redirect("/admin");
  }

  const { error } = await searchParams;

  return (
    <PlatformShell viewer="Вход" role="кабинет владельца">
      <div className="mx-auto max-w-sm">
        <h1 className="text-xl font-medium text-[var(--ink)]">Кабинет владельца</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]">
          Пароль задаётся переменной <code className="mono text-xs">ADMIN_PASSWORD</code> в
          окружении сервера.
        </p>

        <form action={loginAction} className="mt-6 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--ink-muted)]">Пароль</span>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              autoFocus
              className="w-full rounded-[var(--round-md)] border border-[var(--border-strong)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--ink)]"
            />
          </label>

          {error === "config" ? (
            <div className="rounded-[var(--round-md)] border border-[var(--danger)] px-3 py-2 text-sm text-[var(--danger)]">
              <p className="font-medium">Кабинет не настроен</p>
              <p className="mt-1 text-xs leading-relaxed">
                Задайте <code className="mono">ADMIN_PASSWORD</code> и{" "}
                <code className="mono">SESSION_SECRET</code> в файле <code className="mono">.env</code>{" "}
                на сервере и перезапустите приложение.
              </p>
            </div>
          ) : error === "slow" ? (
            <p className="rounded-[var(--round-md)] border border-[var(--danger)] px-3 py-2 text-sm text-[var(--danger)]">
              Слишком много попыток. Подождите 10 минут.
            </p>
          ) : error ? (
            <p className="rounded-[var(--round-md)] border border-[var(--danger)] px-3 py-2 text-sm text-[var(--danger)]">
              Неверный пароль
            </p>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-[var(--round-md)] bg-[var(--ink)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Войти
          </button>
        </form>
      </div>
    </PlatformShell>
  );
}
