import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq, inArray } from "drizzle-orm";
import PlatformShell from "@/components/platform/PlatformShell";
import PrintButton from "@/components/platform/PrintButton";
import { Empty } from "@/components/platform/ui";
import { db } from "@/db";
import { clients, reviews, taskItems, tasks, venues } from "@/db/schema";
import { guard } from "@/lib/db-guard";
import { formatDate } from "@/lib/platform";

export const metadata: Metadata = {
  title: "Отчёт",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Отчёт заказчику в том формате, в котором он привык его получать:
 * филиал → ссылка на карточку → нумерованные отзывы с ответами.
 */
export default async function ClientReportPage({
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
        .select({
          id: tasks.id,
          title: tasks.title,
          status: tasks.status,
        })
        .from(tasks)
        .where(eq(tasks.clientId, client.id))
        .orderBy(asc(tasks.id)),
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
              status: taskItems.status,
              answer: taskItems.answer,
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
            .where(inArray(taskItems.taskId, taskIds))
            .orderBy(asc(venues.id), asc(taskItems.id)),
    []
  );

  const accepted = items.filter((i) => i.status === "accepted" && i.answer);
  const inProgress = items.length - accepted.length;

  const grouped = new Map<
    number,
    {
      name: string;
      address: string | null;
      mapUrl: string | null;
      items: typeof accepted;
    }
  >();

  for (const item of accepted) {
    const bucket = grouped.get(item.venueId) ?? {
      name: item.venueName,
      address: item.venueAddress,
      mapUrl: item.venueMapUrl,
      items: [],
    };
    bucket.items.push(item);
    grouped.set(item.venueId, bucket);
  }

  return (
    <PlatformShell viewer={client.name} role="отчёт">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
          <div>
            <Link href={`/r/${token}`} className="text-xs text-[var(--ink-subtle)] hover:underline">
              ← В кабинет
            </Link>
            <h1 className="mt-1 text-xl font-medium text-[var(--ink)]">Отчёт по отзывам</h1>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              {accepted.length} ответов готово
              {inProgress > 0 ? `, ${inProgress} ещё в работе` : ""}
            </p>
          </div>
          <PrintButton />
        </div>

        <article className="space-y-8 rounded-[var(--round-lg)] border border-[var(--border)] bg-white p-6 print:border-0 print:p-0">
          <header className="border-b border-[var(--border)] pb-4">
            <p className="mono text-sm text-[var(--ink-subtle)]">ratify</p>
            <h2 className="mt-1 text-lg font-medium text-[var(--ink)]">{client.name}</h2>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">
              Ответы на отзывы · сформировано {formatDate(new Date())}
            </p>
          </header>

          {grouped.size === 0 ? (
            <Empty>Пока нет принятых ответов — отчёт появится, как только работа будет принята.</Empty>
          ) : (
            Array.from(grouped.entries()).map(([venueId, group], venueIndex) => (
              <section key={venueId} className="break-inside-avoid">
                <h3 className="text-sm font-medium text-[var(--ink)]">
                  Филиал {venueIndex + 1}: {group.name}
                  {group.address ? ` (${group.address})` : ""}
                </h3>
                {group.mapUrl && (
                  <p className="mt-1 text-xs text-[var(--ink-muted)]">
                    Ссылка:{" "}
                    <a href={group.mapUrl} className="underline" target="_blank" rel="noopener noreferrer">
                      {group.mapUrl}
                    </a>
                  </p>
                )}

                <ol className="mt-4 space-y-5">
                  {group.items.map((item, index) => (
                    <li key={item.id} className="break-inside-avoid">
                      <p className="text-sm leading-relaxed text-[var(--ink-muted)]">
                        <span className="font-medium text-[var(--ink)]">{index + 1}. </span>
                        {item.reviewText}
                      </p>
                      <div className="mt-2 border-l-2 border-[var(--border-strong)] pl-3">
                        <p className="text-xs text-[var(--ink-subtle)]">Ответ:</p>
                        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-[var(--ink)]">
                          {item.answer}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ))
          )}
        </article>
      </div>
    </PlatformShell>
  );
}
