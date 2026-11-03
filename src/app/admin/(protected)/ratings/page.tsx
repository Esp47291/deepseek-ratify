import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Badge, Card, Empty } from "@/components/platform/ui";
import { db } from "@/db";
import { clients, ratings, tasks, workers } from "@/db/schema";
import { ensureAdmin } from "@/lib/auth";
import { guard } from "@/lib/db-guard";
import { formatDate } from "@/lib/platform";

export const metadata: Metadata = {
  title: "Рейтинги",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminRatingsPage() {
  await ensureAdmin();
  const rows = await guard(
    () =>
      db
        .select({
          id: ratings.id,
          subjectType: ratings.subjectType,
          subjectId: ratings.subjectId,
          score: ratings.score,
          comment: ratings.comment,
          internalNote: ratings.internalNote,
          createdAt: ratings.createdAt,
          taskId: ratings.taskId,
          taskTitle: tasks.title,
        })
        .from(ratings)
        .leftJoin(tasks, eq(tasks.id, ratings.taskId))
        .orderBy(desc(ratings.createdAt)),
    []
  );

  const workerList = await guard(
    () => db.select({ id: workers.id, name: workers.name }).from(workers),
    []
  );
  const clientList = await guard(
    () => db.select({ id: clients.id, name: clients.name }).from(clients),
    []
  );

  const names = new Map<string, string>();
  for (const w of workerList) names.set(`worker:${w.id}`, w.name);
  for (const c of clientList) names.set(`client:${c.id}`, c.name);

  const average = (type: string, id: number): { score: number | null; count: number } => {
    const scores = rows
      .filter((r) => r.subjectType === type && r.subjectId === id)
      .map((r) => r.score);
    return {
      score:
        scores.length === 0
          ? null
          : Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
      count: scores.length,
    };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-medium text-[var(--ink)]">Рейтинги</h1>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Оценки не редактируются и не удаляются: таблица только дополняется. Комментарий
          видит сторона, внутреннюю заметку — только вы.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Исполнители">
          {workerList.length === 0 ? (
            <Empty>Исполнителей пока нет.</Empty>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {workerList.map((w) => {
                const avg = average("worker", w.id);
                return (
                  <li key={w.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                    <span className="text-sm text-[var(--ink)]">{w.name}</span>
                    <span className="text-xs text-[var(--ink-muted)]">
                      {avg.score === null ? "без оценок" : `${avg.score.toFixed(1)} · ${avg.count}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Заказчики">
          {clientList.length === 0 ? (
            <Empty>Заказчиков пока нет.</Empty>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {clientList.map((c) => {
                const avg = average("client", c.id);
                return (
                  <li key={c.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                    <Link href={`/admin/clients/${c.id}`} className="text-sm text-[var(--ink)] underline">
                      {c.name}
                    </Link>
                    <span className="text-xs text-[var(--ink-muted)]">
                      {avg.score === null ? "без оценок" : `${avg.score.toFixed(1)} · ${avg.count}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Все оценки">
        {rows.length === 0 ? (
          <Empty>Оценок пока нет. Они появятся после первого принятого задания.</Empty>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {rows.map((row) => (
              <li key={row.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm text-[var(--ink)]">
                    {names.get(`${row.subjectType}:${row.subjectId}`) ?? "—"}{" "}
                    <Badge>{row.subjectType === "worker" ? "исполнитель" : "заказчик"}</Badge>
                  </span>
                  <span className="text-xs text-[var(--ink-muted)]">
                    {row.score} ★ · {formatDate(row.createdAt)}
                  </span>
                </div>
                {row.taskTitle && (
                  <p className="mt-1 text-xs text-[var(--ink-subtle)]">
                    <Link href={`/admin/tasks/${row.taskId}`} className="underline">
                      {row.taskTitle}
                    </Link>
                  </p>
                )}
                {row.comment && (
                  <p className="mt-1 text-sm leading-relaxed text-[var(--ink-muted)]">{row.comment}</p>
                )}
                {row.internalNote && (
                  <p className="mt-1 rounded border border-dashed border-[var(--border-strong)] px-2 py-1 text-xs text-[var(--ink-subtle)]">
                    внутреннее: {row.internalNote}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
