import { isCompletePhone, normalizePhoneDigits } from "@/lib/phone";
import { normalizeCompanyUrl } from "@/lib/url";

export interface LeadInput {
  name: string;
  phone: string;
  email?: string;
  companyUrl?: string;
  service?: string;
  message?: string;
  type: "order" | "contact" | "calculator" | "exit_intent";
}

/** Returns an error message for the form, or null when the lead was accepted. */
export async function submitLead(input: LeadInput): Promise<string | null> {
  if (!input.name.trim() || !input.phone) return "Заполните имя и телефон";
  if (!isCompletePhone(input.phone)) return "Введите номер полностью: +7 (999) 123-45-67";

  try {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...input,
        companyUrl: input.companyUrl ? normalizeCompanyUrl(input.companyUrl) : undefined,
        phone: `+${normalizePhoneDigits(input.phone)}`,
      }),
    });
    return res.ok ? null : "Не удалось отправить заявку. Попробуйте ещё раз или напишите нам в Telegram.";
  } catch {
    return "Нет соединения. Проверьте интернет и отправьте ещё раз.";
  }
}
