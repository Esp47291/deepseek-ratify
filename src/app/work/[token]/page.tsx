import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { saveAnswerAction, releaseTaskAction, submitTaskAction, takeTaskAction } from "@/app/work/[token]/actions";
import PlatformShell from "@/components/platform/PlatformShell";
import { Badge, Card, Empty, Stat } from "@/components/platform/ui";
import { db } from "@/db";
import { ratings, reviews, taskItems, tasks, venues, workers } from "@/db/schema";
import { guard } from "@/lib/db-guard";
import {
  ITEM_STATUS_LABELS,
  TASK_STATUS_LABELS,
  formatDate,
  formatRating,
  formatRub,
  plural,
  summarizeRatings,
} from "@/lib/platform";

export const metadata: Metadata = {
  title: "Мои задания",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function WorkerPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const worker = await guard(async () => {
    const [row] = await db.select().from(workers).where(eq(workers.token, token));
    return row ?? null;
  }, null);

  if (!worker) notFound();

  const openTasks = await guard(
    () =>
      db
        .select({
          id: tasks.id,
          title: tasks.title,
          instructions: tasks.instructions,
          workerRate: tasks.workerRate,
          dueAt: tasks.dueAt,
          platform: tasks.platform,
        })
        .from(tasks)
        .where(eq(tasks.status, "open"))
        .orderBy(desc(tasks.createdAt)),
    []
  );

  const openIds = openTasks.map((t) => t.id);

  const openCounts = await guard(
    () =>
      openIds.length === 0
        ? Promise.resolve([])
        : db
            .select({
              taskId: taskItems.taskId,
              items: sql<number>`count(*)::int`,
              venueCount: sql<number>`count(distinct ${reviews.venueId})::int`,
            })
            .from(taskItems)
            .innerJoin(reviews, eq(reviews.id, taskItems.reviewId))
            .where(inArray(taskItems.taskId, openIds))
            .groupBy(taskItems.taskId),
    []
  );

  const openByTask = new Map(openCounts.map((c) => [c.taskId, c]));

  const myTasks = await guard(
    () =>
      db
        .select({
          id: tasks.id,
          title: tasks.title,
          instructions: tasks.instructions,
          status: tasks.status,
          workerRate: tasks.workerRate,
          dueAt: tasks.dueAt,
        })
        .from(tasks)
        .where(eq(tasks.workerId, worker.id))
        .orderBy(desc(tasks.createdAt)),
    []
  );

  const myIds = myTasks.map((t) => t.id);

  const myItems = await guard(
    () =>
      myIds.length === 0
        ? Promise.resolve([])
        : db
            .select({
              id: taskItems.id,
              taskId: taskItems.taskId,
              answer: taskItems.answer,
              status: taskItems.status,
              revisionCount: taskItems.revisionCount,
              revisionNote: taskItems.revisionNote,
              reviewText: reviews.text,
              sourceUrl: reviews.sourceUrl,
              venueName: venues.name,
              venueAddress: venues.address,
            })
            .from(taskItems)
            .innerJoin(reviews, eq(reviews.id, taskItems.reviewId))
            .innerJoin(venues, eq(venues.id, reviews.venueId))
            .where(inArray(taskItems.taskId, myIds))
            .orderBy(asc(venues.id), asc(taskItems.id)),
    []
  );

  const myScores = await guard(
    () =>
      db
        .select({ score: ratings.score })
        .from(ratings)
        .where(sql`${ratings.subjectType} = 'worker' and ${ratings.subjectId} = ${worker.id}`),
    []
  );

  const summary = summarizeRatings(
    myScores.map((s) => s.score),
    myItems.map((i) => ({ status: i.status, revisionCount: i.revisionCount })),
    myTasks.filter((t) => t.status === "accepted").length
  );

  const itemsByTask = new Map<number, typeof myItems>();
  for (const item of myItems) {
    const bucket = itemsByTask.get(item.taskId) ?? [];
    bucket.push(item);
    itemsByTask.set(item.taskId, bucket);
  }

  const earnings = myTasks
    .filter((t) => t.status === "accepted")
    .reduce((sum, t) => sum + t.workerRate * (itemsByTask.get(t.id)?.length ?? 0), 0);

  return (
    <PlatformShell viewer={worker.name} role="исполнитель">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-medium text-[var(--ink)]">Мои задания</h1>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Сначала берите задание — тексты отзывов откроются после этого.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Рейтинг" value={formatRating(summary)} />
          <Stat label="Принято позиций" value={summary.acceptedItems} />
          <Stat label="Заработано" value={formatRub(earnings)} hint="по принятым заданиям" />
        </div>

        {worker.blockedAt && (
          <Card muted>
            <p className="text-sm text-[var(--danger)]">
              Доступ к новым заданиям закрыт. Свяжитесь с владельцем.
            </p>
          </Card>
        )}

        <Card title="Свободные задания">
          {openTasks.length === 0 ? (
            <Empty>Свободных заданий сейчас нет.</Empty>
          ) : (
            <ul className="space-y-3">
              {openTasks.map((task) => {
                const counts = openByTask.get(task.id);
                return (
                  <li key={task.id} className="rounded-[var(--round-md)] border border-[var(--border)] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--ink)]">{task.title}</p>
                        <p className="mt-1 text-xs text-[var(--ink-muted)]">
                          {counts?.venueCount ?? 0}{" "}
                          {plural(counts?.venueCount ?? 0, "филиал", "филиала", "филиалов")} ·{" "}
                          {counts?.items ?? 0}{" "}
                          {plural(counts?.items ?? 0, "текст", "текста", "текстов")} ·{" "}
                          {formatRub(task.workerRate)} за текст
                        </p>
                        <p className="mt-1 text-xs text-[var(--ink-subtle)]">
                          срок {formatDate(task.dueAt)}
                        </p>
                      </div>

                      {worker.blockedAt ? null : (
                        <form action={takeTaskAction}>
                          <input type="hidden" name="token" value={token} />
                          <input type="hidden" name="taskId" value={task.id} />
                          <button
                            type="submit"
                            className="rounded-[var(--round-md)] bg-[var(--ink)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                          >
                            Взять задание
                          </button>
                        </form>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-[var(--ink-subtle)]">
                      Тексты отзывов появятся после того, как вы возьмёте задание.
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Задания в работе">
          {myTasks.length === 0 ? (
            <Empty>Вы ещё не брали заданий.</Empty>
          ) : (
            <div className="space-y-5">
              {myTasks.map((task) => {
                const items = itemsByTask.get(task.id) ?? [];
                const answered = items.filter((i) => i.answer?.trim()).length;
                const allAnswered = items.length > 0 && answered === items.length;
                const taskEditable =
                  task.status !== "accepted" && task.status !== "submitted";
                const canRelease =
                  task.status !== "accepted" && task.status !== "submitted";

                return (
                  <div key={task.id} className="rounded-[var(--round-md)] border border-[var(--border)] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-[var(--ink)]">{task.title}</p>
                      <Badge tone={task.status === "accepted" ? "success" : "accent"}>
                        {TASK_STATUS_LABELS[task.status] ?? task.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-[var(--ink-muted)]">
                      {answered} из {items.length} ответов · {formatRub(task.workerRate)} за текст
                    </p>

                    {task.instructions && (
                      <p className="mt-3 whitespace-pre-line rounded-[var(--round-sm)] bg-[var(--surface-muted)] p-3 text-xs leading-relaxed text-[var(--ink-muted)]">
                        {task.instructions}
                      </p>
                    )}

                    <ol className="mt-4 space-y-4">
                      {items.map((item, index) => (
                        <li key={item.id} className="border-t border-[var(--border)] pt-4 first:border-0 first:pt-0">
                          <p className="text-xs text-[var(--ink-subtle)]">
                            {item.venueName}
                            {item.venueAddress ? `, ${item.venueAddress}` : ""} · {index + 1}
                          </p>
                          <p className="mt-1 text-sm leading-relaxed text-[var(--ink-muted)]">
                            {item.reviewText}
                          </p>
                          <a
                            href={item.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block text-xs text-[var(--ink-subtle)] underline"
                          >
                            проверить отзыв на карте
                          </a>

                          <form action={saveAnswerAction} className="mt-2 space-y-2">
                            <input type="hidden" name="token" value={token} />
                            <input type="hidden" name="itemId" value={item.id} />
                            <textarea
                              name="answer"
                              rows={4}
                              defaultValue={item.answer ?? ""}
                              disabled={!taskEditable || item.status === "accepted"}
                              placeholder="Текст ответа от имени заведения"
                              className="w-full rounded-[var(--round-sm)] border border-[var(--border-strong)] px-3 py-2 text-sm leading-relaxed outline-none focus:border-[var(--ink)] disabled:bg-[var(--surface-muted)]"
                            />
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                tone={
                                  item.status === "accepted"
                                    ? "success"
                                    : item.status === "revision"
                                      ? "danger"
                                      : "neutral"
                                }
                              >
                                {ITEM_STATUS_LABELS[item.status] ?? item.status}
                              </Badge>
                              {taskEditable && item.status !== "accepted" && (
                                <button
                                  type="submit"
                                  className="rounded-[var(--round-sm)] border border-[var(--border-strong)] px-3 py-1.5 text-xs hover:border-[var(--ink)]"
                                >
                                  Сохранить ответ
                                </button>
                              )}
                            </div>
                          </form>

                          {item.revisionNote && (
                            <p className="mt-2 rounded-[var(--round-sm)] border border-[var(--danger)] px-3 py-2 text-xs text-[var(--danger)]">
                              На доработку: {item.revisionNote}
                            </p>
                          )}
                        </li>
                      ))}
                    </ol>

                    {taskEditable && (
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <form action={submitTaskAction}>
                          <input type="hidden" name="token" value={token} />
                          <input type="hidden" name="taskId" value={task.id} />
                          <button
                            type="submit"
                            disabled={!allAnswered}
                            className="rounded-[var(--round-md)] bg-[var(--ink)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {allAnswered
                              ? "Отправить на проверку"
                              : `Заполните все ответы (${answered}/${items.length})`}
                          </button>
                        </form>

                        {canRelease && (
                          <form action={releaseTaskAction}>
                            <input type="hidden" name="token" value={token} />
                            <input type="hidden" name="taskId" value={task.id} />
                            <button
                              type="submit"
                              className="text-xs text-[var(--ink-subtle)] underline hover:text-[var(--ink)]"
                            >
                              Отказаться от задания
                            </button>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </PlatformShell>
  );
}
