"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_COOKIE,
  SESSION_MAX_AGE,
  adminPassword,
  checkAdminPassword,
  createSessionValue,
} from "@/lib/auth";
import {
  loginAllowed,
  pruneLoginBuckets,
  registerFailedLogin,
  registerSuccessfulLogin,
} from "@/lib/login-guard";

async function clientKey(): Promise<string> {
  const store = await headers();
  const forwarded = store.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || store.get("x-real-ip") || "local";
  return ip;
}

export async function loginAction(formData: FormData): Promise<void> {
  const password = String(formData.get("password") ?? "");

  // Без этих двух переменных войти нельзя — говорим прямо, а не роняем 500.
  if (!adminPassword() || !process.env.SESSION_SECRET) {
    redirect("/admin/login?error=config");
  }

  const key = await clientKey();
  if (!loginAllowed(key)) {
    redirect("/admin/login?error=slow");
  }

  if (!checkAdminPassword(password)) {
    registerFailedLogin(key);
    redirect("/admin/login?error=1");
  }

  registerSuccessfulLogin(key);
  pruneLoginBuckets();

  const store = await cookies();
  store.set(ADMIN_COOKIE, createSessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  redirect("/admin/login");
}
