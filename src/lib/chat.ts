import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { messages } from "@/db/schema";

export type ChatRole = "owner" | "worker" | "client";

export interface ChatMessage {
  id: number;
  authorRole: string;
  authorName: string;
  body: string;
  createdAt: Date;
}

export const CHAT_ROLE_LABELS: Record<string, string> = {
  owner: "Владелец",
  worker: "Исполнитель",
  client: "Заказчик",
};

/** Все сообщения задания, старые сверху. */
export async function listMessages(taskId: number): Promise<ChatMessage[]> {
  return db
    .select({
      id: messages.id,
      authorRole: messages.authorRole,
      authorName: messages.authorName,
      body: messages.body,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.taskId, taskId))
    .orderBy(asc(messages.createdAt), asc(messages.id));
}

/**
 * Записать сообщение в чат задания.
 *
 * Право писать проверяет вызывающее действие: здесь только запись.
 * История не редактируется — это гарантирует триггер в базе.
 */
export async function postMessage(input: {
  taskId: number;
  role: ChatRole;
  name: string;
  body: string;
}): Promise<void> {
  const body = input.body.trim().slice(0, 4000);
  if (!body) return;

  await db.insert(messages).values({
    taskId: input.taskId,
    authorRole: input.role,
    authorName: input.name.slice(0, 200),
    body,
  });
}

/** Время сообщения: сегодня — только часы, иначе с датой. */
export function formatMessageTime(value: Date): string {
  const now = new Date();
  const sameDay =
    value.getDate() === now.getDate() &&
    value.getMonth() === now.getMonth() &&
    value.getFullYear() === now.getFullYear();

  const time = value.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (sameDay) return time;

  const date = value.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
  });
  return `${date} ${time}`;
}
