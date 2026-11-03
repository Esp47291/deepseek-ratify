import http from "node:http";
import https from "node:https";
import tls from "node:tls";
import { URL } from "node:url";

export type LeadNotification = {
  id?: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  companyUrl?: string | null;
  service?: string | null;
  budget?: string | null;
  message?: string | null;
  type?: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  order: "Заявка",
  contact: "Форма контактов",
  calculator: "Калькулятор",
  exit_intent: "Остались вопросы",
};

const TELEGRAM_HOST = "api.telegram.org";
const REQUEST_TIMEOUT_MS = 45_000;
const MAX_ATTEMPTS = 3;

function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

function getProxyUrl(): string | undefined {
  const value =
    process.env.TELEGRAM_PROXY ||
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    process.env.https_proxy ||
    process.env.http_proxy;
  return value?.trim() || undefined;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function formatLeadMessage(lead: LeadNotification): string {
  const typeKey = lead.type || "order";
  const typeLabel = TYPE_LABELS[typeKey] || typeKey;
  const lines = [
    `<b>Новая заявка</b> · ${escapeHtml(typeLabel)}`,
    lead.id ? `ID: <code>${lead.id}</code>` : null,
    "",
    `<b>Имя:</b> ${escapeHtml(lead.name)}`,
    lead.phone ? `<b>Телефон:</b> ${escapeHtml(lead.phone)}` : null,
    lead.email ? `<b>Email:</b> ${escapeHtml(lead.email)}` : null,
    lead.companyUrl ? `<b>Сайт:</b> ${escapeHtml(lead.companyUrl)}` : null,
    lead.service ? `<b>Услуга:</b> ${escapeHtml(lead.service)}` : null,
    lead.budget ? `<b>Бюджет:</b> ${escapeHtml(lead.budget)}` : null,
    lead.message ? `<b>Сообщение:</b>\n${escapeHtml(lead.message)}` : null,
  ];

  return lines.filter((line) => line !== null).join("\n");
}

type TelegramHttpResult = {
  ok: boolean;
  status: number;
  body: string;
};

function readHttpResponse(
  socket: NodeJS.ReadableStream,
  resolve: (value: TelegramHttpResult) => void,
  reject: (reason?: unknown) => void
) {
  const chunks: Buffer[] = [];
  socket.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  socket.on("end", () => {
    const raw = Buffer.concat(chunks).toString("utf8");
    const separator = raw.indexOf("\r\n\r\n");
    if (separator === -1) {
      reject(new Error("Invalid HTTP response from Telegram"));
      return;
    }

    const headerText = raw.slice(0, separator);
    const body = raw.slice(separator + 4);
    const statusLine = headerText.split("\r\n")[0] || "";
    const status = Number(statusLine.split(" ")[1] || 0);

    resolve({
      ok: status >= 200 && status < 300,
      status,
      body,
    });
  });
  socket.on("error", reject);
}

function postTelegramJson(path: string, payload: unknown): Promise<TelegramHttpResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN!;
  const body = Buffer.from(JSON.stringify(payload), "utf8");
  const requestPath = `/bot${token}${path}`;
  const proxyUrl = getProxyUrl();

  if (proxyUrl) {
    return postTelegramViaProxy(proxyUrl, requestPath, body);
  }

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: TELEGRAM_HOST,
        path: requestPath,
        method: "POST",
        servername: TELEGRAM_HOST,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": body.length,
          Host: TELEGRAM_HOST,
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const status = res.statusCode ?? 0;
          resolve({
            ok: status >= 200 && status < 300,
            status,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      }
    );

    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error(`Telegram request timed out after ${REQUEST_TIMEOUT_MS}ms`));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function postTelegramViaProxy(
  proxyUrl: string,
  requestPath: string,
  body: Buffer
): Promise<TelegramHttpResult> {
  const proxy = new URL(proxyUrl);

  return new Promise((resolve, reject) => {
    const connectReq = http.request({
      hostname: proxy.hostname,
      port: proxy.port || (proxy.protocol === "https:" ? 443 : 80),
      method: "CONNECT",
      path: `${TELEGRAM_HOST}:443`,
      headers: {
        Host: `${TELEGRAM_HOST}:443`,
      },
      timeout: REQUEST_TIMEOUT_MS,
    });

    connectReq.on("connect", (res, socket) => {
      if (res.statusCode !== 200) {
        socket.destroy();
        reject(new Error(`Proxy CONNECT failed with status ${res.statusCode}`));
        return;
      }

      const tlsSocket = tls.connect({
        socket,
        servername: TELEGRAM_HOST,
      });

      tlsSocket.setTimeout(REQUEST_TIMEOUT_MS, () => {
        tlsSocket.destroy(new Error(`Telegram request timed out after ${REQUEST_TIMEOUT_MS}ms`));
      });
      tlsSocket.on("error", reject);

      const headers = [
        `POST ${requestPath} HTTP/1.1`,
        `Host: ${TELEGRAM_HOST}`,
        "Content-Type: application/json",
        `Content-Length: ${body.length}`,
        "Connection: close",
        "",
        "",
      ].join("\r\n");

      tlsSocket.write(headers);
      tlsSocket.write(body);
      readHttpResponse(tlsSocket, resolve, reject);
    });

    connectReq.on("timeout", () => {
      connectReq.destroy(new Error(`Proxy CONNECT timed out after ${REQUEST_TIMEOUT_MS}ms`));
    });
    connectReq.on("error", reject);
    connectReq.end();
  });
}

async function sendTelegramMessage(text: string): Promise<TelegramHttpResult> {
  const chatId = process.env.TELEGRAM_CHAT_ID!;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await postTelegramJson("/sendMessage", {
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      });
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }

  throw lastError;
}

/**
 * Sends a lead notification to Telegram.
 * No-op if TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID are not set.
 * Never throws — failures are logged so the API can still succeed via DB.
 */
export async function notifyTelegramLead(lead: LeadNotification): Promise<boolean> {
  if (!isTelegramConfigured()) {
    return false;
  }

  try {
    const response = await sendTelegramMessage(formatLeadMessage(lead));

    if (!response.ok) {
      console.error("Telegram notify failed:", response.status, response.body);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Telegram notify error:", error);
    return false;
  }
}
