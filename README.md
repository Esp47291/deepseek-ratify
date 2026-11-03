# ratify

Сайт маркетингового агентства: Яндекс.Директ, SEO, аудит сайта и продукта, ведение карточки в Яндекс.Бизнесе.
Посетитель оставляет заявку, она сохраняется в PostgreSQL и приходит в Telegram.

**Стек:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Framer Motion, PostgreSQL 16, Drizzle ORM.

## Запуск на своём компьютере

Нужен Node.js 22 или новее (`node -v`).

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Сайт откроется на http://localhost:3000.

Без базы данных сайт работает полностью, но заявки из форм не сохраняются.
Чтобы они сохранялись, запустите PostgreSQL (например, через Docker) и создайте таблицу:

```powershell
docker run -d --name ratify-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=app_db -p 5432:5432 postgres:16-alpine
npm run db:push
```

Уведомления в Telegram включаются переменными `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` в `.env`.

## Команды

| Команда | Что делает |
| --- | --- |
| `npm run dev` | Режим разработки на http://localhost:3000 |
| `npm run build` | Сборка для продакшена (нужен доступ к Google Fonts) |
| `npm start` | Запуск собранного сайта |
| `npm run typecheck` | Проверка типов |
| `npm run lint` | Проверка кода |
| `npm run db:push` | Создать или обновить таблицу заявок |

## Структура

- `src/app/` — страницы: главная, услуги, цены, калькулятор, гарантии, FAQ, о нас, контакты, оферта, политика; API заявок `api/leads`.
- `src/components/` — шапка с мега-меню, подвал, формы, калькулятор, SVG-иллюстрации.
- `src/lib/services-data.ts` — услуги, этапы работы и FAQ: всё меню и страницы услуг строятся отсюда.
- `src/lib/contacts.ts` — телефон, email и мессенджеры.
- `src/db/schema.ts` — таблица заявок.
- `src/app/globals.css` — дизайн-система: цвета, кнопки, карточки, типографика.
