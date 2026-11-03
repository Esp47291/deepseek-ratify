import type { ReactNode } from "react";
import {
  CHAT_ROLE_LABELS,
  formatMessageTime,
  type ChatMessage,
} from "@/lib/chat";

interface ChatProps {
  messages: ChatMessage[];
  /** Кто смотрит: свои сообщения справа, чужие слева */
  viewer: "owner" | "worker" | "client";
  /** Кнопка/форма отправки, собранная страницей */
  composer: ReactNode;
  /** Пояснение, если писать пока нельзя */
  hint?: string;
}

/**
 * Лента сообщений по заданию.
 *
 * Одна и та же переписка видна владельцу, исполнителю и заказчику —
 * это замена разговору в Telegram, а не три разных чата.
 */
export default function Chat({ messages, viewer, composer, hint }: ChatProps) {
  if (messages.length === 0 && hint) {
    return (
      <div className="space-y-3">
        <p className="rounded-[var(--round-sm)] border border-dashed border-[var(--border-strong)] px-4 py-6 text-center text-xs text-[var(--ink-muted)]">
          {hint}
        </p>
        {composer}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="max-h-96 space-y-3 overflow-y-auto pr-1">
        {messages.map((message) => {
          const own = message.authorRole === viewer;
          const role = CHAT_ROLE_LABELS[message.authorRole] ?? message.authorRole;

          return (
            <li
              key={message.id}
              className={`flex flex-col ${own ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-[var(--round-md)] px-3 py-2 ${
                  own
                    ? "bg-[var(--ink)] text-white"
                    : "border border-[var(--border)] bg-white text-[var(--ink)]"
                }`}
              >
                {!own && (
                  <p className="mb-1 text-[11px] text-[var(--ink-subtle)]">
                    {role} · {message.authorName}
                  </p>
                )}
                <p className="whitespace-pre-line break-words text-sm leading-relaxed">
                  {message.body}
                </p>
              </div>
              <span className="mt-1 px-1 text-[10px] text-[var(--ink-subtle)]">
                {formatMessageTime(message.createdAt)}
              </span>
            </li>
          );
        })}
      </ul>

      {composer}
    </div>
  );
}
