import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { rateTaskAction, reviewItemAction } from "@/app/admin/(protected)/actions";
import { Badge, Card, Empty, Stat } from "@/components/platform/ui";
import { db } from "@/db";
import { clients, ratings, reviews, taskItems, tasks, venues, workers } from "@/db/schema";
import { ensureAdmin } from "@/lib/auth";
import { guard } from "@/lib/db-guard";
import {
  ITEM_STATUS_LABELS,
  TASK_STATUS_LABELS,
  computeTaskMoney,
  formatDate,
  formatRub,
  platformLabel,
} from "@/lib/platform";

export const metadata: Metadata = {
  title: "Задание",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await ensureAdmin();
  const { id } = await params;
  const taskId = Number(id);

  const task = await guard(async () => {
    const [row] = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        instructions: tasks.instructions,
        platform: tasks.platform,
        clientRate: tasks.clientRate,
        workerRate: tasks.workerRate,
        status: tasks.status,
        dueAt: tasks.dueAt,
        createdAt: tasks.createdAt,
        clientId: clients.id,
        clientName: clients.name,
        clientToken: clients.token,
        workerId: workers.id,
        workerName: workers.name,
      })
      .from(tasks)
      .innerJoin(clients, eq(clients.id, tasks.clientId))
      .leftJoin(workers, eq(workers.id, tasks.workerId))
      .where(eq(tasks.id, taskId));
    return row ?? null;
  }, null);

  if (!task) notFound();

  const items = await guard(
    () =>
      db
        .select({
          id: taskItems.id,
          answer: taskItems.answer,
          status: taskItems.status,
          revisionNote: taskItems.revisionNote,
          reviewId: reviews.id,
          reviewText: reviews.text,
          sourceUrl: reviews.sourceUrl,
          venueId: venues.id,
          venueName: venues.name,
          venueAddress: venues.address,
          venueMapUrl: venues.mapUrl,
        })
        .from(taskItems)
        .innerJoin(reviews, eq(reviews.id, taskItems.reviewId))
        .innerJoin(venues, eq(venues.id, reviews.venueId))
        .where(eq(taskItems.taskId, taskId))
        .orderBy(asc(venues.id), asc(taskItems.id)),
    []
  );

  const taskRatings = await guard(
    () =>
      db
        .select()
        .from(ratings)
        .where(eq(ratings.taskId, taskId))
        .orderBy(desc(ratings.createdAt)),
    []
  );

  const money = computeTaskMoney(
    task.clientRate,
    task.workerRate,
    items.map((i) => i.status)
  );

  // Группируем по филиалам — ровно так заказчик видит отчёт.
  const grouped = new Map<
    number,
    { name: string; address: string | null; mapUrl: string | null; items: typeof items }
  >();
  for (const item of items) {
    const bucket = grouped.get(item.venueId) ?? {
      name: item.venueName,
      address: item.venueAddress,
      mapUrl: item.venueMapUrl,
      items: [],
    };
    bucket.items.push(item);
    grouped.set(item.venueId, bucket);
  }

  const alreadyRatedWorker = taskRatings.some((r) => r.subjectType === "worker");
  const alreadyRatedClient = taskRatings.some((r) => r.subjectType === "client");

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/tasks" className="text-xs text-[var(--ink-subtle)] hover:underline">
          ← Все задания
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-medium text-[var(--ink)]">{task.title}</h1>
          <Badge tone={task.status === "accepted" ? "success" : "accent"}>
            {TASK_STATUS_LABELS[task.status] ?? task.status}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          <Link href={`/admin/clients/${task.clientId}`} className="underline">
            {task.clientName}
          </Link>{" "}
          · {platformLabel(task.platform)} · срок {formatDate(task.dueAt)} ·{" "}
          {task.workerName ? `исполнитель: ${task.workerName}` : "исполнитель не назначен"}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Позиций" value={items.length} />
        <Stat label="Принято" value={`${money.acceptedCount} / ${items.length}`} />
        <Stat label="Заказчику" value={formatRub(money.clientTotal)} hint={`${formatRub(task.clientRate)} за позицию`} />
        <Stat
          label="Маржа"
          value={formatRub(money.margin)}
          hint={`исполнителю ${formatRub(money.workerTotal)}`}
        />
      </div>

      {task.instructions && (
        <Card title="Инструкция исполнителю">
          <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--ink-muted)]">
            {task.instructions}
          </p>
        </Card>
      )}

      <div className="space-y-4">
        {grouped.size === 0 && <Empty>В задании нет позиций.</Empty>}

        {Array.from(grouped.entries()).map(([venueId, group]) => (
          <Card key={venueId} title={group.name}>
            <p className="mb-4 text-xs text-[var(--ink-muted)]">
              {group.address || "адрес не указан"}
              {group.mapUrl && (
                <>
                  {" · "}
                  <a href={group.mapUrl} target="_blank" rel="noopener noreferrer" className="underline">
                    карточка
                  </a>
                </>
              )}
            </p>

            <ol className="space-y-4">
              {group.items.map((item, index) => (
                <li key={item.id} className="rounded-[var(--round-md)] border border-[var(--border)] p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium text-[var(--ink-subtle)]">
                      {index + 1}. отзыв
                    </span>
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
                  </div>

                  <p className="text-sm leading-relaxed text-[var(--ink-muted)]">{item.reviewText}</p>
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-xs text-[var(--ink-subtle)] underline"
                  >
                    источник отзыва
                  </a>

                  {item.answer ? (
                    <div className="mt-3 rounded-[var(--round-sm)] bg-[var(--surface-muted)] p-3">
                      <p className="text-xs text-[var(--ink-subtle)]">Ответ исполнителя</p>
                      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-[var(--ink)]">
                        {item.answer}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-[var(--ink-subtle)]">Ответа пока нет</p>
                  )}

                  {item.revisionNote && (
                    <p className="mt-2 rounded-[var(--round-sm)] border border-[var(--danger)] px-3 py-2 text-xs text-[var(--danger)]">
                      Возврат: {item.revisionNote}
                    </p>
                  )}

                  {(item.status === "submitted" || item.status === "revision") && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <form action={reviewItemAction}>
                        <input type="hidden" name="itemId" value={item.id} />
                        <input type="hidden" name="taskId" value={task.id} />
                        <input type="hidden" name="decision" value="accept" />
                        <button
                          type="submit"
                          className="rounded-[var(--round-sm)] bg-[var(--ink)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                        >
                          Принять
                        </button>
                      </form>

                      <form action={reviewItemAction} className="flex flex-1 items-center gap-2">
                        <input type="hidden" name="itemId" value={item.id} />
                        <input type="hidden" name="taskId" value={task.id} />
                        <input type="hidden" name="decision" value="revise" />
                        <input
                          name="revisionNote"
                          placeholder="Что исправить"
                          className="min-w-0 flex-1 rounded-[var(--round-sm)] border border-[var(--border-strong)] px-2 py-1.5 text-xs outline-none focus:border-[var(--ink)]"
                        />
                        <button
                          type="submit"
                          className="rounded-[var(--round-sm)] border border-[var(--danger)] px-3 py-1.5 text-xs text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white"
                        >
                          На доработку
                        </button>
                      </form>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </Card>
        ))}
      </div>

      <Card title="Оценки">
        {task.status !== "accepted" ? (
          <p className="text-sm text-[var(--ink-muted)]">
            Оценки ставятся после того, как задание принято целиком.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium text-[var(--ink)]">
                Исполнитель: {task.workerName ?? "—"}
              </p>
              {alreadyRatedWorker ? (
                <p className="text-xs text-[var(--ink-subtle)]">Оценка уже поставлена</p>
              ) : task.workerId ? (
                <form action={rateTaskAction} className="space-y-2">
                  <input type="hidden" name="taskId" value={task.id} />
                  <input type="hidden" name="subjectType" value="worker" />
                  <input type="hidden" name="subjectId" value={task.workerId} />
                  <select name="score" className="w-full rounded-[var(--round-sm)] border border-[var(--border-strong)] px-2 py-1.5 text-sm">
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} ★
                      </option>
                    ))}
                  </select>
                  <input
                    name="comment"
                    placeholder="Комментарий (виден исполнителю)"
                    className="w-full rounded-[var(--round-sm)] border border-[var(--border-strong)] px-2 py-1.5 text-sm"
                  />
                  <button type="submit" className="rounded-[var(--round-sm)] bg-[var(--ink)] px-3 py-1.5 text-xs text-white">
                    Оценить
                  </button>
                </form>
              ) : (
                <p className="text-xs text-[var(--ink-subtle)]">Исполнитель не назначен</p>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-[var(--ink)]">
                Заказчик: {task.clientName}
              </p>
              {alreadyRatedClient ? (
                <p className="text-xs text-[var(--ink-subtle)]">Оценка уже поставлена</p>
              ) : (
                <form action={rateTaskAction} className="space-y-2">
                  <input type="hidden" name="taskId" value={task.id} />
                  <input type="hidden" name="subjectType" value="client" />
                  <input type="hidden" name="subjectId" value={task.clientId} />
                  <select name="score" className="w-full rounded-[var(--round-sm)] border border-[var(--border-strong)] px-2 py-1.5 text-sm">
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} ★
                      </option>
                    ))}
                  </select>
                  <input
                    name="comment"
                    placeholder="Комментарий (виден заказчику)"
                    className="w-full rounded-[var(--round-sm)] border border-[var(--border-strong)] px-2 py-1.5 text-sm"
                  />
                  <input
                    name="internalNote"
                    placeholder="Внутренняя заметка (никто не видит)"
                    className="w-full rounded-[var(--round-sm)] border border-[var(--border-strong)] px-2 py-1.5 text-sm"
                  />
                  <button type="submit" className="rounded-[var(--round-sm)] bg-[var(--ink)] px-3 py-1.5 text-xs text-white">
                    Оценить
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </Card>

      <Card title="Ссылки">
        <div className="space-y-2 text-sm">
          <p className="text-[var(--ink-muted)]">
            Кабинет заказчика:{" "}
            <a href={`/r/${task.clientToken}`} className="underline">
              открыть
            </a>
          </p>
          <p className="text-[var(--ink-muted)]">
            Исполнитель берёт задание по ссылке из своего кабинета.
          </p>
        </div>
      </Card>
    </div>
  );
}
