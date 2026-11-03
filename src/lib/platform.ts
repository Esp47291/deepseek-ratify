/** Площадки, на которых мы работаем с отзывами. */
export const PLATFORMS = [
  { value: "yandex", label: "Яндекс.Карты" },
  { value: "2gis", label: "2ГИС" },
  { value: "google", label: "Google Карты" },
  { value: "other", label: "Другая площадка" },
] as const;

export type Platform = (typeof PLATFORMS)[number]["value"];

export function platformLabel(value: string): string {
  return PLATFORMS.find((p) => p.value === value)?.label ?? value;
}

/** Статусы задания. */
export const TASK_STATUS_LABELS: Record<string, string> = {
  draft: "Черновик",
  open: "Свободно",
  taken: "В работе",
  submitted: "На проверке",
  revision: "На доработке",
  accepted: "Принято",
};

/** Статусы позиции. */
export const ITEM_STATUS_LABELS: Record<string, string> = {
  pending: "Ждёт ответа",
  submitted: "Отправлено",
  revision: "На доработке",
  accepted: "Принято",
};

export type ItemStatus = keyof typeof ITEM_STATUS_LABELS;
export type TaskStatus = keyof typeof TASK_STATUS_LABELS;

/** Деньги по заданию. Считаются из принятых позиций, а не хранятся числом. */
export interface TaskMoney {
  acceptedCount: number;
  totalCount: number;
  clientTotal: number;
  workerTotal: number;
  margin: number;
  progressPct: number;
}

export function computeTaskMoney(
  clientRate: number,
  workerRate: number,
  statuses: string[]
): TaskMoney {
  const totalCount = statuses.length;
  const acceptedCount = statuses.filter((s) => s === "accepted").length;
  const clientTotal = clientRate * acceptedCount;
  const workerTotal = workerRate * acceptedCount;

  return {
    acceptedCount,
    totalCount,
    clientTotal,
    workerTotal,
    margin: clientTotal - workerTotal,
    progressPct:
      totalCount === 0 ? 0 : Math.round((acceptedCount / totalCount) * 100),
  };
}

/** Сводка рейтинга стороны — тоже из событий, без хранимой цифры. */
export interface RatingSummary {
  /** Средняя оценка владельца, 1–5, или null если оценок ещё нет */
  score: number | null;
  ratingsCount: number;
  /** Сколько позиций принято всего */
  acceptedItems: number;
  /** Доля позиций, принятых без возврата на доработку, % */
  firstPassPct: number | null;
  /** Сколько заданий доведено до принятия */
  completedTasks: number;
}

/** Позиция глазами рейтинга: статус и сколько было возвратов. */
export interface RatedItem {
  status: string;
  revisionCount: number;
}

export function summarizeRatings(
  scores: number[],
  items: RatedItem[],
  completedTasks: number
): RatingSummary {
  const acceptedItems = items.filter((i) => i.status === "accepted").length;

  // «С первого раза» — только среди дошедших до результата позиций,
  // и только те, которые ни разу не возвращали на доработку.
  const finished = items.filter(
    (i) => i.status === "accepted" || i.status === "submitted" || i.status === "revision"
  );
  const acceptedFirstTry = finished.filter(
    (i) => i.status === "accepted" && i.revisionCount === 0
  ).length;

  const score =
    scores.length === 0
      ? null
      : Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 10) / 10;

  return {
    score,
    ratingsCount: scores.length,
    acceptedItems,
    firstPassPct:
      finished.length === 0
        ? null
        : Math.round((acceptedFirstTry / finished.length) * 100),
    completedTasks,
  };
}

/** Формат рейтинга для показа: "4.8 · 87 позиций · 96% с первого раза". */
export function formatRating(summary: RatingSummary): string {
  const parts: string[] = [];
  parts.push(summary.score === null ? "без оценки" : summary.score.toFixed(1));

  if (summary.acceptedItems > 0) {
    parts.push(`${summary.acceptedItems} ${plural(summary.acceptedItems, "позиция", "позиции", "позиций")}`);
  }
  if (summary.firstPassPct !== null) {
    parts.push(`${summary.firstPassPct}% с первого раза`);
  }
  return parts.join(" · ");
}

/** Русское склонение по числу. */
export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function formatRub(value: number): string {
  return `${value.toLocaleString("ru-RU")} ₽`;
}

export function formatDate(value: Date | null | undefined): string {
  if (!value) return "—";
  return value.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
