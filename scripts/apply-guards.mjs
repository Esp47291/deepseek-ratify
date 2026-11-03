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
    "select count(*)::int as n from pg_trigger where tgname = 'ratings_no_mutation'"
  );

  if (rows[0].n !== 1) {
    throw new Error("trigger ratings_no_mutation was not created");
  }

  console.log("guards applied: ratings is append-only, one rating per task");
} catch (error) {
  console.error("failed to apply database guards:", error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
