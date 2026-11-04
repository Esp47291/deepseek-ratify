// Проверка входа владельца через настоящую форму: берём action id со страницы
// и отправляем POST так, как это делает браузер.
const BASE = process.env.BASE_URL || "http://127.0.0.1:3100";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "qwerty12345";

function visible(html) {
  const cut = html.indexOf("self.__next_f");
  return (cut === -1 ? html : html.slice(0, cut))
    .replace(/<!--.*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

(async () => {
  // 1. Неверный пароль — остаёмся на странице с ошибкой.
  const loginPage = await fetch(`${BASE}/admin/login`);
  const html = await loginPage.text();

  const actionId = html.match(/\$ACTION_ID_([a-f0-9]+)/)?.[1];
  if (!actionId) {
    console.log("FAIL: не найден id серверного действия на форме входа");
    process.exitCode = 1;
    return;
  }
  console.log("PASS: id серверного действия найден");

  async function submit(password) {
    const body = new FormData();
    body.set("password", password);
    body.set(`$ACTION_ID_${actionId}`, "");

    return fetch(`${BASE}/admin/login`, {
      method: "POST",
      body,
      redirect: "manual",
    });
  }

  const bad = await submit("wrong-password");
  const badLocation = bad.headers.get("location") || "";
  if (badLocation.includes("error=1")) {
    console.log("PASS: неверный пароль отклонён");
  } else {
    console.log(`FAIL: неверный пароль дал ${bad.status} ${badLocation}`);
    process.exitCode = 1;
  }

  // 2. Верный пароль из .env — выдаёт cookie сессии.
  const good = await submit(ADMIN_PASSWORD);
  const cookie = good.headers.get("set-cookie") || "";
  if (cookie.includes("ratify_admin=")) {
    console.log("PASS: верный пароль выдаёт cookie сессии");
  } else {
    console.log(`FAIL: верный пароль не выдал cookie (${good.status}) ${cookie}`);
    process.exitCode = 1;
  }

  // 3. С этой cookie кабинет открывается.
  const adminCookie = cookie.split(";")[0];
  const admin = await fetch(`${BASE}/admin`, {
    headers: { cookie: adminCookie },
    redirect: "manual",
  });
  const adminHtml = await admin.text();
  const ok = admin.status === 200 && visible(adminHtml).includes("Заказчики");
  console.log(ok ? "PASS: кабинет открывается по выданной cookie" : `FAIL: кабинет ${admin.status}`);

  // 4. После выхода cookie стирается.
  const logoutId = adminHtml.match(/\$ACTION_ID_([a-f0-9]+)/)?.[1];
  if (logoutId) {
    const logoutBody = new FormData();
    logoutBody.set(`$ACTION_ID_${logoutId}`, "");
    const out = await fetch(`${BASE}/admin`, {
      method: "POST",
      body: logoutBody,
      headers: { cookie: adminCookie },
      redirect: "manual",
    });
    const cleared = (out.headers.get("set-cookie") || "").includes("ratify_admin=;");
    console.log(cleared ? "PASS: выход стирает cookie" : "NIT: выход не прислал очистку cookie");
  }

  if (!process.exitCode) console.log("\nвход проверен");
})();
