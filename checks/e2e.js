// Сквозная проверка платформы на живых данных (тестовая база).
const crypto = require("node:crypto");

const BASE = process.env.BASE_URL || "http://127.0.0.1:3100";
const SECRET = process.env.SESSION_SECRET || "0123456789abcdef0123456789abcdef";

const adminCookie = () => {
  const exp = Date.now() + 3600_000;
  const payload = `admin.${exp}`;
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  return `ratify_admin=${exp}.${sig}`;
};

/**
 * Видимый текст страницы.
 *
 * React разделяет текстовые узлы комментариями (`3<!-- --> <!-- -->филиала`),
 * а Next дублирует разметку в RSC-пейлоаде. Для проверок нам нужен только
 * первый отрендеренный HTML, без тегов и комментариев.
 */
function visible(html) {
  const cut = html.indexOf("self.__next_f");
  const markup = cut === -1 ? html : html.slice(0, cut);
  return markup
    .replace(/<!--.*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

let failures = 0;

async function page(path, { cookie, expect = [], absent = [], status = 200 } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    redirect: "manual",
    headers: cookie ? { cookie } : {},
  });
  const html = await res.text();
  const text = visible(html);

  const problems = [];
  if (res.status !== status) problems.push(`status ${res.status} != ${status}`);
  for (const needle of expect) {
    if (!text.includes(needle)) problems.push(`нет "${needle}"`);
  }
  for (const needle of absent) {
    if (text.includes(needle)) problems.push(`лишнее "${needle}"`);
  }

  if (problems.length === 0) console.log(`PASS ${path}`);
  else {
    failures++;
    console.log(`FAIL ${path} -> ${problems.join("; ")}`);
  }
  return text;
}

(async () => {
  const cookie = adminCookie();

  // --- Владелец ---
  await page("/admin", {
    cookie,
    expect: ["Сеть клиник «Диагностика»", "3 филиала", "6 отзывов", "2 задания"],
  });
  await page("/admin/clients/1", {
    cookie,
    expect: ["Отделение МРТ, Краснодар", "Московская, 96", "Ответы на отзывы, ноябрь"],
  });
  await page("/admin/tasks/1", {
    cookie,
    expect: [
      "1 300 ₽", // 2 принятые позиции × 650 ₽ заказчику
      "500 ₽", // 2 × 250 ₽ исполнителю
      "800 ₽", // маржа
      "Принять",
      "На доработку",
    ],
  });
  await page("/admin/workers", {
    cookie,
    expect: ["Анна", "Пётр", "% с первого раза"],
  });
  await page("/admin/ratings", {
    cookie,
    expect: ["Анна", "Пётр", "без оценок"],
  });

  // --- Исполнитель ---
  await page("/work/workertoken0001", {
    expect: [
      "Ответы на отзывы, ноябрь",
      "Спасибо за подробный отзыв", // текст отзыва виден после взятия
      "Отказаться от задания",
      // отправка заблокирована, пока не отвечены все 6 позиций
      "Заполните все ответы (5/6)",
    ],
  });

  // Второй исполнитель не видит ни текстов чужого задания, ни самого задания.
  await page("/work/workertoken0002", {
    absent: ["Спасибо за подробный отзыв", "Ответы на отзывы, ноябрь"],
  });

  // --- Заказчик ---
  await page("/r/clienttoken0001", {
    // 8 позиций в двух заданиях, из них 2 приняты.
    expect: ["Сеть клиник «Диагностика»", "2 / 8", "Открыть отчёт"],
  });

  const report = await page("/r/clienttoken0001/report", {
    expect: [
      "Филиал 1: Отделение МРТ, Краснодар",
      "https://yandex.ru/maps/-/CTDwnDMg",
      "Спасибо за подробный отзыв",
      "Ответ:",
    ],
    absent: ["Благодарим за отзыв."], // отклонённый ответ в отчёт не попадает
  });

  // В отчёте ровно два принятых ответа (видимый текст, без RSC-дублей).
  const answers = (report.match(/Ответ:/g) || []).length;
  if (answers === 2) console.log("PASS в отчёте ровно 2 принятых ответа");
  else {
    failures++;
    console.log(`FAIL в отчёте ${answers} ответов вместо 2`);
  }

  // --- Без доступа ---
  await page("/admin", { status: 307 });
  await page("/work/неверный", { status: 404 });
  await page("/r/неверный", { status: 404 });

  console.log(failures === 0 ? "\nвсе проверки пройдены" : `\nпровалов: ${failures}`);
  process.exitCode = failures === 0 ? 0 : 1;
})();
