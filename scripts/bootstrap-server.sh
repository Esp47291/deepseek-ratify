#!/usr/bin/env bash
# Одноразовый деплой на VPS (Ubuntu/Debian) через Docker Compose.
# Запуск на сервере:
#   export SITE_URL=https://example.com
#   export REPO=https://github.com/<user>/<repo>.git
#   # необязательно: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
#   bash scripts/bootstrap-server.sh
#
# Повторный запуск безопасен: существующий .env НЕ перезаписывается
# (иначе новый пароль БД не подошёл бы к уже созданному тому pgdata).

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/ratify}"
REPO="${REPO:-https://github.com/Esp47291/ratify.git}"
PORT="${PORT:-3000}"

if [[ -z "${SITE_URL:-}" ]]; then
  echo "Переменная SITE_URL обязательна (например, https://example.com)" >&2
  exit 1
fi

echo "==> Обновление системы и установка зависимостей..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq git curl ca-certificates openssl

if ! command -v docker >/dev/null 2>&1; then
  echo "==> Установка Docker..."
  curl -fsSL https://get.docker.com | sh
fi

systemctl enable docker >/dev/null 2>&1 || true
systemctl start docker >/dev/null 2>&1 || true

if ! docker compose version >/dev/null 2>&1; then
  apt-get install -y -qq docker-compose-plugin
fi

echo "==> Клонирование репозитория..."
mkdir -p "$(dirname "$APP_DIR")"
if [[ -d "$APP_DIR/.git" ]]; then
  git -C "$APP_DIR" pull
else
  git clone "$REPO" "$APP_DIR"
fi

if [[ -f "$APP_DIR/.env" ]]; then
  echo "==> .env уже существует — оставляю без изменений."
else
  echo "==> Создание .env со сгенерированными секретами..."
  umask 077
  cat > "$APP_DIR/.env" <<ENVEOF
SITE_URL=${SITE_URL}
POSTGRES_PASSWORD=$(openssl rand -hex 24)
SESSION_SECRET=$(openssl rand -hex 32)
ADMIN_PASSWORD=$(openssl rand -hex 16)
DATABASE_SSL=false
PORT=${PORT}
TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN:-}
TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID:-}
TELEGRAM_PROXY=
ENVEOF
  echo "==> Пароль владельца для входа в /admin:"
  grep '^ADMIN_PASSWORD=' "$APP_DIR/.env" | cut -d= -f2-
  echo "    Сохраните его: в файле он есть, но больше нигде не покажется."
fi

echo "==> Сборка и запуск Docker Compose..."
cd "$APP_DIR"
docker compose up -d --build

echo "==> Ожидание PostgreSQL..."
for i in $(seq 1 30); do
  if docker compose exec -T db pg_isready -U postgres -d app_db >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

# docker-entrypoint-initdb.d срабатывает только на ПУСТОМ томе. При повторном
# деплое или после появления новых таблиц схема иначе останется старой.
# init-db.sql идемпотентен, поэтому применяем его при каждом запуске.
echo "==> Применение схемы и гарантий..."
docker compose exec -T db psql -U postgres -d app_db -v ON_ERROR_STOP=1 \
  -f /docker-entrypoint-initdb.d/init-db.sql >/dev/null
echo "OK: схема применена"

echo "==> Ожидание healthcheck..."
for i in $(seq 1 36); do
  if curl -sf "http://127.0.0.1:${PORT}/api/health" | grep -q '"ok":true'; then
    echo "OK: /api/health"
    break
  fi
  sleep 5
  if [[ "$i" -eq 36 ]]; then
    echo "Ошибка: healthcheck не прошёл" >&2
    docker compose logs --tail=100 web
    exit 1
  fi
done

echo ""
echo "Готово: ${SITE_URL}"
echo "Порт БД наружу не открыт. Секреты лежат в ${APP_DIR}/.env (права 600) — не коммитьте файл."
