// Проверка записи через серверное действие и защиты принятых позиций.
const BASE = process.env.BASE_URL || "http://127.0.0.1:3100";
const TOKEN = "workertoken0001";
const NEW_ANSWER = "Спасибо за отзыв! Рады, что всё прошло быстро и спокойно.";

function visible(html) {
  const cut = html.indexOf("self.__next_f");
  return (cut === -1 ? html : html.slice(0, cut))
    .replace(/<!--.*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Все формы сохранения ответа: id действия, позиция, текущий текст, признак «принято». */
function answerForms(html) {
  return html
    .split("<form")
    .slice(1)
    .filter((f) => f.includes('name="itemId"') && f.includes('name="answer"'))
    .map((f) => {
      const id = f.match(/\$ACTION_ID_([a-f0-9]+)/)?.[1];
      const itemId = f.match(/name="itemId"\s+value="(\d+)"/)?.[1];
      const token = f.match(/name="token"\s+value="([^"]+)"/)?.[1] ?? TOKEN;
      // Именно атрибут, а не CSS-класс disabled:bg-... — на этом легко ошибиться.
      const disabled = /<textarea[^>]*\sdisabled=""/.test(f);
      const text = (f.match(/<textarea[^>]*>([\s\S]*?)<\/textarea>/) || [])[1] || "";
      return { id, itemId, token, disabled, text: text.trim() };
    })
    .filter((f) => f.id && f.itemId);
}

async function save(form, answer) {
  const body = new FormData();
  body.set("token", form.token);
  body.set("itemId", form.itemId);
  body.set("answer", answer);
  body.set(`$ACTION_ID_${form.id}`, "");
  return fetch(`${BASE}/work/${TOKEN}`, { method: "POST", body, redirect: "manual" });
}

(async () => {
  const html = await (await fetch(`${BASE}/work/${TOKEN}`)).text();
  const forms = answerForms(html);
  console.log(`форм сохранения: ${forms.length}`);

  const locked = forms.find((f) => f.disabled);
  const open = forms.find((f) => !f.disabled && f.text === "");

  let failed = 0;

  // 1. Принятую позицию переписать нельзя.
  if (locked) {
    const before = locked.text;
    await save(locked, "ПОПЫТКА ПЕРЕПИСАТЬ ПРИНЯТЫЙ ОТВЕТ");
    const after = visible(await (await fetch(`${BASE}/work/${TOKEN}`)).text());

    if (!after.includes("ПОПЫТКА ПЕРЕПИСАТЬ ПРИНЯТЫЙ ОТВЕТ") && after.includes(before.slice(0, 40))) {
      console.log("PASS: принятую позицию переписать нельзя");
    } else {
      console.log("FAIL: принятый ответ удалось изменить");
      failed++;
    }
  } else {
    console.log("NIT: нет принятых позиций для проверки блокировки");
  }

  // 2. Пустую позицию заполнить можно.
  if (!open) {
    console.log("NIT: нет пустой позиции для проверки записи");
  } else {
    await save(open, NEW_ANSWER);
    const after = visible(await (await fetch(`${BASE}/work/${TOKEN}`)).text());

    if (after.includes(NEW_ANSWER)) {
      console.log("PASS: ответ сохранён и виден в кабинете исполнителя");
    } else {
      console.log("FAIL: ответ не появился после сохранения");
      failed++;
    }

    const left = /Заполните все ответы \((\d)\/6\)/.exec(after)?.[1];
    if (left === "6" || left === undefined) {
      console.log("PASS: счётчик ответов обновился до 6/6");
    } else {
      console.log(`FAIL: счётчик показывает ${left}/6`);
      failed++;
    }
  }

  process.exitCode = failed === 0 ? 0 : 1;
})();
