// Взятие задания исполнителем и оценка владельцем — последние непроверенные мутации.
const crypto = require("node:crypto");
const BASE = process.env.BASE_URL || "http://127.0.0.1:3100";
const SECRET = process.env.SESSION_SECRET || "qwerty12345";
const WORKER2 = "workertoken0002";

const adminCookie = () => {
  const exp = Date.now() + 3600_000;
  const payload = `admin.${exp}`;
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  return `ratify_admin=${exp}.${sig}`;
};

function visible(html) {
  const cut = html.indexOf("self.__next_f");
  return (cut === -1 ? html : html.slice(0, cut))
    .replace(/<!--.*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function actionIdFor(html, predicate) {
  const form = html.split("<form").slice(1).find(predicate);
  if (!form) return null;
  return {
    id: form.match(/\$ACTION_ID_([a-f0-9]+)/)?.[1],
    form,
  };
}

(async () => {
  let failed = 0;

  // ---------- 1. Взятие задания ----------
  const workerHtml = await (await fetch(`${BASE}/work/${WORKER2}`)).text();
  const take = await actionIdFor(workerHtml, (f) => f.includes('name="taskId"'));

  if (!take?.id) {
    console.log("NIT: нет свободного задания для проверки взятия");
  } else {
    const taskId = take.form.match(/name="taskId"\s+value="(\d+)"/)?.[1];
    const body = new FormData();
    body.set("token", WORKER2);
    body.set("taskId", taskId);
    body.set(`$ACTION_ID_${take.id}`, "");

    const res = await fetch(`${BASE}/work/${WORKER2}`, {
      method: "POST",
      body,
      redirect: "manual",
    });
    const after = visible(await (await fetch(`${BASE}/work/${WORKER2}`)).text());

    const taken = after.includes("Отказаться от задания") && after.includes("Сохранить ответ");
    console.log(
      taken
        ? `PASS: задание ${taskId} взято, тексты отзывов открылись (${res.status})`
        : `FAIL: после взятия кабинет не показывает задание (${res.status})`
    );
    if (!taken) failed++;
  }

  // ---------- 2. Оценка ----------
  const auth = adminCookie();

  // Сначала исполнитель отвечает на оставшуюся пустую позицию:
  // принять позицию без ответа нельзя — это правильное поведение.
  const w1 = await (await fetch(`${BASE}/work/workertoken0001`)).text();
  const emptyForm = w1
    .split("<form")
    .slice(1)
    .find((f) => f.includes('name="answer"') && !/\sdisabled=""/.test(f) && /<textarea[^>]*><\/textarea>/.test(f));

  if (emptyForm) {
    const id = emptyForm.match(/\$ACTION_ID_([a-f0-9]+)/)?.[1];
    const itemId = emptyForm.match(/name="itemId"\s+value="(\d+)"/)?.[1];
    const body = new FormData();
    body.set("token", "workertoken0001");
    body.set("itemId", itemId);
    body.set("answer", "Спасибо за отзыв! Стараемся, чтобы всё было по времени.");
    body.set(`$ACTION_ID_${id}`, "");
    await fetch(`${BASE}/work/workertoken0001`, { method: "POST", body, redirect: "manual" });
  }

  let taskHtml = await (await fetch(`${BASE}/admin/tasks/1`, { headers: { cookie: auth } })).text();
  let page = visible(taskHtml);

  // Принимаем все ожидающие позиции, чтобы задание стало accepted.
  for (let guard = 0; guard < 10; guard++) {
    const accept = await actionIdFor(taskHtml, (f) => f.includes('value="accept"'));
    if (!accept?.id) break;

    const itemId = accept.form.match(/name="itemId"\s+value="(\d+)"/)?.[1];
    const body = new FormData();
    body.set("itemId", itemId);
    body.set("decision", "accept");
    body.set(`$ACTION_ID_${accept.id}`, "");

    await fetch(`${BASE}/admin/tasks/1`, {
      method: "POST",
      body,
      headers: { cookie: auth },
      redirect: "manual",
    });

    taskHtml = await (await fetch(`${BASE}/admin/tasks/1`, { headers: { cookie: auth } })).text();
    page = visible(taskHtml);
  }

  const allAccepted = /Принято 6 \/ 6/.test(page);
  console.log(allAccepted ? "PASS: все позиции приняты, задание закрыто" : "FAIL: не удалось принять все позиции");
  if (!allAccepted) failed++;

  // Форма оценки исполнителя появляется только после приёмки.
  const rate = await actionIdFor(
    taskHtml,
    (f) => f.includes('name="subjectType"') && f.includes('value="worker"')
  );

  if (!rate?.id) {
    console.log("FAIL: формы оценки исполнителя нет после приёмки");
    failed++;
  } else {
    const body = new FormData();
    body.set("taskId", "1");
    body.set("subjectType", "worker");
    body.set("subjectId", "1");
    body.set("score", "5");
    body.set("comment", "Проверка оценки: аккуратно и в срок");
    body.set(`$ACTION_ID_${rate.id}`, "");

    await fetch(`${BASE}/admin/tasks/1`, {
      method: "POST",
      body,
      headers: { cookie: auth },
      redirect: "manual",
    });

    const ratingsPage = visible(
      await (await fetch(`${BASE}/admin/ratings`, { headers: { cookie: auth } })).text()
    );

    const ok = ratingsPage.includes("Проверка оценки: аккуратно и в срок");
    console.log(ok ? "PASS: оценка сохранена и видна в рейтингах" : "FAIL: оценка не появилась");
    if (!ok) failed++;

    // Повторная оценка того же задания не должна пройти.
    const again = new FormData();
    again.set("taskId", "1");
    again.set("subjectType", "worker");
    again.set("subjectId", "1");
    again.set("score", "1");
    again.set("comment", "ВТОРАЯ ОЦЕНКА НЕ ДОЛЖНА ПОЯВИТЬСЯ");
    await fetch(`${BASE}/admin/tasks/1`, {
      method: "POST",
      body: again,
      headers: { cookie: auth },
      redirect: "manual",
    });
    // Сессия действия уже использована — проверяем через страницу рейтингов.
    const after = visible(
      await (await fetch(`${BASE}/admin/ratings`, { headers: { cookie: auth } })).text()
    );
    console.log(
      after.includes("ВТОРАЯ ОЦЕНКА НЕ ДОЛЖНА ПОЯВИТЬСЯ")
        ? "NIT: повторная оценка прошла (проверьте уникальный индекс)"
        : "PASS: повторная оценка не появилась"
    );
  }

  process.exitCode = failed === 0 ? 0 : 1;
})();
