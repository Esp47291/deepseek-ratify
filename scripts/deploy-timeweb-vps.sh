#!/usr/bin/env bash
# Деплой на облачный сервер Timeweb Cloud (Ubuntu VPS) через Docker Compose.
# Запуск на сервере после git clone:
#   chmod +x scripts/deploy-timeweb-vps.sh
#   ./scripts/deploy-timeweb-vps.sh

set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$APP_DIR"

if [[ ! -f .env ]]; then
  echo "Создайте .env из .env.example и заполните SITE_URL, POSTGRES_PASSWORD, SESSION_SECRET, ADMIN_PASSWORD"
  cp -n .env.example .env 2>/dev/null || true
  echo "Файл .env создан — отредактируйте его и запустите скрипт снова."
  exit 1
fi

# Без этих трёх переменных контейнер не поднимется или кабинет не откроется.
for required in SITE_URL POSTGRES_PASSWORD SESSION_SECRET ADMIN_PASSWORD; do
  if ! grep -q "^${required}=.\+" .env; then
    echo "Ошибка: в .env не задано ${required}" >&2
    exit 1
  fi
done

if ! command -v docker >/dev/null 2>&1; then
  echo "Установите Docker: https://docs.docker.com/engine/install/ubuntu/"
  exit 1
fi

COMPOSE="docker compose"
if ! $COMPOSE version >/dev/null 2>&1; then
  COMPOSE="docker-compose"
fi

echo "==> Сборка и запуск контейнеров..."
$COMPOSE pull db 2>/dev/null || true
$COMPOSE up -d --build

echo "==> Ожидание PostgreSQL..."
for i in $(seq 1 30); do
  if $COMPOSE exec -T db pg_isready -U postgres -d app_db >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

# docker-entrypoint-initdb.d срабатывает только на ПУСТОМ томе. При повторном
# деплое или после появления новых таблиц схема иначе останется старой.
# init-db.sql идемпотентен, поэтому применяем его при каждом запуске.
echo "==> Применение схемы и гарантий..."
$COMPOSE exec -T db psql -U postgres -d app_db -v ON_ERROR_STOP=1 \
  -f /docker-entrypoint-initdb.d/init-db.sql >/dev/null
echo "OK: схема применена"

echo "==> Проверка health..."
sleep 3
if curl -sf "http://127.0.0.1:${PORT:-3000}/api/health" | grep -q '"ok":true'; then
  echo "OK: приложение отвечает на /api/health"
else
  echo "WARN: healthcheck не прошёл — проверьте логи: $COMPOSE logs web"
fi

echo ""
echo "Готово. Сайт на порту ${PORT:-3000}."
echo "Привяжите домен в панели Timeweb и настройте Nginx/Caddy или проброс порта 3000."
