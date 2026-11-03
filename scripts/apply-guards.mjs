// Применяет гарантии, которые не выражаются схемой Drizzle.
//
// `drizzle-kit push` синхронизирует таблицы и индексы, но не создаёт
// триггеры. Без этого шага таблица ratings остаётся обычной: оценку можно
// изменить или удалить SQL-запросом, и рейтинг перестаёт что-либо значить.
//
// Скрипт идемпотентен: его можно запускать на любой базе сколько угодно раз.
import "dotenv/config";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is required to apply database guards");
  process.exit(1);
}

const SQL = `
-- Оценки только добавляются: изменить или удалить их нельзя.
CREATE OR REPLACE FUNCTION ratings_forbid_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ratings is append-only: update and delete are forbidden';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ratings_no_mutation ON ratings;
CREATE TRIGGER ratings_no_mutation
  BEFORE UPDATE OR DELETE ON ratings
  FOR EACH ROW EXECUTE FUNCTION ratings_forbid_mutation();

-- Одна оценка на задание от каждой стороны. В схеме это уже есть,
-- но на базе, созданной старой версией, индекса может не быть.
CREATE UNIQUE INDEX IF NOT EXISTS ratings_task_subject_uq
  ON ratings (task_id, subject_type, subject_id)
  WHERE task_id IS NOT NULL;

-- История чата — часть отчёта о работе: переписать её нельзя.
CREATE OR REPLACE FUNCTION messages_forbid_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'messages are append-only: history must stay intact';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS messages_no_mutation ON messages;
CREATE TRIGGER messages_no_mutation
  BEFORE UPDATE OR DELETE ON messages
  FOR EACH ROW EXECUTE FUNCTION messages_forbid_mutation();
`;

const client = new pg.Client({
  connectionString,
  ssl:
    process.env.DATABASE_SSL === "true" || process.env.DATABASE_SSL === "1"
      ? { rejectUnauthorized: false }
      : undefined,
});

try {
  await client.connect();
  await client.query(SQL);

  // Проверяем не «команда прошла», а что гарантия реально стоит.
  const { rows } = await client.query(
    `select tgname from pg_trigger where tgname in ('ratings_no_mutation', 'messages_no_mutation')`
  );

  const names = new Set(rows.map((r) => r.tgname));
  for (const required of ["ratings_no_mutation", "messages_no_mutation"]) {
    if (!names.has(required)) {
      throw new Error(`trigger ${required} was not created`);
    }
  }

  console.log("guards applied: ratings and chat history are append-only");
} catch (error) {
  console.error("failed to apply database guards:", error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
