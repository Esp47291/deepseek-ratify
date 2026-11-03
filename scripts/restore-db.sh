#!/usr/bin/env bash
# Восстановление базы из резервной копии.
#
# Запуск на сервере:
#   ./scripts/restore-db.sh backups/ratify_2026-11-04_03-00.sql.gz
#
# ВНИМАНИЕ: заменяет текущие данные содержимым копии. Скрипт спрашивает
# подтверждение, но прочитайте путь к файлу дважды.

set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$APP_DIR"

FILE="${1:-}"
if [[ -z "$FILE" ]]; then
  echo "Укажите файл копии: ./scripts/restore-db.sh backups/ratify_....sql.gz" >&2
  ls -1t backups/ratify_*.sql.gz 2>/dev/null | head -5 || true
  exit 1
fi

if [[ ! -f "$FILE" ]]; then
  echo "Файл не найден: $FILE" >&2
  exit 1
fi

if ! gzip -t "$FILE" 2>/dev/null; then
  echo "Файл повреждён или не gzip: $FILE" >&2
  exit 1
fi

COMPOSE="docker compose"
if ! $COMPOSE version >/dev/null 2>&1; then
  COMPOSE="docker-compose"
fi

echo "Будет восстановлена база из: $FILE"
echo "Текущие данные в app_db будут заменены."
read -r -p "Продолжить? Введите yes: " ANSWER
if [[ "$ANSWER" != "yes" ]]; then
  echo "Отменено."
  exit 1
fi

# Серверные действия пишут в базу; останавливаем приложение, чтобы не
# получить полуприменённое состояние.
$COMPOSE stop web >/dev/null 2>&1 || true

gzip -dc "$FILE" | $COMPOSE exec -T db psql -U postgres -d app_db -v ON_ERROR_STOP=1 >/dev/null

$COMPOSE start web >/dev/null 2>&1 || $COMPOSE up -d web >/dev/null

echo "OK: база восстановлена, приложение запущено."
echo "Проверьте: curl -s http://127.0.0.1:${PORT:-3000}/api/health"
