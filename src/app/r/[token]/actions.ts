"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, tasks } from "@/db/schema";
import { postMessage } from "@/lib/chat";

/**
 * Сообщение заказчика в чат своего задания.
 *
 * Доступ — по токену из ссылки. Проверяем, что задание принадлежит
 * именно этому заказчику: иначе по чужой ссылке можно было бы писать
 * в чужой чат.
 */
export async function postClientMessageAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const taskId = Number(formData.get("taskId") ?? 0);
  const body = String(formData.get("body") ?? "").trim();

  if (!token || !taskId || !body) return;

  const [client] = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(eq(clients.token, token));

  if (!client) return;

  const [task] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.clientId, client.id)));

  if (!task) return;

  await postMessage({ taskId, role: "client", name: client.name, body });

  revalidatePath(`/r/${token}`);
}
