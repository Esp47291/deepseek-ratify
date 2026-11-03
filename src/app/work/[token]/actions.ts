"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { taskItems, tasks, workers } from "@/db/schema";

async function workerByToken(token: string) {
  if (!token) return null;
  const [worker] = await db.select().from(workers).where(eq(workers.token, token));
  return worker ?? null;
}

/** Взять свободное задание. Только если оно свободно и исполнитель не заблокирован. */
export async function takeTaskAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const taskId = Number(formData.get("taskId") ?? 0);

  const worker = await workerByToken(token);
  if (!worker || worker.blockedAt || !taskId) return;

  await db
    .update(tasks)
    .set({ workerId: worker.id, status: "taken", takenAt: new Date() })
    .where(and(eq(tasks.id, taskId), eq(tasks.status, "open"), isNull(tasks.workerId)));

  revalidatePath(`/work/${token}`);
}

/**
 * Сохранить ответ на одну позицию.
 *
 * Принятую позицию менять нельзя: иначе исполнитель может переписать или
 * обнулить ответ, который владелец уже принял, и сумма к оплате изменится
 * задним числом. То же — когда задание целиком принято.
 */
export async function saveAnswerAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const itemId = Number(formData.get("itemId") ?? 0);
  const answer = String(formData.get("answer") ?? "").trim();

  const worker = await workerByToken(token);
  if (!worker || worker.blockedAt || !itemId) return;

  const [row] = await db
    .select({
      id: taskItems.id,
      taskId: taskItems.taskId,
      status: taskItems.status,
      taskStatus: tasks.status,
    })
    .from(taskItems)
    .innerJoin(tasks, eq(tasks.id, taskItems.taskId))
    .where(and(eq(taskItems.id, itemId), eq(tasks.workerId, worker.id)));

  if (!row) return;

  const itemEditable =
    row.status === "pending" || row.status === "submitted" || row.status === "revision";
  const taskEditable =
    row.taskStatus !== "accepted" && row.taskStatus !== "submitted";

  if (!itemEditable || !taskEditable) return;

  await db
    .update(taskItems)
    .set({
      answer: answer || null,
      status: answer ? "submitted" : "pending",
      submittedAt: answer ? new Date() : null,
      revisionNote: null,
    })
    .where(
      and(
        eq(taskItems.id, itemId),
        // Повторная проверка на уровне запроса: статус мог измениться между
        // чтением и записью.
        ne(taskItems.status, "accepted")
      )
    );

  revalidatePath(`/work/${token}`);
}

/** Отправить задание целиком на проверку: нужны ответы на все позиции. */
export async function submitTaskAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const taskId = Number(formData.get("taskId") ?? 0);

  const worker = await workerByToken(token);
  if (!worker || worker.blockedAt || !taskId) return;

  const [task] = await db
    .select({ id: tasks.id, status: tasks.status })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.workerId, worker.id)));

  if (!task) return;
  if (task.status === "accepted" || task.status === "submitted") return;

  const items = await db
    .select({ id: taskItems.id, answer: taskItems.answer })
    .from(taskItems)
    .where(eq(taskItems.taskId, taskId));

  const allAnswered = items.length > 0 && items.every((i) => Boolean(i.answer?.trim()));
  if (!allAnswered) return;

  await db
    .update(tasks)
    .set({ status: "submitted", submittedAt: new Date() })
    .where(and(eq(tasks.id, taskId), ne(tasks.status, "accepted")));

  revalidatePath(`/work/${token}`);
}

/** Отказаться от задания: возвращает его в свободные и освобождает исполнителя. */
export async function releaseTaskAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const taskId = Number(formData.get("taskId") ?? 0);

  const worker = await workerByToken(token);
  if (!worker || !taskId) return;

  const [task] = await db
    .select({ status: tasks.status })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.workerId, worker.id)));

  // Принятое или отправленное на проверку отдавать нельзя — это уже работа.
  if (!task || task.status === "accepted" || task.status === "submitted") return;

  await db
    .update(taskItems)
    .set({ answer: null, status: "pending", submittedAt: null, revisionNote: null })
    .where(
      and(eq(taskItems.taskId, taskId), sql`${taskItems.status} <> 'accepted'`)
    );

  await db
    .update(tasks)
    .set({ workerId: null, status: "open", takenAt: null })
    .where(and(eq(tasks.id, taskId), eq(tasks.workerId, worker.id)));

  revalidatePath(`/work/${token}`);
}
