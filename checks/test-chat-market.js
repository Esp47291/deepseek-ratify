// Чат по заданию и биржа: проверка отображения и отправки сообщений.
const crypto = require("node:crypto");
const BASE = process.env.BASE_URL || "http://127.0.0.1:3100";
const SECRET = process.env.SESSION_SECRET || "qwerty12345";

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

let failures = 0;
function check(name, ok, extra = "") {
  if (ok) console.log(`PASS ${name}`);
  else {
    failures++;
    console.log(`FAIL ${name} ${extra}`);
  }
}

async function fetchPage(path, cookie) {
  const res = await fetch(`${BASE}${path}`, { headers: cookie ? { cookie } : {} });
  return { status: res.status, html: await res.text() };
}

/** Найти id действия и поля формы по маркеру. */
function findForm(html, marker) {
  const form = html.split("<form").slice(1).find((f) => f.includes(marker));
  if (!form) return null;
  return {
    id: form.match(/\$ACTION_ID_([a-f0-9]+)/)?.[1],
    form,
  };
}

async function submit(path, form, id, fields, cookie) {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.set(key, value);
  body.set(`$ACTION_ID_${id}`, "");
  return fetch(`${BASE}${path}`, {
    method: "POST",
    body,
    headers: cookie ? { cookie } : {},
    redirect: "manual",
  });
}

(async () => {
  const auth = adminCookie();

  // ---------- 1. Чат виден владельцу ----------
  const task = await fetchPage("/admin/tasks/1", auth);
  const taskText = visible(task.html);
  check("чат задания виден владельцу", taskText.includes("Чат по заданию"));
  check(
    "в ленте есть сообщения всех трёх сторон",
    taskText.includes("на негатив отвечаем без спора") &&
      taskText.includes("можно ли предложить повторный приём") &&
      taskText.includes("Скидку предлагать не нужно")
  );

  // ---------- 2. Владелец пишет в чат ----------
  const ownerForm = findForm(task.html, 'name="body"');
  if (!ownerForm?.id) {
    check("форма чата у владельца найдена", false);
  } else {
    const marker = "ПРОВЕРКА-ВЛАДЕЛЕЦ-ПИШЕТ-В-ЧАТ";
    await submit("/admin/tasks/1", ownerForm.form, ownerForm.id, { taskId: "1", body: marker }, auth);
    const after = visible((await fetchPage("/admin/tasks/1", auth)).html);
    check("владелец может написать в чат", after.includes(marker));
  }

  // ---------- 3. Исполнитель видит чат и пишет ----------
  const work = await fetchPage("/work/workertoken0001");
  const workText = visible(work.html);
  check("чат виден исполнителю", workText.includes("Чат по заданию"));

  const workerForm = findForm(work.html, 'name="body"');
  if (!workerForm?.id) {
    check("форма чата у исполнителя найдена", false);
  } else {
    const marker = "ПРОВЕРКА-ИСПОЛНИТЕЛЬ-ПИШЕТ";
    await submit("/work/workertoken0001", workerForm.form, workerForm.id, {
      token: "workertoken0001",
      taskId: "1",
      body: marker,
    });
    const after = visible((await fetchPage("/work/workertoken0001")).html);
    check("исполнитель может написать в чат", after.includes(marker));
  }

  // ---------- 4. Заказчик видит и пишет ----------
  const clientPage = await fetchPage("/r/clienttoken0001");
  const clientText = visible(clientPage.html);
  check("чат виден заказчику", clientText.includes("Чат по заданию"));

  const clientForm = findForm(clientPage.html, 'name="body"');
  if (!clientForm?.id) {
    check("форма чата у заказчика найдена", false);
  } else {
    const marker = "ПРОВЕРКА-ЗАКАЗЧИК-ПИШЕТ";
    await submit("/r/clienttoken0001", clientForm.form, clientForm.id, {
      token: "clienttoken0001",
      taskId: "1",
      body: marker,
    });
    const after = visible((await fetchPage("/r/clienttoken0001")).html);
    check("заказчик может написать в чат", after.includes(marker));
  }

  // ---------- 5. Чужой заказчик не пишет в чужой чат ----------
  const foreign = await fetchPage("/r/clienttoken0001");
  const foreignForm = findForm(foreign.html, 'name="body"');
  if (foreignForm?.id) {
    await submit("/r/clienttoken0001", foreignForm.form, foreignForm.id, {
      token: "clienttoken0001",
      taskId: "999", // задание другого заказчика/несуществующее
      body: "ПОПЫТКА-ПИСАТЬ-В-ЧУЖОЕ-ЗАДАНИЕ",
    });
    const taskAfter = visible((await fetchPage("/admin/tasks/1", auth)).html);
    check(
      "нельзя писать в задание, которого нет у заказчика",
      !taskAfter.includes("ПОПЫТКА-ПИСАТЬ-В-ЧУЖОЕ-ЗАДАНИЕ")
    );
  }

  // ---------- 6. Биржа: услуги видны владельцу ----------
  const workers = await fetchPage("/admin/workers", auth);
  const workersText = visible(workers.html);
  check("раздел биржи есть у владельца", workersText.includes("Биржа: что предлагают исполнители"));
  check(
    "услуги исполнителей видны",
    workersText.includes("Ответы на отзывы в Яндекс.Картах") &&
      workersText.includes("Ответы на отзывы в 2ГИС")
  );

  // ---------- 7. Исполнитель видит свои услуги и добавляет новую ----------
  const workServices = await fetchPage("/work/workertoken0001");
  const workServicesText = visible(workServices.html);
  check("исполнитель видит свои услуги", workServicesText.includes("Мои услуги на бирже"));

  const addForm = findForm(workServices.html, 'name="rate"');
  if (!addForm?.id) {
    check("форма добавления услуги найдена", false);
  } else {
    const marker = "Проверка услуги из теста";
    await submit("/work/workertoken0001", addForm.form, addForm.id, {
      token: "workertoken0001",
      title: marker,
      platform: "yandex",
      rate: "275",
      description: "добавлено тестом",
    });
    const after = visible((await fetchPage("/work/workertoken0001")).html);
    check("исполнитель может добавить услугу", after.includes(marker));

    const adminAfter = visible((await fetchPage("/admin/workers", auth)).html);
    check("новая услуга видна владельцу на бирже", adminAfter.includes(marker));
  }

  console.log(failures === 0 ? "\nчат и биржа проверены" : `\nпровалов: ${failures}`);
  process.exitCode = failures === 0 ? 0 : 1;
})();
