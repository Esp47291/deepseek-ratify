// Может ли чужой сайт дёрнуть серверное действие от имени исполнителя?
// Next.js проверяет Origin у Server Actions; проверяем это на живом сервере.
const BASE = process.env.BASE_URL || "http://127.0.0.1:3100";
const TOKEN = "workertoken0001";
const MARKER = "CSRF-ПРОБА-ЧУЖОЙ-САЙТ";

(async () => {
  const html = await (await fetch(`${BASE}/work/${TOKEN}`)).text();
  const form = html.split("<form").find((f) => f.includes('name="answer"'));
  const id = form?.match(/\$ACTION_ID_([a-f0-9]+)/)?.[1];
  const itemId = form?.match(/name="itemId"\s+value="(\d+)"/)?.[1];

  if (!id || !itemId) {
    console.log("FAIL: не нашёл форму ответа");
    process.exitCode = 1;
    return;
  }

  const body = new FormData();
  body.set("token", TOKEN);
  body.set("itemId", itemId);
  body.set("answer", MARKER);
  body.set(`$ACTION_ID_${id}`, "");

  // Попытка с чужого Origin.
  const evil = await fetch(`${BASE}/work/${TOKEN}`, {
    method: "POST",
    body,
    headers: { origin: "https://evil.example" },
    redirect: "manual",
  });
  console.log("чужой Origin ->", evil.status);

  const after = await (await fetch(`${BASE}/work/${TOKEN}`)).text();
  if (after.includes(MARKER)) {
    console.log("FAIL: действие выполнилось с чужого Origin (нет CSRF-защиты)");
    process.exitCode = 1;
  } else {
    console.log("PASS: с чужого Origin действие не выполнилось");
  }
})();
