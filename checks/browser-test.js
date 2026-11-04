// Браузерная проверка через Chrome DevTools Protocol: настоящие клики и ввод.
// Нужен запущенный Chrome с --remote-debugging-port=9222.
const BASE = process.env.BASE_URL || "http://127.0.0.1:3100";
const CDP = "http://127.0.0.1:9333";

let id = 0;
const pending = new Map();

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => resolve(ws);
    ws.onerror = (e) => reject(new Error("ws error: " + e.message));
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
  // Пустая вкладка, чтобы очистить cookie до навигации: иначе Chrome
  // со своей сессией сразу уводит /admin/login на /admin.
  const res = await fetch(`${CDP}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" });
  const tab = await res.json();
  const wsUrl = tab.webSocketDebuggerUrl;

  const ws = await connect(wsUrl);
  await send(ws, "Network.enable");
  await send(ws, "Network.clearBrowserCookies");
  await send(ws, "Page.enable");
  await send(ws, "Page.navigate", { url });
  ws.close();

  return { wsUrl, id: tab.id };
}

async function closeTab(tabId) {
  await fetch(`${CDP}/json/close/${tabId}`).catch(() => {});
}

let failures = 0;
function check(name, ok, extra = "") {
  if (ok) console.log(`PASS ${name}`);
  else {
    failures++;
    console.log(`FAIL ${name} ${extra}`);
  }
}

(async () => {
  // ---------- 1. Вход через форму ----------
  const login = await openTab(`${BASE}/admin/login`);
  const ws = await connect(login.wsUrl);
  await send(ws, "Page.enable");
  await send(ws, "Runtime.enable");
  await sleep(1500);

  const loginInfo = await evaluate(ws, `(() => {
    const input = document.querySelector('input[name="password"]');
    const form = input && input.closest('form');
    return { input: !!input, form: !!form, title: document.title };
  })()`);
  check("форма входа отрендерена", loginInfo.input && loginInfo.form, JSON.stringify(loginInfo));

  await evaluate(ws, `(() => {
    const input = document.querySelector('input[name="password"]');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'qwerty12345');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.closest('form').requestSubmit();
    return true;
  })()`);

  // Ждём навигации после server action.
  let adminOk = false;
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    const state = await evaluate(ws, `({
      url: location.pathname,
      text: document.body.innerText.slice(0, 400)
    })`).catch(() => null);
    if (state && state.url.startsWith("/admin") && state.text.includes("Заказчики")) {
      adminOk = true;
      break;
    }
  }
  check("вход по паролю открывает кабинет в браузере", adminOk);

  // ---------- 2. Взятие задания исполнителем ----------
  const work = await openTab(`${BASE}/work/workertoken0002`);
  const ws2 = await connect(work.wsUrl);
  await send(ws2, "Runtime.enable");
  await sleep(1500);

  const beforeTake = await evaluate(ws2, `(() => {
    const buttons = [...document.querySelectorAll('button')];
    const take = buttons.find(b => b.textContent.includes('Взять задание'));
    return { hasTake: !!take, hasRelease: document.body.innerText.includes('Отказаться от задания') };
  })()`);
  check("исполнитель видит свободное задание", beforeTake.hasTake, JSON.stringify(beforeTake));

  if (beforeTake.hasTake) {
    await evaluate(ws2, `(() => {
      const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Взять задание'));
      btn.closest('form').requestSubmit();
      return true;
    })()`);

    let taken = false;
    for (let i = 0; i < 40; i++) {
      await sleep(500);
      const state = await evaluate(ws2, `({
        text: document.body.innerText,
        textareas: document.querySelectorAll('textarea').length
      })`).catch(() => null);
      if (state && state.text.includes("Отказаться от задания") && state.textareas > 0) {
        taken = true;
        break;
      }
    }
    check("клик «Взять задание» открывает тексты отзывов", taken);
  }

  // ---------- 3. Отчёт заказчика ----------
  const report = await openTab(`${BASE}/r/clienttoken0001/report`);
  const ws3 = await connect(report.wsUrl);
  await send(ws3, "Runtime.enable");
  await sleep(1500);

  const reportInfo = await evaluate(ws3, `(() => {
    const text = document.body.innerText;
    return {
      hasBranch: text.includes('Филиал 1'),
      hasAnswer: text.includes('Ответ:'),
      hasPrint: text.includes('Скачать / распечатать'),
      width: document.documentElement.scrollWidth,
      viewport: window.innerWidth
    };
  })()`);
  check("отчёт содержит филиал и ответы", reportInfo.hasBranch && reportInfo.hasAnswer, JSON.stringify(reportInfo));
  check("кнопка печати на месте", reportInfo.hasPrint);

  // мобильная ширина — проверка горизонтального переполнения
  await send(ws3, "Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await sleep(800);
  const mobile = await evaluate(ws3, `({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth
  })`);
  check(
    "на мобильной ширине нет горизонтального скролла",
    mobile.scrollWidth <= mobile.innerWidth + 1,
    JSON.stringify(mobile)
  );

  await closeTab(login.id);
  await closeTab(work.id);
  await closeTab(report.id);

  console.log(failures === 0 ? "\nбраузерные проверки пройдены" : `\nпровалов: ${failures}`);
  process.exitCode = failures === 0 ? 0 : 1;
})();
