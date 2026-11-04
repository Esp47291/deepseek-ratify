// Браузерная проверка чата и биржи через Chrome DevTools Protocol.
const BASE = process.env.BASE_URL || "http://127.0.0.1:3100";
const CDP = "http://127.0.0.1:9334";

let id = 0;
const pending = new Map();

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => resolve(ws);
    ws.onerror = (e) => reject(new Error("ws error"));
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve: res, reject: rej } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
      }
    };
  });
}

function send(ws, method, params = {}) {
  const msgId = ++id;
  return new Promise((resolve, reject) => {
    pending.set(msgId, { resolve, reject });
    ws.send(JSON.stringify({ id: msgId, method, params }));
    setTimeout(() => {
      if (pending.has(msgId)) {
        pending.delete(msgId);
        reject(new Error(`${method} timed out`));
      }
    }, 30000);
  });
}

async function evaluate(ws, expression) {
  const res = await send(ws, "Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (res.exceptionDetails) {
    throw new Error(res.exceptionDetails.text + " " + (res.exceptionDetails.exception?.description ?? ""));
  }
  return res.result.value;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function openTab(url) {
  const res = await fetch(`${CDP}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" });
  const tab = await res.json();
  const ws = await connect(tab.webSocketDebuggerUrl);
  await send(ws, "Network.enable");
  await send(ws, "Network.clearBrowserCookies");
  await send(ws, "Page.enable");
  await send(ws, "Page.navigate", { url });
  await sleep(1800);
  return { ws, id: tab.id };
}

let failures = 0;
function check(name, ok, extra = "") {
  if (ok) console.log(`PASS ${name}`);
  else {
    failures++;
    console.log(`FAIL ${name} ${extra}`);
  }
}

/** Открыть свёрнутые блоки (details) и найти поле чата. */
async function expandChat(ws) {
  await evaluate(ws, `(() => {
    for (const d of document.querySelectorAll('details')) d.open = true;
    return true;
  })()`);
  await sleep(300);
}

/** Отправить сообщение в чат через настоящий браузерный ввод.
 *  targetTaskId — какое именно задание, если на странице их несколько. */
async function sendChatMessage(ws, marker, targetTaskId = null) {
  await expandChat(ws);
  await evaluate(ws, `(() => {
    const areas = [...document.querySelectorAll('textarea[name="body"]')];
    const target = ${targetTaskId === null ? "null" : targetTaskId};
    const area = target === null
      ? areas[0]
      : areas.find(a => a.closest('form').querySelector('input[name="taskId"]')?.value === String(target));
    if (!area) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setter.call(area, ${JSON.stringify(marker)});
    area.dispatchEvent(new Event('input', { bubbles: true }));
    area.closest('form').requestSubmit();
    return true;
  })()`);
}

(async () => {
  // ---------- Исполнитель: чат и услуги ----------
  const work = await openTab(`${BASE}/work/workertoken0001`);

  const chatBefore = await evaluate(work.ws, `(() => {
    const text = document.body.innerText;
    return {
      hasChat: text.includes('Чат по заданию'),
      hasSeedMessage: text.includes('можно ли предложить повторный приём'),
      hasServices: text.includes('Мои услуги на бирже'),
      hasSeedService: text.includes('Ответы на отзывы в Яндекс.Картах'),
      textareas: document.querySelectorAll('textarea[name="body"]').length
    };
  })()`);
  check("чат отрендерен у исполнителя", chatBefore.hasChat && chatBefore.textareas > 0, JSON.stringify(chatBefore));
  check("сообщения из базы видны", chatBefore.hasSeedMessage);
  check("услуги на бирже видны исполнителю", chatBefore.hasServices && chatBefore.hasSeedService);

  const workerMarker = "БРАУЗЕР-ИСПОЛНИТЕЛЬ-СООБЩЕНИЕ";
  await sendChatMessage(work.ws, workerMarker, 1);
  await sleep(2500);
  const workerSent = await evaluate(work.ws, `document.body.innerText.includes(${JSON.stringify(workerMarker)})`);
  check("исполнитель отправил сообщение из браузера", workerSent);

  // ---------- Заказчик: видит сообщение исполнителя ----------
  const client = await openTab(`${BASE}/r/clienttoken0001`);
  await expandChat(client.ws);
  const clientView = await evaluate(client.ws, `(() => {
    const text = document.body.innerText;
    return { seesWorker: text.includes(${JSON.stringify(workerMarker)}), hasChat: text.includes('Чат по заданию') };
  })()`);
  check("заказчик видит сообщение исполнителя", clientView.seesWorker && clientView.hasChat);

  const clientMarker = "БРАУЗЕР-ЗАКАЗЧИК-СООБЩЕНИЕ";
  await sendChatMessage(client.ws, clientMarker, 1);
  await sleep(2500);
  await expandChat(client.ws);
  const clientSent = await evaluate(client.ws, `document.body.innerText.includes(${JSON.stringify(clientMarker)})`);
  check("заказчик отправил сообщение из браузера", clientSent);

  // ---------- Владелец: видит всю переписку ----------
  const login = await openTab(`${BASE}/admin/login`);
  await evaluate(login.ws, `(() => {
    const input = document.querySelector('input[name="password"]');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'qwerty12345');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.closest('form').requestSubmit();
    return true;
  })()`);
  await sleep(2500);

  await send(login.ws, "Page.navigate", { url: `${BASE}/admin/tasks/1` });
  await sleep(2000);

  const ownerView = await evaluate(login.ws, `(() => {
    const text = document.body.innerText;
    return {
      seesWorker: text.includes(${JSON.stringify(workerMarker)}),
      seesClient: text.includes(${JSON.stringify(clientMarker)}),
      hasChat: text.includes('Чат по заданию')
    };
  })()`);
  check(
    "владелец видит переписку обеих сторон",
    ownerView.seesWorker && ownerView.seesClient && ownerView.hasChat,
    JSON.stringify(ownerView)
  );

  // ---------- Мобильная ширина: чат не ломает вёрстку ----------
  await send(work.ws, "Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await sleep(800);
  const mobile = await evaluate(work.ws, `({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth
  })`);
  check(
    "чат не ломает вёрстку на 390 px",
    mobile.scrollWidth <= mobile.innerWidth + 1,
    JSON.stringify(mobile)
  );

  await fetch(`${CDP}/json/close/${work.id}`).catch(() => {});
  await fetch(`${CDP}/json/close/${client.id}`).catch(() => {});
  await fetch(`${CDP}/json/close/${login.id}`).catch(() => {});

  console.log(failures === 0 ? "\nбраузер: чат и биржа работают" : `\nпровалов: ${failures}`);
  process.exitCode = failures === 0 ? 0 : 1;
})();
