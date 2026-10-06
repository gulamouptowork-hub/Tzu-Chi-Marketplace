const DAY = 86_400_000;
const TAIPEI_OFFSET = 8 * 60 * 60 * 1000;
export type ExchangeTimeError =
  | "EXCHANGE_TIME_INVALID"
  | "EXCHANGE_TIME_PAST"
  | "EXCHANGE_TIME_TOO_FAR"
  | "EXCHANGE_TIME_HOURS";

export function taipeiDateTimeInput(date: Date): string {
  return new Date(date.getTime() + TAIPEI_OFFSET).toISOString().slice(0, 16);
}

export function parseTaipeiDateTime(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(value + ":00+08:00");
  if (!Number.isFinite(date.getTime()) || taipeiDateTimeInput(date) !== value)
    return null;
  return date;
}

export function exchangeTimeError(
  date: Date | null,
  now = new Date(),
): ExchangeTimeError | null {
  if (!date || !Number.isFinite(date.getTime())) return "EXCHANGE_TIME_INVALID";
  if (date.getTime() <= now.getTime()) return "EXCHANGE_TIME_PAST";
  if (date.getTime() > now.getTime() + 90 * DAY) return "EXCHANGE_TIME_TOO_FAR";
  const taipeiHour = new Date(date.getTime() + TAIPEI_OFFSET).getUTCHours();
  if (taipeiHour < 8 || taipeiHour >= 19) return "EXCHANGE_TIME_HOURS";
  return null;
}

export function exchangeTimeBounds(now = new Date()) {
  return {
    min: taipeiDateTimeInput(
      new Date((Math.floor(now.getTime() / 60000) + 1) * 60000),
    ),
    max: taipeiDateTimeInput(new Date(now.getTime() + 90 * DAY)),
  };
}
