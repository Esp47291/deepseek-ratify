"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  clients,
  ratings,
  reviews,
  taskItems,
  tasks,
  venues,
  workers,
} from "@/db/schema";
import { isAdmin, newToken } from "@/lib/auth";

/** Любое действие владельца требует активной сессии. */
async function assertAdmin(): Promise<void> {
  if (!(await isAdmin())) {
    throw new Error("Требуется вход в кабинет владельца");
  }
}

function text(formData: FormData, key: string, max = 2000): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function number(formData: FormData, key: string, fallback = 0): number {
  const value = Number(formData.get(key));
  return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : fallback;
}

// ---------- Заказчики ----------

export async function createClientAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const name = text(formData, "name", 200);
  if (!name) return;

  const [created] = await db
    .insert(clients)
    .values({
      name,
      contactName: text(formData, "contactName", 200),
      contactPhone: text(formData, "contactPhone", 40),
      note: text(formData, "note", 1000),
      token: newToken(),
    })
    .returning({ id: clients.id });

  revalidatePath("/admin");
  redirect(`/admin/clients/${created.id}`);
}

// ---------- Филиалы ----------

export async function createVenueAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const clientId = number(formData, "clientId");
  const name = text(formData, "name", 200);
  if (!clientId || !name) return;

  await db.insert(venues).values({
    clientId,
    name,
    address: text(formData, "address", 300),
    platform: text(formData, "platform", 20) ?? "yandex",
    mapUrl: text(formData, "mapUrl", 500),
  });

  revalidatePath(`/admin/clients/${clientId}`);
}

// ---------- Отзывы ----------

export async function createReviewAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const venueId = number(formData, "venueId");
  const reviewText = text(formData, "text", 4000);
  const sourceUrl = text(formData, "sourceUrl", 500);
  const clientId = number(formData, "clientId");

  // Ссылка обязательна: без неё работу нельзя проверить.
  if (!venueId || !reviewText || !sourceUrl) return;

  // Филиал должен принадлежать заказчику из формы, иначе отзыв уедет не туда.
  const [venue] = await db
    .select({ clientId: venues.clientId })
    .from(venues)
    .where(eq(venues.id, venueId));
  if (!venue || venue.clientId !== clientId) return;

  const rating = number(formData, "rating");
  await db.insert(reviews).values({
    venueId,
    text: reviewText,
    sourceUrl,
    rating: rating >= 1 && rating <= 5 ? rating : null,
  });

  revalidatePath(`/admin/clients/${clientId}`);
}

// ---------- Задания ----------

export async function createTaskAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const clientId = number(formData, "clientId");
  const title = text(formData, "title", 200);
  const reviewIds = formData
    .getAll("reviewIds")
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (!clientId || !title || reviewIds.length === 0) return;

  // В задание попадают только отзывы филиалов ЭТОГО заказчика.
  // Иначе чужой отзыв и ответ на него утекут в кабинет другого клиента.
  const owned = await db
    .select({ id: reviews.id })
    .from(reviews)
    .innerJoin(venues, eq(venues.id, reviews.venueId))
    .where(and(eq(venues.clientId, clientId), inArray(reviews.id, reviewIds)));

  const uniqueOwned = Array.from(new Set(owned.map((r) => r.id)));
  if (uniqueOwned.length !== new Set(reviewIds).size) return;

  const dueRaw = text(formData, "dueAt", 40);
  const dueAt = dueRaw ? new Date(dueRaw) : null;

  const [task] = await db
    .insert(tasks)
    .values({
      clientId,
      title,
      instructions: text(formData, "instructions", 4000),
      platform: text(formData, "platform", 20) ?? "yandex",
      clientRate: number(formData, "clientRate"),
      workerRate: number(formData, "workerRate"),
      status: "open",
      dueAt: dueAt && !Number.isNaN(dueAt.getTime()) ? dueAt : null,
    })
    .returning({ id: tasks.id });

  await db.insert(taskItems).values(
    uniqueOwned.map((reviewId) => ({
      taskId: task.id,
      reviewId,
      status: "pending",
    }))
  );

  revalidatePath("/admin/tasks");
  revalidatePath(`/admin/clients/${clientId}`);
  redirect(`/admin/tasks/${task.id}`);
}

/**
 * Проверка позиции: принять или вернуть на доработку.
 *
 * Принять можно только позицию, которая реально отправлена и имеет ответ.
 * Иначе можно «принять» пустую строку и выставить её в счёт.
 */
export async function reviewItemAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const itemId = number(formData, "itemId");
  const decision = text(formData, "decision", 20);
  if (!itemId) return;

  const [item] = await db
    .select({
      id: taskItems.id,
      taskId: taskItems.taskId,
      status: taskItems.status,
      answer: taskItems.answer,
    })
    .from(taskItems)
    .where(eq(taskItems.id, itemId));

  if (!item) return;

  // taskId берём из самой позиции, а не из формы: форму можно подделать.
  const taskId = item.taskId;
  const answerReady = Boolean(item.answer?.trim());
  const waitingDecision = item.status === "submitted" || item.status === "revision";

  if (!waitingDecision) return;

  if (decision === "accept") {
    if (!answerReady) return;
    await db
      .update(taskItems)
      .set({ status: "accepted", acceptedAt: new Date(), revisionNote: null })
      .where(eq(taskItems.id, itemId));
  } else if (decision === "revise") {
    await db
      .update(taskItems)
      .set({
        status: "revision",
        revisionNote: text(formData, "revisionNote", 1000),
        acceptedAt: null,
        revisionCount: sql`${taskItems.revisionCount} + 1`,
      })
      .where(eq(taskItems.id, itemId));
  } else {
    return;
  }

  await syncTaskStatus(taskId);
  revalidatePath(`/admin/tasks/${taskId}`);
}

/** Статус задания выводится из позиций, а не выставляется руками. */
async function syncTaskStatus(taskId: number): Promise<void> {
  const items = await db
    .select({ status: taskItems.status })
    .from(taskItems)
    .where(eq(taskItems.taskId, taskId));

  if (items.length === 0) return;

  const allAccepted = items.every((i) => i.status === "accepted");
  const anyRevision = items.some((i) => i.status === "revision");
  const anyPending = items.some((i) => i.status === "pending");

  const status = allAccepted
    ? "accepted"
    : anyRevision
      ? "revision"
      : anyPending
        ? "taken"
        : "submitted";

  await db
    .update(tasks)
    .set({
      status,
      acceptedAt: allAccepted ? new Date() : null,
    })
    .where(eq(tasks.id, taskId));
}

// ---------- Исполнители ----------

export async function createWorkerAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const name = text(formData, "name", 200);
  if (!name) return;

  await db.insert(workers).values({
    name,
    telegram: text(formData, "telegram", 100),
    token: newToken(),
  });

  revalidatePath("/admin/workers");
}

export async function toggleWorkerBlockAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const workerId = number(formData, "workerId");
  const blocked = text(formData, "blocked", 10) === "1";
  if (!workerId) return;

  await db
    .update(workers)
    .set({ blockedAt: blocked ? null : new Date() })
    .where(eq(workers.id, workerId));

  revalidatePath("/admin/workers");
}

// ---------- Оценки ----------

export async function rateTaskAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const taskId = number(formData, "taskId");
  const subjectType = text(formData, "subjectType", 20);
  const subjectId = number(formData, "subjectId");
  const score = number(formData, "score");

  if (!taskId || !subjectId || score < 1 || score > 5) return;
  if (subjectType !== "worker" && subjectType !== "client") return;

  // Сверяем оцениваемого с самим заданием: нельзя оценить чужого исполнителя.
  const [task] = await db
    .select({
      status: tasks.status,
      clientId: tasks.clientId,
      workerId: tasks.workerId,
    })
    .from(tasks)
    .where(eq(tasks.id, taskId));

  if (!task || task.status !== "accepted") return;

  const expectedId = subjectType === "worker" ? task.workerId : task.clientId;
  if (expectedId === null || expectedId !== subjectId) return;

  // Append-only: только вставка. Повторная оценка того же задания
  // отсекается уникальным индексом и не меняет средний балл.
  await db
    .insert(ratings)
    .values({
      subjectType,
      subjectId,
      taskId,
      score,
      comment: text(formData, "comment", 1000),
      internalNote: text(formData, "internalNote", 1000),
    })
    .onConflictDoNothing();

  revalidatePath(`/admin/tasks/${taskId}`);
}

/** Удаление задания — только пока работа не начата. */
export async function deleteTaskAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const taskId = number(formData, "taskId");
  if (!taskId) return;

  const [task] = await db
    .select({ status: tasks.status })
    .from(tasks)
    .where(eq(tasks.id, taskId));

  if (!task || (task.status !== "draft" && task.status !== "open")) return;

  await db
    .delete(tasks)
    .where(and(eq(tasks.id, taskId), inArray(tasks.status, ["draft", "open"])));
  revalidatePath("/admin/tasks");
  redirect("/admin/tasks");
}
