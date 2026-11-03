# Запуск платформы на сервере

Проверено на этой кодовой базе 2026-11-04: схема применяется идемпотентно, оба
`docker-compose` файла требуют `ADMIN_PASSWORD` и `SESSION_SECRET`, деплой-скрипты
применяют схему при каждом запуске.

## Что нужно

1. Сервер Ubuntu 22.04/24.04 (VPS) с root или sudo.
2. Домен, направленный A-записью на IP сервера.
3. Порт 22 (SSH) и 80/443 открыты в файрволе панели.

## Вариант 1: один скрипт (рекомендуется)

На сервере:

```bash
export SITE_URL=https://ratify.example.com
export REPO=https://github.com/Esp47291/ratify.git
bash -c "$(curl -fsSL https://raw.githubusercontent.com/Esp47291/ratify/main/scripts/bootstrap-server.sh)"
```

Скрипт поставит Docker, склонирует репозиторий в `/opt/ratify`, создаст `.env`
со случайными паролями, применит схему и поднимет контейнеры.

**В конце он печатает `ADMIN_PASSWORD`** — сохраните его, в файле он есть, но
больше нигде не покажется. Войти: `https://<домен>/admin`.

## Вариант 2: вручную

```bash
git clone https://github.com/Esp47291/ratify.git /opt/ratify
cd /opt/ratify
cp .env.example .env
```

Заполнить `.env`:

```
SITE_URL=https://ratify.example.com
POSTGRES_PASSWORD=<openssl rand -hex 24>
SESSION_SECRET=<openssl rand -hex 32>
ADMIN_PASSWORD=<придумать>
DATABASE_SSL=false
PORT=3000
```

Все четыре переменные обязательны: без `POSTGRES_PASSWORD` не стартует база,
без `SESSION_SECRET` и `ADMIN_PASSWORD` не открывается кабинет.

```bash
docker compose up -d --build
docker compose exec -T db psql -U postgres -d app_db \
  -f /docker-entrypoint-initdb.d/init-db.sql
```

## HTTPS

Контейнер слушает `3000`. Нужен обратный прокси. Caddy — проще всего:

```bash
apt-get install -y caddy
cat > /etc/caddy/Caddyfile <<'EOF'
ratify.example.com {
    reverse_proxy 127.0.0.1:3000
}
EOF
systemctl restart caddy
```

Caddy сам получит сертификат. Порт БД наружу не публикуется — так и оставить.

## Обновление версии

```bash
cd /opt/ratify
git pull
docker compose up -d --build
docker compose exec -T db psql -U postgres -d app_db \
  -f /docker-entrypoint-initdb.d/init-db.sql
```

Схема идемпотентна: повторный запуск безопасен и добавляет новые таблицы.
`.env` не перезаписывается — пароли и база сохраняются.

## Проверка после запуска

```bash
curl -s https://<домен>/api/health          # {"ok":true}
```

Дальше в браузере:

1. `/admin` — войти паролем.
2. Создать заказчика → добавить филиалы → внести отзывы (текст + ссылка).
3. Создать задание, выбрать отзывы, поставить 650 ₽ заказчику и 250 ₽ исполнителю.
4. Добавить исполнителя — в списке появится ссылка в его кабинет.
5. Открыть ссылку заказчика — он видит прогресс и отчёт.

## Если что-то не так

```bash
docker compose logs --tail=100 web
docker compose logs --tail=50 db
docker compose ps
```

Частые причины:

- `Задайте ADMIN_PASSWORD` — переменной нет в `.env`.
- `Задайте POSTGRES_PASSWORD` — то же для базы.
- healthcheck красный, в логах `SESSION_SECRET is required` — переменная пустая.
- 502 от прокси — контейнер не поднялся, смотреть `docker compose ps`.
