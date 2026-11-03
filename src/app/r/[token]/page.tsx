import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import PlatformShell from "@/components/platform/PlatformShell";
import { Badge, Card, Empty, Stat } from "@/components/platform/ui";
import { db } from "@/db";
import { clients, ratings, reviews, taskItems, tasks, venues } from "@/db/schema";
import { guard } from "@/lib/db-guard";
import {
  TASK_STATUS_LABELS,
  computeTaskMoney,
  formatDate,
  formatRating,
  formatRub,
  summarizeRatings,
} from "@/lib/platform";

export const metadata: Metadata = {
  title: "Кабинет заказчика",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ClientCabinetPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const client = await guard(async () => {
    const [row] = await db.select().from(clients).where(eq(clients.token, token));
    return row ?? null;
  }, null);

  if (!client) notFound();

  const venueList = await guard(
    () => db.select().from(venues).where(eq(venues.clientId, client.id)).orderBy(asc(venues.id)),
    []
  );

  const taskList = await guard(
    () =>
      db
        .select()
        .from(tasks)
        .where(eq(tasks.clientId, client.id))
        .orderBy(desc(tasks.createdAt)),
    []
  );

  const taskIds = taskList.map((t) => t.id);

  const items = await guard(
    () =>
      taskIds.length === 0
        ? Promise.resolve([])
        : db
            .select({
              id: taskItems.id,
              taskId: taskItems.taskId,
              status: taskItems.status,
              revisionCount: taskItems.revisionCount,
              answer: taskItems.answer,
              reviewText: reviews.text,
              sourceUrl: reviews.sourceUrl,
              venueId: venues.id,
              venueName: venues.name,
            })
            .from(taskItems)
            .innerJoin(reviews, eq(reviews.id, taskItems.reviewId))
            .innerJoin(venues, eq(venues.id, reviews.venueId))
            .where(inArray(taskItems.taskId, taskIds))
            .orderBy(asc(venues.id), asc(taskItems.id)),
    []
  );

  const itemsByTask = new Map<number, typeof items>();
  for (const item of items) {
    const bucket = itemsByTask.get(item.taskId) ?? [];
    bucket.push(item);
    itemsByTask.set(item.taskId, bucket);
  }

  const clientScores = await guard(
    () =>
      db
        .select({ score: ratings.score })
        .from(ratings)
        .where(sql`${ratings.subjectType} = 'client' and ${ratings.subjectId} = ${client.id}`),
    []
  );

  const myRating = summarizeRatings(
    clientScores.map((s) => s.score),
    items.map((i) => ({ status: i.status, revisionCount: i.revisionCount })),
    taskList.filter((t) => t.status === "accepted").length
  );

  const totalAccepted = items.filter((i) => i.status === "accepted").length;
  const totalItems = items.length;

  return (
    <PlatformShell viewer={client.name} role="заказчик">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-medium text-[var(--ink)]">Мои задания</h1>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              Прогресс по работе с отзывами. Без переписки и звонков.
            </p>
          </div>
          <Link
            href={`/r/${token}/report`}
            className="rounded-[var(--round-md)] border border-[var(--border-strong)] px-3 py-2 text-sm text-[var(--ink-muted)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
          >
            Открыть отчёт →
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Заданий" value={taskList.length} />
          <Stat
            label="Обработано отзывов"
            value={`${totalAccepted} / ${totalItems}`}
            hint={totalItems > 0 ? `${Math.round((totalAccepted / totalItems) * 100)}%` : undefined}
          />
          <Stat label="Наш рейтинг по вам" value={formatRating(myRating)} />
        </div>

        <Card title="Филиалы">
          {venueList.length === 0 ? (
            <Empty>Филиалы ещё не заведены.</Empty>
          ) : (
            <ul className="space-y-2">
              {venueList.map((venue) => (
                <li key={venue.id} className="rounded-[var(--round-md)] border border-[var(--border)] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-[var(--ink)]">{venue.name}</p>
                      <p className="text-xs text-[var(--ink-muted)]">{venue.address || "—"}</p>
                    </div>
                    {venue.mapUrl && (
                      <a
                        href={venue.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--ink-muted)] underline"
                      >
                        карточка
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Задания и прогресс">
          {taskList.length === 0 ? (
            <Empty>Заданий пока нет.</Empty>
          ) : (
            <ul className="space-y-4">
              {taskList.map((task) => {
                const taskItemsList = itemsByTask.get(task.id) ?? [];
                const money = computeTaskMoney(
                  task.clientRate,
                  task.workerRate,
                  taskItemsList.map((i) => i.status)
                );

                return (
                  <li key={task.id} className="rounded-[var(--round-md)] border border-[var(--border)] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-[var(--ink)]">{task.title}</p>
                      <Badge tone={task.status === "accepted" ? "success" : "accent"}>
                        {TASK_STATUS_LABELS[task.status] ?? task.status}
                      </Badge>
                    </div>

                    <div className="mt-3">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
                        <div
                          className="h-full rounded-full bg-[var(--ink)]"
                          style={{ width: `${money.progressPct}%` }}
                        />
                      </div>
                      <p className="mt-1.5 text-xs text-[var(--ink-muted)]">
                        {money.acceptedCount} из {money.totalCount} принято · {money.progressPct}%
                      </p>
                    </div>

                    <p className="mt-2 text-xs text-[var(--ink-subtle)]">
                      {formatDate(task.dueAt)} · {formatRub(money.clientTotal)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </PlatformShell>
  );
}
