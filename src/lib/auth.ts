import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const ADMIN_COOKIE = "ratify_admin";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) {
    throw new Error("SESSION_SECRET is required for the platform");
  }
  return value;
}

export function adminPassword(): string | null {
  const value = process.env.ADMIN_PASSWORD;
  return value && value.trim() ? value : null;
}

/** Случайный токен для ссылки-приглашения. */
export function newToken(bytes = 24): string {
  return randomBytes(bytes).toString("hex");
}

/** HMAC-подпись значения; одинаковый вход даёт одинаковую подпись. */
export function signValue(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

/** Сравнение без утечки по времени — для пароля и подписи. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function checkAdminPassword(input: string): boolean {
  const expected = adminPassword();
  if (!expected) return false;
  return safeEqual(input, expected);
}

/** Значение cookie: "<expiresAt>.<signature>". */
export function createSessionValue(): string {
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  const payload = `admin.${expiresAt}`;
  return `${expiresAt}.${signValue(payload)}`;
}

export function verifySessionValue(value: string | undefined): boolean {
  if (!value) return false;
  const separator = value.indexOf(".");
  if (separator <= 0) return false;

  const expiresRaw = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  return safeEqual(signature, signValue(`admin.${expiresAt}`));
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifySessionValue(store.get(ADMIN_COOKIE)?.value);
}

/**
 * Гейт для каждой защищённой страницы.
 *
 * Одного редиректа в layout мало: layout не перезапускается при клиентской
 * навигации внутри сегмента, а данные страницы при этом читаются заново.
 */
export async function ensureAdmin(): Promise<void> {
  if (!(await isAdmin())) {
    redirect("/admin/login");
  }
}

export const SESSION_MAX_AGE = SESSION_TTL_SECONDS;
