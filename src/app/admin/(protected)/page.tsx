import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { createClientAction } from "@/app/admin/(protected)/actions";
import { Card, Empty, Stat } from "@/components/platform/ui";
import { db } from "@/db";
import { clients, reviews, tasks, venues } from "@/db/schema";
import { ensureAdmin } from "@/lib/auth";
import { guard } from "@/lib/db-guard";
import { plural } from "@/lib/platform";

export const metadata: Metadata = {
  title: "Заказчики",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminClientsPage() {
  await ensureAdmin();
  const list = await guard(
    () =>
      db
        .select({
          id: clients.id,
          name: clients.name,
          token: clients.token,
          createdAt: clients.createdAt,
        })
        .from(clients)
        .orderBy(desc(clients.createdAt)),
    []
  );

  const venueCounts = await guard(
    () =>
      db
        .select({ clientId: venues.clientId, count: sql<number>`count(*)::int` })
        .from(venues)
        .groupBy(venues.clientId),
    []
  );

  const reviewCounts = await guard(
    () =>
      db
        .select({
          clientId: venues.clientId,
          count: sql<number>`count(${reviews.id})::int`,
        })
        .from(reviews)
        .innerJoin(venues, eq(venues.id, reviews.venueId))
        .groupBy(venues.clientId),
    []
  );

  const taskStats = await guard(
    () =>
      db
        .select({
          clientId: tasks.clientId,
          count: sql<number>`count(*)::int`,
          accepted: sql<number>`count(*) filter (where ${tasks.status} = 'accepted')::int`,
        })
        .from(tasks)
        .groupBy(tasks.clientId),
    []
  );

  const venueByClient = new Map(venueCounts.map((r) => [r.clientId, r.count]));
  const reviewByClient = new Map(reviewCounts.map((r) => [r.clientId, r.count]));
  const taskByClient = new Map(taskStats.map((r) => [r.clientId, r]));

  const activeTasks = await guard(
    () =>
      db
        .select({
          id: tasks.id,
          title: tasks.title,
          status: tasks.status,
          clientRate: tasks.clientRate,
        })
        .from(tasks)
        .orderBy(desc(tasks.createdAt))
        .limit(5),
    []
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-medium text-[var(--ink)]">Заказчики</h1>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Сеть заведений, её филиалы и отзывы. Задание собирается из отзывов.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Заказчиков" value={list.length} />
        <Stat
          label="Филиалов"
          value={venueCounts.reduce((sum, r) => sum + r.count, 0)}
        />
        <Stat
          label="Отзывов в базе"
          value={reviewCounts.reduce((sum, r) => sum + r.count, 0)}
        />
      </div>

      <Card title="Добавить заказчика">
        <form action={createClientAction} className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs text-[var(--ink-muted)]">Название *</span>
            <input
              name="name"
              required
              placeholder="Сеть клиник «Пример»"
              className="w-full rounded-[var(--round-md)] border border-[var(--border-strong)] px-3 py-2 text-sm outline-none focus:border-[var(--ink)]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--ink-muted)]">Контактное лицо</span>
            <input
              name="contactName"
              className="w-full rounded-[var(--round-md)] border border-[var(--border-strong)] px-3 py-2 text-sm outline-none focus:border-[var(--ink)]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--ink-muted)]">Телефон</span>
            <input
              name="contactPhone"
              className="w-full rounded-[var(--round-md)] border border-[var(--border-strong)] px-3 py-2 text-sm outline-none focus:border-[var(--ink)]"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-[var(--round-md)] bg-[var(--ink)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Создать заказчика
            </button>
          </div>
        </form>
      </Card>

      <Card title="Все заказчики">
        {list.length === 0 ? (
          <Empty>
            Пока ни одного заказчика. Создайте первого — и добавьте его филиалы с отзывами.
          </Empty>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {list.map((client) => {
              const stats = taskByClient.get(client.id);
              const venueCount = venueByClient.get(client.id) ?? 0;
              const reviewCount = reviewByClient.get(client.id) ?? 0;

              return (
                <li key={client.id} className="py-3 first:pt-0 last:pb-0">
                  <Link
                    href={`/admin/clients/${client.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg px-1 py-1 transition-colors hover:bg-[var(--surface-muted)]"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--ink)]">{client.name}</p>
                      <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                        {venueCount} {plural(venueCount, "филиал", "филиала", "филиалов")} ·{" "}
                        {reviewCount} {plural(reviewCount, "отзыв", "отзыва", "отзывов")} ·{" "}
                        {stats?.count ?? 0}{" "}
                        {plural(stats?.count ?? 0, "задание", "задания", "заданий")}
                      </p>
                    </div>
                    <span className="text-xs text-[var(--ink-subtle)]">
                      {stats?.accepted ? `принято ${stats.accepted}` : ""}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {activeTasks.length > 0 && (
        <Card title="Последние задания" action={<Link href="/admin/tasks" className="text-sm text-[var(--ink-muted)] underline">Все задания</Link>}>
          <ul className="divide-y divide-[var(--border)]">
            {activeTasks.map((task) => (
              <li key={task.id} className="py-2 first:pt-0 last:pb-0">
                <Link
                  href={`/admin/tasks/${task.id}`}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="text-[var(--ink)]">{task.title}</span>
                  <span className="text-xs text-[var(--ink-subtle)]">{task.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
