/**
 * Обёртка вокруг запросов к БД.
 *
 * Два разных случая, которые нельзя смешивать:
 *
 * 1. `DATABASE_URL` не задан — это локальный предпросмотр без базы.
 *    Возвращаем пустой результат, чтобы кабинеты показывали пустое состояние,
 *    а не падали с 500.
 * 2. База настроена, но запрос упал — это настоящая авария (схема разъехалась,
 *    база недоступна). Прятать её за «нет данных» нельзя: владелец будет
 *    смотреть на пустой экран и думать, что работы нет. Пробрасываем ошибку.
 */
export async function guard<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  const configured = Boolean(process.env.DATABASE_URL);

  try {
    return await fn();
  } catch (error) {
    console.error("DB query failed:", error);

    if (!configured) {
      return fallback;
    }

    throw error;
  }
}
