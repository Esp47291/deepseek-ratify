-- Idempotent schema for fresh and existing databases.
-- Mirrors src/db/schema.ts. Safe to run repeatedly.

-- ---------- Site: leads ----------
CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  company_url TEXT,
  service TEXT,
  budget TEXT,
  message TEXT,
  type TEXT DEFAULT 'order',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Safe to run on a database created with the old schema
ALTER TABLE leads ADD COLUMN IF NOT EXISTS service TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS budget TEXT;

CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads (created_at DESC);

-- ---------- Platform: clients ----------
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  token TEXT NOT NULL,
  note TEXT,
  archived_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS clients_token_uq ON clients (token);

-- ---------- Platform: venues ----------
CREATE TABLE IF NOT EXISTS venues (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  platform TEXT NOT NULL DEFAULT 'yandex',
  map_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS venues_client_idx ON venues (client_id);

-- ---------- Platform: reviews ----------
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  venue_id INTEGER NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  source_url TEXT NOT NULL,
  rating INTEGER,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reviews_venue_idx ON reviews (venue_id);

-- ---------- Platform: workers ----------
CREATE TABLE IF NOT EXISTS workers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  telegram TEXT,
  token TEXT NOT NULL,
  blocked_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS workers_token_uq ON workers (token);

-- ---------- Platform: tasks ----------
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  worker_id INTEGER REFERENCES workers(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  instructions TEXT,
  platform TEXT NOT NULL DEFAULT 'yandex',
  client_rate INTEGER NOT NULL DEFAULT 0,
  worker_rate INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  due_at TIMESTAMP,
  taken_at TIMESTAMP,
  submitted_at TIMESTAMP,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tasks_client_idx ON tasks (client_id);
CREATE INDEX IF NOT EXISTS tasks_worker_idx ON tasks (worker_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks (status);

-- ---------- Platform: task_items ----------
CREATE TABLE IF NOT EXISTS task_items (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  review_id INTEGER NOT NULL REFERENCES reviews(id) ON DELETE RESTRICT,
  answer TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  revision_note TEXT,
  submitted_at TIMESTAMP,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS task_items_task_idx ON task_items (task_id);
CREATE UNIQUE INDEX IF NOT EXISTS task_items_task_review_uq ON task_items (task_id, review_id);

-- Число возвратов на доработку: нужно для честной доли «с первого раза»
ALTER TABLE task_items ADD COLUMN IF NOT EXISTS revision_count INTEGER NOT NULL DEFAULT 0;

-- ---------- Platform: ratings (append-only) ----------CREATE TABLE IF NOT EXISTS ratings (
  id SERIAL PRIMARY KEY,
  subject_type TEXT NOT NULL,
  subject_id INTEGER NOT NULL,
  task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
  score INTEGER NOT NULL,
  comment TEXT,
  internal_note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ratings_subject_idx ON ratings (subject_type, subject_id);

-- Одна оценка на задание от каждой стороны: защита от двойного выставления.
CREATE UNIQUE INDEX IF NOT EXISTS ratings_task_subject_uq
  ON ratings (task_id, subject_type, subject_id)
  WHERE task_id IS NOT NULL;

-- Append-only на уровне базы: оценку нельзя изменить или удалить,
-- иначе рейтинг ничего не стоит. Держится триггером, а не соглашением.
CREATE OR REPLACE FUNCTION ratings_forbid_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ratings is append-only: update and delete are forbidden';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ratings_no_mutation ON ratings;
CREATE TRIGGER ratings_no_mutation
  BEFORE UPDATE OR DELETE ON ratings
  FOR EACH ROW EXECUTE FUNCTION ratings_forbid_mutation();

-- ---------- Platform: chat ----------
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_role TEXT NOT NULL,
  author_name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_task_idx ON messages (task_id, created_at);

-- История разговора часть отчёта о работе: переписать её нельзя.
CREATE OR REPLACE FUNCTION messages_forbid_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'messages are append-only: history must stay intact';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS messages_no_mutation ON messages;
CREATE TRIGGER messages_no_mutation
  BEFORE UPDATE OR DELETE ON messages
  FOR EACH ROW EXECUTE FUNCTION messages_forbid_mutation();

-- ---------- Platform: услуги исполнителя на бирже ----------
CREATE TABLE IF NOT EXISTS worker_services (
  id SERIAL PRIMARY KEY,
  worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'yandex',
  title TEXT NOT NULL,
  description TEXT,
  rate INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS worker_services_worker_idx ON worker_services (worker_id);
