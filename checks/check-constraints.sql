-- Проверки ограничений в базе. Каждый блок печатает PASS/FAIL.
-- Запускать после checks/seed.sql: тесты опираются на данные из сидов.
\set ON_ERROR_STOP off

-- Готовим строку для проверок 1–3: на пустой таблице UPDATE не сработает
-- и тест ложно покажет, что защита «прошла».
-- Ключ должен совпадать с ключом проверки 3: уникальность работает только
-- внутри задания, иначе дубль с task_id = NULL пройдёт законно.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM ratings
    WHERE subject_type = 'worker' AND subject_id = 1 AND task_id = 1
  ) THEN
    INSERT INTO ratings (subject_type, subject_id, task_id, score)
    VALUES ('worker', 1, 1, 5);
  END IF;
END $$;

-- 1. Оценку нельзя изменить.
DO $$
BEGIN
  UPDATE ratings SET score = 1 WHERE id = 1;
  RAISE NOTICE 'FAIL: update оценки прошёл';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'PASS: update оценки запрещён (%)', SQLERRM;
END $$;

-- 2. Оценку нельзя удалить.
DO $$
BEGIN
  DELETE FROM ratings WHERE id = 1;
  RAISE NOTICE 'FAIL: delete оценки прошёл';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'PASS: delete оценки запрещён (%)', SQLERRM;
END $$;

-- 3. Повторная оценка того же задания той же стороной не проходит.
DO $$
BEGIN
  INSERT INTO ratings (subject_type, subject_id, task_id, score)
  VALUES ('worker', 1, 1, 3);
  RAISE NOTICE 'FAIL: дубль оценки прошёл';
EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'PASS: дубль оценки отсечён уникальным индексом';
END $$;

-- 4. Деньги по заданию 1: две принятые позиции при ставках 650 / 250.
DO $$
DECLARE
  accepted int;
  client_total int;
  worker_total int;
BEGIN
  SELECT count(*) INTO accepted FROM task_items WHERE task_id = 1 AND status = 'accepted';
  SELECT accepted * client_rate, accepted * worker_rate
    INTO client_total, worker_total FROM tasks WHERE id = 1;

  IF accepted = 2 AND client_total = 1300 AND worker_total = 500 THEN
    RAISE NOTICE 'PASS: деньги по заданию 1 — заказчику %, исполнителю %', client_total, worker_total;
  ELSE
    RAISE NOTICE 'FAIL: принято %, заказчику %, исполнителю % (ожидалось 2, 1300, 500)',
      accepted, client_total, worker_total;
  END IF;
END $$;

-- 5. Позицию нельзя принять дважды в одном задании (уникальность пары задание+отзыв).
DO $$
BEGIN
  INSERT INTO task_items (task_id, review_id) VALUES (1, 1);
  RAISE NOTICE 'FAIL: дубль позиции прошёл';
EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'PASS: дубль позиции в задании отсечён';
END $$;

-- 6. Ссылка на отзыв обязательна.
DO $$
BEGIN
  INSERT INTO reviews (venue_id, text, source_url) VALUES (1, 'текст', NULL);
  RAISE NOTICE 'FAIL: отзыв без ссылки сохранён';
EXCEPTION WHEN not_null_violation THEN
  RAISE NOTICE 'PASS: отзыв без ссылки невозможен';
END $$;
