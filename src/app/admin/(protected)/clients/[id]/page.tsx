import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";
import {
  createReviewAction,
  createTaskAction,
  createVenueAction,
} from "@/app/admin/(protected)/actions";
import { Badge, Card, Empty } from "@/components/platform/ui";
import { db } from "@/db";
import { clients, reviews, tasks, venues } from "@/db/schema";
import { ensureAdmin } from "@/lib/auth";
import { guard } from "@/lib/db-guard";
import { PLATFORMS, TASK_STATUS_LABELS, platformLabel } from "@/lib/platform";

export const metadata: Metadata = {
  title: "Заказчик",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const inputClass =
  "w-full rounded-[var(--round-md)] border border-[var(--border-strong)] px-3 py-2 text-sm outline-none focus:border-[var(--ink)]";

export default async function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await ensureAdmin();
  const { id } = await params;
  const clientId = Number(id);

  const client = await guard(async () => {
    const [row] = await db.select().from(clients).where(eq(clients.id, clientId));
    return row ?? null;
  }, null);

  if (!client) notFound();

  const venueList = await guard(
    () =>
      db
        .select()
        .from(venues)
        .where(eq(venues.clientId, clientId))
        .orderBy(venues.id),
    []
  );

  const venueIds = venueList.map((v) => v.id);

  const reviewList = await guard(
    () =>
      venueIds.length === 0
        ? Promise.resolve([])
        : db
            .select()
            .from(reviews)
            .where(inArray(reviews.venueId, venueIds))
            .orderBy(desc(reviews.createdAt)),
    []
  );

  const taskList = await guard(
    () =>
      db
        .select()
        .from(tasks)
        .where(eq(tasks.clientId, clientId))
        .orderBy(desc(tasks.createdAt)),
    []
  );

  const reviewsByVenue = new Map<number, typeof reviewList>();
  for (const review of reviewList) {
    const bucket = reviewsByVenue.get(review.venueId) ?? [];
    bucket.push(review);
    reviewsByVenue.set(review.venueId, bucket);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin" className="text-xs text-[var(--ink-subtle)] hover:underline">
            ← Все заказчики
          </Link>
          <h1 className="mt-1 text-xl font-medium text-[var(--ink)]">{client.name}</h1>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            {venueList.length} филиалов · {reviewList.length} отзывов в базе
          </p>
        </div>
        <a
          href={`/r/${client.token}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-[var(--round-md)] border border-[var(--border-strong)] px-3 py-2 text-sm text-[var(--ink-muted)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
        >
          Кабинет заказчика →
        </a>
      </div>

      <Card title="Филиалы">
        {venueList.length === 0 ? (
          <Empty>Добавьте первый филиал: название, адрес и ссылку на карточку на картах.</Empty>
        ) : (
          <ul className="mb-4 space-y-2">
            {venueList.map((venue) => (
              <li
                key={venue.id}
                className="rounded-[var(--round-md)] border border-[var(--border)] p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-[var(--ink)]">{venue.name}</p>
                    <p className="text-xs text-[var(--ink-muted)]">
                      {venue.address || "адрес не указан"} · {platformLabel(venue.platform)}
                    </p>
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

        <form action={createVenueAction} className="grid gap-3 border-t border-[var(--border)] pt-4 sm:grid-cols-2">
          <input type="hidden" name="clientId" value={client.id} />
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs text-[var(--ink-muted)]">Название *</span>
            <input name="name" required placeholder="Отделение МРТ, Краснодар" className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--ink-muted)]">Адрес</span>
            <input name="address" placeholder="Московская, 96" className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--ink-muted)]">Площадка</span>
            <select name="platform" className={inputClass} defaultValue="yandex">
              {PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs text-[var(--ink-muted)]">Ссылка на карточку</span>
            <input name="mapUrl" placeholder="https://yandex.ru/maps/-/..." className={inputClass} />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="rounded-[var(--round-md)] bg-[var(--ink)] px-4 py-2 text-sm font-medium text-white hover:opacity-90">
              Добавить филиал
            </button>
          </div>
        </form>
      </Card>

      <Card title="Отзывы">
        {venueList.length === 0 ? (
          <Empty>Сначала добавьте филиал — отзывы привязываются к филиалу.</Empty>
        ) : (
          <div className="space-y-5">
            {venueList.map((venue) => {
              const items = reviewsByVenue.get(venue.id) ?? [];
              return (
                <div key={venue.id}>
                  <h3 className="text-sm font-medium text-[var(--ink)]">{venue.name}</h3>
                  {items.length === 0 ? (
                    <p className="mt-1 text-xs text-[var(--ink-subtle)]">Отзывов пока нет</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {items.map((review) => (
                        <li
                          key={review.id}
                          className="rounded-[var(--round-md)] border border-[var(--border)] p-3"
                        >
                          <p className="line-clamp-3 text-sm leading-relaxed text-[var(--ink-muted)]">
                            {review.text}
                          </p>
                          <a
                            href={review.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-block text-xs text-[var(--ink-subtle)] underline"
                          >
                            источник
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}

                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-[var(--ink-muted)]">
                      Добавить отзыв в «{venue.name}»
                    </summary>
                    <form action={createReviewAction} className="mt-2 grid gap-2">
                      <input type="hidden" name="venueId" value={venue.id} />
                      <input type="hidden" name="clientId" value={client.id} />
                      <textarea
                        name="text"
                        required
                        rows={4}
                        placeholder="Текст отзыва — как написал реальный клиент"
                        className={inputClass}
                      />
                      <input
                        name="sourceUrl"
                        required
                        placeholder="Ссылка на отзыв (обязательно)"
                        className={inputClass}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <select name="rating" className={`${inputClass} max-w-[140px]`} defaultValue="">
                          <option value="">Без оценки</option>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>
                              {n} ★
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="rounded-[var(--round-md)] border border-[var(--border-strong)] px-3 py-2 text-sm hover:border-[var(--ink)]"
                        >
                          Сохранить отзыв
                        </button>
                      </div>
                    </form>
                  </details>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="Новое задание">
        {reviewList.length === 0 ? (
          <Empty>Чтобы создать задание, сначала внесите хотя бы один отзыв.</Empty>
        ) : (
          <form action={createTaskAction} className="space-y-4">
            <input type="hidden" name="clientId" value={client.id} />

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs text-[var(--ink-muted)]">Название задания *</span>
                <input
                  name="title"
                  required
                  placeholder="Ответы на отзывы, ноябрь"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-[var(--ink-muted)]">Площадка</span>
                <select name="platform" className={inputClass} defaultValue="yandex">
                  {PLATFORMS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-[var(--ink-muted)]">Срок</span>
                <input type="date" name="dueAt" className={inputClass} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-[var(--ink-muted)]">Заказчику за позицию, ₽</span>
                <input type="number" name="clientRate" min={0} defaultValue={0} className={inputClass} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-[var(--ink-muted)]">Исполнителю за позицию, ₽</span>
                <input type="number" name="workerRate" min={0} defaultValue={0} className={inputClass} />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs text-[var(--ink-muted)]">
                  Инструкция и правила для исполнителя
                </span>
                <textarea
                  name="instructions"
                  rows={4}
                  placeholder="Тон, чего не делать, как оформлять ответ, дедлайн"
                  className={inputClass}
                />
              </label>
            </div>

            <div>
              <p className="mb-2 text-xs text-[var(--ink-muted)]">
                Отзывы в задании ({reviewList.length} доступно)
              </p>
              <div className="max-h-72 space-y-3 overflow-y-auto rounded-[var(--round-md)] border border-[var(--border)] p-3">
                {venueList.map((venue) => {
                  const items = reviewsByVenue.get(venue.id) ?? [];
                  if (items.length === 0) return null;
                  return (
                    <div key={venue.id}>
                      <p className="mb-1 text-xs font-medium text-[var(--ink)]">{venue.name}</p>
                      <ul className="space-y-1">
                        {items.map((review) => (
                          <li key={review.id}>
                            <label className="flex cursor-pointer items-start gap-2 rounded p-1 hover:bg-[var(--surface-muted)]">
                              <input
                                type="checkbox"
                                name="reviewIds"
                                value={review.id}
                                className="mt-1"
                              />
                              <span className="line-clamp-2 text-xs leading-relaxed text-[var(--ink-muted)]">
                                {review.text}
                              </span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="rounded-[var(--round-md)] bg-[var(--ink)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Создать задание
            </button>
          </form>
        )}
      </Card>

      <Card title="Задания заказчика">
        {taskList.length === 0 ? (
          <Empty>Заданий пока нет.</Empty>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {taskList.map((task) => (
              <li key={task.id} className="py-3 first:pt-0 last:pb-0">
                <Link
                  href={`/admin/tasks/${task.id}`}
                  className="flex flex-wrap items-center justify-between gap-2"
                >
                  <span className="text-sm text-[var(--ink)]">{task.title}</span>
                  <Badge>{TASK_STATUS_LABELS[task.status] ?? task.status}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
