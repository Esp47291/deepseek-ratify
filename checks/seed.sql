-- Тестовые данные для локальной проверки. В репозиторий не попадает.
TRUNCATE messages, worker_services, ratings, task_items, tasks, reviews, venues, workers, clients RESTART IDENTITY CASCADE;

INSERT INTO clients (name, contact_name, contact_phone, token)
VALUES ('Сеть клиник «Диагностика»', 'Ирина', '+7 900 000-00-00', 'clienttoken0001');

INSERT INTO venues (client_id, name, address, platform, map_url) VALUES
  (1, 'Отделение МРТ, Краснодар', 'Московская, 96', 'yandex', 'https://yandex.ru/maps/-/CTDwnDMg'),
  (1, 'Медицинская диагностика, Сочи', 'Горького, 48', 'yandex', 'https://yandex.ru/maps/-/CTsbM87L'),
  (1, 'Медицинская диагностика, Новороссийск', 'Васенко, 8', 'yandex', 'https://yandex.ru/maps/-/CTDwzHPp');

INSERT INTO reviews (venue_id, text, source_url, rating) VALUES
  (1, 'делала МРТ головного мозга по направлению невролога. записалась по телефону, пришла к назначеному времени, ждала минут 15, в принципе нормально.', 'https://yandex.ru/maps/-/CTDwnDMg#rev1', 5),
  (1, 'Проходил МРТ коленного сустава. Сама процедура прошла быстро, уложился в 20 минут.', 'https://yandex.ru/maps/-/CTDwnDMg#rev2', 5),
  (2, 'пришла на мрт головы по направлению невролога, записалась за 2 дня, приехала утром в 9, народу почти не было.', 'https://yandex.ru/maps/-/CTsbM87L#rev1', 5),
  (2, 'приехал сюда после работы, потому что до 22:00 работают, очень удобно для тех кто занят днём.', 'https://yandex.ru/maps/-/CTsbM87L#rev2', 4),
  (3, 'записался по тел, приехал в субботу, думал будет толпа, а нет, свободно.', 'https://yandex.ru/maps/-/CTDwzHPp#rev1', 4),
  (3, 'очень благодарна врачу, он меня выслушал, я жаловалась на головные боли.', 'https://yandex.ru/maps/-/CTDwzHPp#rev2', 5);

INSERT INTO workers (name, telegram, token) VALUES
  ('Анна', '@anna_reviews', 'workertoken0001'),
  ('Пётр', '@petr_otzyv', 'workertoken0002');

-- Задание 1: 6 позиций, 650 ₽ заказчику и 250 ₽ исполнителю за ответ.
INSERT INTO tasks (client_id, worker_id, title, instructions, platform, client_rate, worker_rate, status, taken_at)
VALUES (1, 1, 'Ответы на отзывы, ноябрь', 'Отвечаем от имени клиники, вежливо, без обещаний диагноза. Ссылку на источник не меняем.', 'yandex', 650, 250, 'taken', NOW());

INSERT INTO task_items (task_id, review_id, answer, status, revision_count) VALUES
  (1, 1, 'Спасибо за подробный отзыв! Рады, что результат отдали быстро.', 'accepted', 0),
  (1, 2, 'Благодарим за отзыв — стараемся держать темп процедуры.', 'accepted', 0),
  (1, 3, 'Спасибо, что отметили удобную запись. Будем рады помочь снова.', 'submitted', 0),
  (1, 4, 'Спасибо! Работаем допоздна именно для таких случаев.', 'submitted', 1),
  (1, 5, 'Благодарим за отзыв.', 'revision', 1),
  (1, 6, NULL, 'pending', 0);

-- Оценок в сидах нет: их ставит тест, иначе форму оценки не проверить.

-- Задание 2: свободное, для проверки взятия вторым исполнителем.
INSERT INTO tasks (client_id, title, instructions, platform, client_rate, worker_rate, status)
VALUES (1, 'Сверка карточек, ноябрь', 'Проверить адрес, телефон и часы работы на карточке.', 'yandex', 650, 250, 'open');

INSERT INTO task_items (task_id, review_id, status) VALUES (2, 1, 'pending'), (2, 2, 'pending');

-- Чат по заданию 1: все три стороны в одной ленте.
INSERT INTO messages (task_id, author_role, author_name, body, created_at) VALUES
  (1, 'owner', 'Владелец', 'Анна, обратите внимание: на негатив отвечаем без спора, но с конкретикой.', NOW() - INTERVAL '2 hours'),
  (1, 'worker', 'Анна', 'Поняла. По пятому отзыву уточню, можно ли предложить повторный приём со скидкой.', NOW() - INTERVAL '1 hour'),
  (1, 'client', 'Сеть клиник «Диагностика»', 'Скидку предлагать не нужно, лучше пригласить на консультацию.', NOW() - INTERVAL '30 minutes');

-- Услуги на бирже.
INSERT INTO worker_services (worker_id, platform, title, description, rate, active) VALUES
  (1, 'yandex', 'Ответы на отзывы в Яндекс.Картах', 'Опыт 2 года, отвечаю в течение дня, медт��цинские темы.', 250, 1),
  (2, '2gis', 'Ответы на отзывы в 2ГИС', 'Быстро, вежливо, без шаблонов.', 300, 1);
