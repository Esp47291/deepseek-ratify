import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** Заявки с сайта-витрины. Не связаны с платформой. */
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  /** Ссылка на сайт или карточку компании */
  companyUrl: text("company_url"),
  /** Название выбранной услуги */
  service: text("service"),
  /** Ориентировочный бюджет (свободный текст) */
  budget: text("budget"),
  message: text("message"),
  type: text("type").default("order"), // 'order' | 'contact' | 'calculator' | 'exit_intent'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Заказчик — сеть заведений (например, сеть клиник).
 * `token` — постоянная ссылка в кабинет без пароля.
 */
export const clients = pgTable(
  "clients",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    contactName: text("contact_name"),
    contactPhone: text("contact_phone"),
    /** Секрет для ссылки в кабинет заказчика */
    token: text("token").notNull(),
    note: text("note"),
    archivedAt: timestamp("archived_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("clients_token_uq").on(table.token)],
);

/**
 * Филиал заказчика: адрес и ссылка на карточку на картах.
 * Площадка важна, потому что цена и правила ответа от неё зависят.
 */
export const venues = pgTable(
  "venues",
  {
    id: serial("id").primaryKey(),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    address: text("address"),
    /** Площадка: yandex | 2gis | google | other */
    platform: text("platform").notNull().default("yandex"),
    mapUrl: text("map_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("venues_client_idx").on(table.clientId)],
);

/**
 * Реальный отзыв, который владелец внёс руками.
 * `sourceUrl` обязателен: без ссылки на источник позицию нельзя закрыть.
 */
export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    venueId: integer("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    sourceUrl: text("source_url").notNull(),
    /** Оценка автора отзыва, 1–5, если известна */
    rating: integer("rating"),
    reviewedAt: timestamp("reviewed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("reviews_venue_idx").on(table.venueId)],
);

/**
 * Исполнитель-фрилансер.
 * `token` — постоянная ссылка в его кабинет без пароля.
 */
export const workers = pgTable(
  "workers",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    telegram: text("telegram"),
    token: text("token").notNull(),
    /** Доступ к новым заданиям закрыт владельцем вручную */
    blockedAt: timestamp("blocked_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("workers_token_uq").on(table.token)],
);

/**
 * Задание — пачка работы по одному заказчику.
 *
 * Статусы: draft → open → taken → submitted → accepted.
 * `revision` — отправлено на доработку, возвращается исполнителю.
 *
 * Деньги: ставки фиксируются в момент создания задания, чтобы правка
 * тарифа не переписывала историю. Считаем в рублях за одну позицию.
 */
export const tasks = pgTable(
  "tasks",
  {
    id: serial("id").primaryKey(),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    workerId: integer("worker_id").references(() => workers.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    /** Инструкция и правила для исполнителя */
    instructions: text("instructions"),
    platform: text("platform").notNull().default("yandex"),
    /** Сколько платит заказчик за одну позицию, ₽ */
    clientRate: integer("client_rate").notNull().default(0),
    /** Сколько получает исполнитель за одну позицию, ₽ */
    workerRate: integer("worker_rate").notNull().default(0),
    status: text("status").notNull().default("draft"),
    dueAt: timestamp("due_at"),
    takenAt: timestamp("taken_at"),
    submittedAt: timestamp("submitted_at"),
    acceptedAt: timestamp("accepted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("tasks_client_idx").on(table.clientId),
    index("tasks_worker_idx").on(table.workerId),
    index("tasks_status_idx").on(table.status),
  ],
);

/**
 * Позиция задания — один отзыв, на который нужен один ответ.
 *
 * Статусы: pending → submitted → accepted | revision.
 * `answer` заполняет исполнитель, `revisionNote` — владелец при возврате.
 */
export const taskItems = pgTable(
  "task_items",
  {
    id: serial("id").primaryKey(),
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    reviewId: integer("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "restrict" }),
    answer: text("answer"),
    status: text("status").notNull().default("pending"),
    revisionNote: text("revision_note"),
    /**
     * Сколько раз позицию вернули на доработку.
     * Нужен, чтобы считать долю принятых С ПЕРВОГО РАЗА честно:
     * позиция с возвратом не считается первой попыткой.
     */
    revisionCount: integer("revision_count").notNull().default(0),
    submittedAt: timestamp("submitted_at"),
    acceptedAt: timestamp("accepted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("task_items_task_idx").on(table.taskId),
    uniqueIndex("task_items_task_review_uq").on(table.taskId, table.reviewId),
  ],
);

/**
 * Оценки — только добавляются, не редактируются и не удаляются.
 *
 * subjectType: 'worker' | 'client'.
 * `score` 1–5, `comment` виден стороне, `internalNote` — только владельцу.
 * Автор всегда владелец.
 */
export const ratings = pgTable(
  "ratings",
  {
    id: serial("id").primaryKey(),
    subjectType: text("subject_type").notNull(),
    subjectId: integer("subject_id").notNull(),
    taskId: integer("task_id").references(() => tasks.id, {
      onDelete: "set null",
    }),
    score: integer("score").notNull(),
    comment: text("comment"),
    internalNote: text("internal_note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("ratings_subject_idx").on(table.subjectType, table.subjectId),
    // Одна оценка на задание от каждой стороны. Повторная вставка не пройдёт.
    uniqueIndex("ratings_task_subject_uq").on(
      table.taskId,
      table.subjectType,
      table.subjectId
    ),
  ],
);
