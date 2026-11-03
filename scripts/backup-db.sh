#!/usr/bin/env bash
# Резервная копия базы платформы.
#
# Запуск на сервере:
#   ./scripts/backup-db.sh              # в ./backups
#   BACKUP_DIR=/mnt/backups ./scripts/backup-db.sh
#
# Ставится в cron (см. DEPLOY.md). Копия — обычный SQL-файл, сжатый gzip:
# восстанавливается одной командой, не требует той же версии Postgres.

set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$APP_DIR"

BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"

COMPOSE="docker compose"
if ! $COMPOSE version >/dev/null 2>&1; then
  COMPOSE="docker-compose"
fi

if ! $COMPOSE ps --status running --services 2>/dev/null | grep -qx db; then
  echo "Ошибка: контейнер db не запущен" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

STAMP="$(date +%Y-%m-%d_%H-%M)"
FILE="$BACKUP_DIR/ratify_${STAMP}.sql.gz"

# pg_dump внутри контейнера, gzip на хосте: версия утилиты совпадает с сервером.
if ! $COMPOSE exec -T db pg_dump -U postgres -d app_db --clean --if-exists \
    | gzip -9 > "$FILE"; then
  rm -f "$FILE"
  echo "Ошибка: дамп не создан" >&2
  exit 1
fi

# Пустой или подозрительно маленький файл — это не копия, а сбой.
SIZE="$(stat -c%s "$FILE" 2>/dev/null || stat -f%z "$FILE")"
if [[ "$SIZE" -lt 1024 ]]; then
  rm -f "$FILE"
  echo "Ошибка: дамп подозрительно мал (${SIZE} байт)" >&2
  exit 1
fi

# Проверяем, что внутри действительно SQL, а не сообщение об ошибке.
if ! gzip -dc "$FILE" | head -n 200 | grep -q 'CREATE TABLE\|PostgreSQL database dump'; then
  rm -f "$FILE"
  echo "Ошибка: в дампе нет SQL — копия негодная" >&2
  exit 1
fi

# Чистим старое, чтобы диск не кончился молча.
find "$BACKUP_DIR" -name 'ratify_*.sql.gz' -type f -mtime "+${KEEP_DAYS}" -delete 2>/dev/null || true

echo "OK: $FILE ($(du -h "$FILE" | cut -f1)), хранение ${KEEP_DAYS} дней"
