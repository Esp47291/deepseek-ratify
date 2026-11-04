// Проверка приёмки позиции владельцем через серверное действие.
const crypto = require("node:crypto");
const BASE = process.env.BASE_URL || "http://127.0.0.1:3100";
const SECRET = process.env.SESSION_SECRET || "qwerty12345";

const cookie = () => {
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

const money = (text) => {
  const accepted = /Принято (\d+) \/ (\d+)/.exec(text);
  const margin = /Маржа ([\d\s\u00a0]+) ₽/.exec(text);
  return {
    accepted: accepted ? `${accepted[1]}/${accepted[2]}` : "?",
    margin: margin ? margin[1].replace(/\s/g, "") : "?",
  };
};

(async () => {
  const auth = cookie();
  const html = await (await fetch(`${BASE}/admin/tasks/1`, { headers: { cookie: auth } })).text();
  const before = visible(html);

  const acceptForm = html
    .split("<form")
    .find((f) => f.includes('name="decision"') && f.includes('value="accept"'));

  if (!acceptForm) {
    console.log("FAIL: форма приёмки не найдена");
    process.exitCode = 1;
    return;
  }

  const id = acceptForm.match(/\$ACTION_ID_([a-f0-9]+)/)?.[1];
  const itemId = acceptForm.match(/name="itemId"\s+value="(\d+)"/)?.[1];

  console.log("до:", JSON.stringify(money(before)));

  const body = new FormData();
  body.set("itemId", itemId);
  body.set("decision", "accept");
  body.set(`$ACTION_ID_${id}`, "");

  const res = await fetch(`${BASE}/admin/tasks/1`, {
    method: "POST",
    body,
    headers: { cookie: auth },
    redirect: "manual",
  });
  console.log("POST приёмки:", res.status);

  const after = visible(
    await (await fetch(`${BASE}/admin/tasks/1`, { headers: { cookie: auth } })).text()
  );
  console.log("после:", JSON.stringify(money(after)));

  const b = money(before);
  const a = money(after);

  if (b.accepted !== a.accepted) {
    console.log(`PASS: счётчик принятых изменился ${b.accepted} -> ${a.accepted}`);
  } else {
    console.log("FAIL: приёмка не изменила счётчик");
    process.exitCode = 1;
  }

  if (b.margin !== a.margin) {
    console.log(`PASS: маржа пересчиталась ${b.margin} -> ${a.margin}`);
  } else {
    console.log("FAIL: маржа не пересчиталась");
    process.exitCode = 1;
  }
})();
