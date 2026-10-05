export const REGIONS = [
  "Toshkent shahri",
  "Toshkent viloyati",
  "Samarqand",
  "Buxoro",
  "Andijon",
  "Farg‘ona",
  "Namangan",
  "Qashqadaryo",
  "Surxondaryo",
  "Xorazm",
  "Navoiy",
  "Jizzax",
] as const;

export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type Level = (typeof LEVELS)[number];

function parseAdminIds(raw: string | undefined): number[] {
  const ids = (raw ?? "884336506")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isSafeInteger(value) && value > 0);
  return ids.length ? ids : [884336506];
}

export const ADMIN_IDS = parseAdminIds(process.env["ADMIN_TELEGRAM_IDS"]);
export const isAdminId = (id: number) => ADMIN_IDS.includes(id);

export const SUPPORT_PHONE = "917119966";
export const PRIZE_UZS = 1_000_000;
export const MAX_HEARTS = 2;
export const BASIC_QUESTION_COUNT = 20;
export const BASIC_POINTS_PER_CORRECT = 10;
export const BASIC_PASS_PERCENTAGE = 70;
export const PRO_POINTS_PER_CORRECT = 20;
export const PRO_WIN_BONUS = 200;
export const DAILY_FREE_PRO_GAMES = 1;
export const EXTRA_CHANCE_REFERRALS = 3;
export const REFERRAL_REWARD_POINTS = 50;
/** PRO survivor plan: questions drawn per CEFR level, in order. */
export const PRO_PLAN: Array<[Level, number]> = [
  ["B1", 4],
  ["B2", 5],
  ["C1", 6],
  ["C2", 5],
];
export const PRO_QUESTION_COUNT = PRO_PLAN.reduce((sum, [, n]) => sum + n, 0);
/** Server-side dynamic timer: games active in the last window decide the seconds. */
export const ACTIVE_WINDOW_MINUTES = 2;
export const TIMER_RULES = [
  { minActiveGames: 100, seconds: 5 },
  { minActiveGames: 25, seconds: 8 },
  { minActiveGames: 0, seconds: 12 },
];
/** Small grace for network latency when grading against expires_at. */
export const ANSWER_GRACE_MS = 1500;
export const AUTH_MAX_AGE_SECONDS = 24 * 60 * 60;
export const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

export function startOfTashkentDay(now = new Date()): Date {
  const shifted = new Date(now.getTime() + TASHKENT_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - TASHKENT_OFFSET_MS);
}

export function startOfTashkentWeek(now = new Date()): Date {
  const day = startOfTashkentDay(now);
  const weekday = new Date(day.getTime() + TASHKENT_OFFSET_MS).getUTCDay();
  const sinceMonday = (weekday + 6) % 7;
  return new Date(day.getTime() - sinceMonday * 86_400_000);
}
