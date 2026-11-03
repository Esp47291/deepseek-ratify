import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { logoutAction } from "@/app/admin/actions";
import PlatformShell from "@/components/platform/PlatformShell";
import { isAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!(await isAdmin())) {
    redirect("/admin/login");
  }

  return (
    <PlatformShell
      viewer="Владелец"
      role="полный доступ"
      nav={[
        { href: "/admin", label: "Заказчики" },
        { href: "/admin/tasks", label: "Задания" },
        { href: "/admin/workers", label: "Исполнители" },
        { href: "/admin/ratings", label: "Рейтинги" },
      ]}
      actions={
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-lg border border-[var(--border-strong)] px-3 py-1.5 text-sm text-[var(--ink-muted)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]"
          >
            Выйти
          </button>
        </form>
      }
    >
      {children}
    </PlatformShell>
  );
}
