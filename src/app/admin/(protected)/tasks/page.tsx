import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { Badge, Card, Empty } from "@/components/platform/ui";
import { db } from "@/db";
import { clients, taskItems, tasks, workers } from "@/db/schema";
import { ensureAdmin } from "@/lib/auth";
import { guard } from "@/lib/db-guard";
import { TASK_STATUS_LABELS, formatRub, plural } from "@/lib/platform";

export const metadata: Metadata = {
  title: "Задания",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminTasksPage() {
  await ensureAdmin();
  const list = await guard(
    () =>
      db
        .select({
          id: tasks.id,
          title: tasks.title,
          status: tasks.status,
          clientRate: tasks.clientRate,
          workerRate: tasks.workerRate,
          clientName: clients.name,
          workerName: workers.name,
        })
        .from(tasks)
        .innerJoin(clients, eq(clients.id, tasks.clientId))
        .leftJoin(workers, eq(workers.id, tasks.workerId))
        .orderBy(desc(tasks.createdAt)),
    []
  );

  const counts = await guard(
    () =>
      db
        .select({
          taskId: taskItems.taskId,
          total: sql<number>`count(*)::int`,
          accepted: sql<number>`count(*) filter (where ${taskItems.status} = 'accepted')::int`,
          submitted: sql<number>`count(*) filter (where ${taskItems.status} = 'submitted')::int`,
        })
        .from(taskItems)
        .groupBy(taskItems.taskId),
    []
  );

  const byTask = new Map(counts.map((c) => [c.taskId, c]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-medium text-[var(--ink)]">Задания</h1>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Пачки работы по заказчикам. Внутри — по одной позиции на отзыв.
        </p>
      </div>

      <Card>
        {list.length === 0 ? (
          <Empty>
            Заданий пока нет. Откройте заказчика, выберите отзывы и создайте первое задание.
          </Empty>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {list.map((task) => {
              const c = byTask.get(task.id);
              const accepted = c?.accepted ?? 0;
              const submitted = c?.submitted ?? 0;
              const total = c?.total ?? 0;

              return (
                <li key={task.id} className="py-3 first:pt-0 last:pb-0">
                  <Link
                    href={`/admin/tasks/${task.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg px-1 py-1 hover:bg-[var(--surface-muted)]"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--ink)]">{task.title}</p>
                      <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                        {task.clientName}
                        {task.workerName ? ` · ${task.workerName}` : " · исполнитель не назначен"}
                        {" · "}
                        {accepted}/{total}{" "}
                        {plural(total, "позиция", "позиции", "позиций")}
                        {submitted > 0 ? ` · ${submitted} на проверке` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[var(--ink-subtle)]">
                        {formatRub(task.clientRate)} / {formatRub(task.workerRate)}
                      </span>
                      <Badge
                        tone={
                          task.status === "accepted"
                            ? "success"
                            : task.status === "open"
                              ? "accent"
                              : "neutral"
                        }
                      >
                        {TASK_STATUS_LABELS[task.status] ?? task.status}
                      </Badge>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
