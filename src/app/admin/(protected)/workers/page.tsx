import type { Metadata } from "next";
import { desc, eq, sql } from "drizzle-orm";
import { createWorkerAction, toggleWorkerBlockAction } from "@/app/admin/(protected)/actions";
import { Badge, Card, Empty } from "@/components/platform/ui";
import { db } from "@/db";
import { ratings, taskItems, tasks, workers } from "@/db/schema";
import { ensureAdmin } from "@/lib/auth";
import { guard } from "@/lib/db-guard";
import { formatRating, summarizeRatings } from "@/lib/platform";

export const metadata: Metadata = {
  title: "Исполнители",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const inputClass =
  "w-full rounded-[var(--round-md)] border border-[var(--border-strong)] px-3 py-2 text-sm outline-none focus:border-[var(--ink)]";

export default async function AdminWorkersPage() {
  await ensureAdmin();
  const list = await guard(
    () =>
      db
        .select({
          id: workers.id,
          name: workers.name,
          telegram: workers.telegram,
          token: workers.token,
          blockedAt: workers.blockedAt,
        })
        .from(workers)
        .orderBy(desc(workers.createdAt)),
    []
  );

  const scores = await guard(
    () =>
      db
        .select({ subjectId: ratings.subjectId, score: ratings.score })
        .from(ratings)
        .where(eq(ratings.subjectType, "worker")),
    []
  );

  const itemStats = await guard(
    () =>
      db
        .select({
          workerId: tasks.workerId,
          status: taskItems.status,
          revisionCount: taskItems.revisionCount,
          count: sql<number>`count(*)::int`,
        })
        .from(taskItems)
        .innerJoin(tasks, eq(tasks.id, taskItems.taskId))
        .groupBy(tasks.workerId, taskItems.status, taskItems.revisionCount),
    []
  );

  const completed = await guard(
    () =>
      db
        .select({
          workerId: tasks.workerId,
          count: sql<number>`count(*)::int`,
        })
        .from(tasks)
        .where(eq(tasks.status, "accepted"))
        .groupBy(tasks.workerId),
    []
  );

  const scoresByWorker = new Map<number, number[]>();
  for (const row of scores) {
    const bucket = scoresByWorker.get(row.subjectId) ?? [];
    bucket.push(row.score);
    scoresByWorker.set(row.subjectId, bucket);
  }

  const statusesByWorker = new Map<number, { status: string; revisionCount: number }[]>();
  for (const row of itemStats) {
    if (row.workerId === null) continue;
    const bucket = statusesByWorker.get(row.workerId) ?? [];
    for (let i = 0; i < row.count; i++) {
      bucket.push({ status: row.status, revisionCount: row.revisionCount });
    }
    statusesByWorker.set(row.workerId, bucket);
  }

  const completedByWorker = new Map(completed.map((r) => [r.workerId, r.count]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-medium text-[var(--ink)]">Исполнители</h1>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Рейтинг считается из событий: оценки, принятые позиции, доля с первого раза.
        </p>
      </div>

      <Card title="Добавить исполнителя">
        <form action={createWorkerAction} className="grid gap-3 sm:grid-cols-3">
          <label className="block sm:col-span-1">
            <span className="mb-1 block text-xs text-[var(--ink-muted)]">Имя *</span>
            <input name="name" required className={inputClass} />
          </label>
          <label className="block sm:col-span-1">
            <span className="mb-1 block text-xs text-[var(--ink-muted)]">Telegram</span>
            <input name="telegram" placeholder="@nickname" className={inputClass} />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="rounded-[var(--round-md)] bg-[var(--ink)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Добавить
            </button>
          </div>
        </form>
      </Card>

      <Card title="Все исполнители">
        {list.length === 0 ? (
          <Empty>Пока ни одного исполнителя.</Empty>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {list.map((worker) => {
              const summary = summarizeRatings(
                scoresByWorker.get(worker.id) ?? [],
                statusesByWorker.get(worker.id) ?? [],
                completedByWorker.get(worker.id) ?? 0
              );

              return (
                <li key={worker.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium text-[var(--ink)]">
                      {worker.name}
                      {worker.blockedAt && <Badge tone="danger">заблокирован</Badge>}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                      {worker.telegram ? `${worker.telegram} · ` : ""}
                      {formatRating(summary)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={`/work/${worker.token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-[var(--border-strong)] px-2 py-1 text-xs text-[var(--ink-muted)] hover:border-[var(--ink)]"
                    >
                      кабинет
                    </a>
                    <form action={toggleWorkerBlockAction}>
                      <input type="hidden" name="workerId" value={worker.id} />
                      <input type="hidden" name="blocked" value={worker.blockedAt ? "0" : "1"} />
                      <button
                        type="submit"
                        className="rounded-lg border border-[var(--border-strong)] px-2 py-1 text-xs text-[var(--ink-muted)] hover:border-[var(--ink)]"
                      >
                        {worker.blockedAt ? "разблокировать" : "заблокировать"}
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
