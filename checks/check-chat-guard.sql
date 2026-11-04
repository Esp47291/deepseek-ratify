-- Проверка: историю чата нельзя изменить или удалить.
DO $$
BEGIN
  UPDATE messages SET body = 'tampered' WHERE id = 1;
  RAISE NOTICE 'FAIL: update сообщения прошёл';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'PASS: update сообщения запрещён (%)', SQLERRM;
END $$;

DO $$
BEGIN
  DELETE FROM messages WHERE id = 1;
  RAISE NOTICE 'FAIL: delete сообщения прошёл';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'PASS: delete сообщения запрещён (%)', SQLERRM;
END $$;
