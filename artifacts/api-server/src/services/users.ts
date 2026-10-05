import { and, count, eq, gt, isNotNull, max, sql } from "drizzle-orm";
import {
  basicAttemptsTable,
  db,
  proAttemptsTable,
  referralsTable,
  usersTable,
  type User,
} from "@workspace/db";
import { getBotUsername, sendTelegramMessage } from "../lib/bot-api";
import { EXTRA_CHANCE_REFERRALS, isAdminId, REFERRAL_REWARD_POINTS } from "../lib/config";
import { HttpError } from "../lib/http-error";
import { verifyReferralSignature, type TelegramUser } from "../lib/telegram-auth";
import { logger } from "../lib/logger";

export function displayName(user: Pick<User, "firstName" | "lastName" | "username">): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || (user.username ? `@${user.username}` : "Player");
}

export function isOnboarded(user: User): boolean {
  return Boolean(user.onboardedAt && user.phoneNumber && user.region);
}

function parseInviter(value: string | null | undefined): number | null {
  const match = /^ref_(\d{1,15})$/.exec(value ?? "") ?? /^(\d{1,15})$/.exec(value ?? "");
  const id = match ? Number(match[1]) : NaN;
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/**
 * Create or refresh the user from validated Telegram data. A referral is only
 * attached when this call creates the row (a genuinely new user) and the
 * inviter came from a signed source (initData start_param or bot-signed URL).
 */
export async function ensureUser(
  tg: TelegramUser,
  signedStartParam: string | null,
  ref?: string,
  refSig?: string,
): Promise<User> {
  const profile = {
    username: tg.username ?? null,
    firstName: (tg.first_name ?? "").slice(0, 64),
    lastName: tg.last_name?.slice(0, 64) ?? null,
    photoUrl: tg.photo_url ?? null,
  };
  const existing = await db.query.usersTable.findFirst({ where: eq(usersTable.telegramId, tg.id) });
  if (existing) {
    const [updated] = await db
      .update(usersTable)
      .set({ ...profile, lastActive: new Date() })
      .where(eq(usersTable.telegramId, tg.id))
      .returning();
    return updated!;
  }

  let inviter = parseInviter(signedStartParam);
  if (!inviter && ref && refSig) {
    const candidate = parseInviter(ref);
    if (candidate && verifyReferralSignature(candidate, tg.id, refSig, process.env["TEST_TOKEN"] ?? "")) {
      inviter = candidate;
    }
  }
  if (inviter === tg.id) inviter = null;
  if (inviter) {
    const inviterRow = await db.query.usersTable.findFirst({ where: eq(usersTable.telegramId, inviter) });
    if (!inviterRow) inviter = null;
  }

  const inserted = await db
    .insert(usersTable)
    .values({
      telegramId: tg.id,
      ...profile,
      referralCode: `ref_${tg.id}`,
      referredBy: inviter,
      language: tg.language_code === "en" ? "en" : "uz",
    })
    .onConflictDoNothing()
    .returning();
  if (inserted[0]) return inserted[0];
  const row = await db.query.usersTable.findFirst({ where: eq(usersTable.telegramId, tg.id) });
  if (!row) throw new HttpError(500, "Could not create user");
  return row;
}

export async function getUserOrThrow(id: number): Promise<User> {
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.telegramId, id) });
  if (!user) throw new HttpError(401, "Session not found. Reopen the Mini App.", "NO_SESSION");
  return user;
}

export async function referralLink(user: User): Promise<string | null> {
  const username = await getBotUsername();
  return username ? `https://t.me/${username}?start=${user.referralCode}` : null;
}

export async function buildMe(user: User) {
  const [basic] = await db
    .select({ n: count(), best: max(basicAttemptsTable.percentage) })
    .from(basicAttemptsTable)
    .where(eq(basicAttemptsTable.userId, user.telegramId));
  const [pro] = await db
    .select({ n: count(), best: max(proAttemptsTable.percentage) })
    .from(proAttemptsTable)
    .where(eq(proAttemptsTable.userId, user.telegramId));
  const [refs] = await db
    .select({ n: count() })
    .from(referralsTable)
    .where(eq(referralsTable.inviterId, user.telegramId));
  let rank: number | null = null;
  if (isOnboarded(user)) {
    const [ahead] = await db
      .select({ n: count() })
      .from(usersTable)
      .where(and(isNotNull(usersTable.onboardedAt), gt(usersTable.points, user.points)));
    rank = Number(ahead?.n ?? 0) + 1;
  }
  return {
    telegramId: user.telegramId,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    photoUrl: user.photoUrl,
    phoneNumber: user.phoneNumber,
    phoneVerified: user.phoneVerified,
    region: user.region,
    language: user.language === "en" ? ("en" as const) : ("uz" as const),
    englishLevel: user.englishLevel,
    points: user.points,
    proHearts: user.proHearts,
    extraChances: user.extraChances,
    isAdmin: isAdminId(user.telegramId),
    onboardingComplete: isOnboarded(user),
    referralLink: await referralLink(user),
    registrationDate: user.registrationDate.toISOString(),
    stats: {
      basicTests: Number(basic?.n ?? 0),
      proAttempts: Number(pro?.n ?? 0),
      bestBasicPercentage: Number(basic?.best ?? 0),
      bestProPercentage: Number(pro?.best ?? 0),
      referrals: Number(refs?.n ?? 0),
      rank,
    },
  };
}

/**
 * Mark onboarding complete once phone and region exist, and credit the
 * inviter exactly once (unique invitee) inside one transaction.
 */
export async function completeOnboardingIfReady(userId: number): Promise<void> {
  const notify = await db.transaction(async (tx) => {
    const [user] = await tx
      .select()
      .from(usersTable)
      .where(eq(usersTable.telegramId, userId))
      .for("update");
    if (!user || user.onboardedAt || !user.phoneNumber || !user.region) return null;
    await tx.update(usersTable).set({ onboardedAt: new Date() }).where(eq(usersTable.telegramId, userId));
    if (!user.referredBy || user.referredBy === userId) return null;
    const created = await tx
      .insert(referralsTable)
      .values({ inviterId: user.referredBy, inviteeId: userId, rewardPoints: REFERRAL_REWARD_POINTS })
      .onConflictDoNothing()
      .returning();
    if (!created[0]) return null;
    const [{ n }] = (await tx
      .select({ n: count() })
      .from(referralsTable)
      .where(eq(referralsTable.inviterId, user.referredBy))) as [{ n: number }];
    const earnedChance = Number(n) % EXTRA_CHANCE_REFERRALS === 0;
    const [inviter] = await tx
      .update(usersTable)
      .set({
        points: sql`${usersTable.points} + ${REFERRAL_REWARD_POINTS}`,
        extraChances: earnedChance ? sql`${usersTable.extraChances} + 1` : usersTable.extraChances,
      })
      .where(eq(usersTable.telegramId, user.referredBy))
      .returning();
    return inviter ? { inviter, friend: displayName(user), earnedChance, total: Number(n) } : null;
  });
  if (!notify) return;
  const { inviter, friend, earnedChance, total } = notify;
  const progress = total % EXTRA_CHANCE_REFERRALS || (earnedChance ? EXTRA_CHANCE_REFERRALS : 0);
  const text =
    inviter.language === "en"
      ? `${friend} joined ISHLISH PERSONS with your link. +${REFERRAL_REWARD_POINTS} points. Progress: ${progress}/${EXTRA_CHANCE_REFERRALS}.` +
        (earnedChance ? " You earned 1 extra PRO chance!" : "")
      : `${friend} sizning havolangiz orqali ISHLISH PERSONS'ga qo'shildi. +${REFERRAL_REWARD_POINTS} ball. Natija: ${progress}/${EXTRA_CHANCE_REFERRALS}.` +
        (earnedChance ? " Sizga 1 ta qo'shimcha PRO imkoniyat berildi!" : "");
  sendTelegramMessage(inviter.telegramId, text).catch((err) => logger.warn({ err }, "notify failed"));
}
