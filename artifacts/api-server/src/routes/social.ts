import { Router, type IRouter } from "express";
import { desc, eq, isNotNull, sql } from "drizzle-orm";
import { db, referralsTable, supportMessagesTable, usersTable } from "@workspace/db";
import { SendSupportMessageBody } from "@workspace/api-zod";
import { sendTelegramMessage } from "../lib/bot-api";
import { ADMIN_IDS, EXTRA_CHANCE_REFERRALS, startOfTashkentWeek } from "../lib/config";
import { rateLimit, requireTelegramUser } from "../middlewares/auth";
import { getUserOrThrow, referralLink } from "../services/users";
import { parseBody, userId } from "./me";

const router: IRouter = Router();

/** Public display name: first name + last initial; never phone or Telegram ID. */
function publicName(firstName: string, lastName: string | null, username: string | null): string {
  const initial = lastName ? ` ${lastName.slice(0, 1)}.` : "";
  return (firstName || username || "Player") + initial;
}

router.get("/leaderboard", requireTelegramUser, async (req, res) => {
  const period = req.query["period"] === "overall" ? "overall" : "weekly";
  const me = userId(req);
  const scoreExpr =
    period === "overall"
      ? sql<number>`${usersTable.points}`
      : sql<number>`coalesce((select sum(g.points_earned) from games g where g.user_id = ${usersTable.telegramId} and g.started_at >= ${startOfTashkentWeek().toISOString()}::timestamptz), 0)::int`;
  const ranked = db
    .select({
      telegramId: usersTable.telegramId,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      username: usersTable.username,
      photoUrl: usersTable.photoUrl,
      region: usersTable.region,
      level: usersTable.englishLevel,
      points: scoreExpr.as("score"),
    })
    .from(usersTable)
    .where(isNotNull(usersTable.onboardedAt))
    .as("ranked");
  const rows = await db
    .select({
      telegramId: ranked.telegramId,
      firstName: ranked.firstName,
      lastName: ranked.lastName,
      username: ranked.username,
      photoUrl: ranked.photoUrl,
      region: ranked.region,
      level: ranked.level,
      points: ranked.points,
      rank: sql<number>`(rank() over (order by ${ranked.points} desc))::int`,
    })
    .from(ranked)
    .orderBy(desc(ranked.points), ranked.telegramId);
  const toEntry = (row: (typeof rows)[number]) => ({
    rank: Number(row.rank),
    name: publicName(row.firstName, row.lastName, row.username),
    photoUrl: row.photoUrl,
    region: row.region,
    level: row.level,
    points: Number(row.points),
    isMe: row.telegramId === me,
  });
  const mine = rows.find((row) => row.telegramId === me);
  res.json({ period, entries: rows.slice(0, 50).map(toEntry), me: mine ? toEntry(mine) : null });
});

router.get("/referrals", requireTelegramUser, async (req, res) => {
  const user = await getUserOrThrow(userId(req));
  const items = await db
    .select({ firstName: usersTable.firstName, lastName: usersTable.lastName, username: usersTable.username, region: usersTable.region, joinedAt: referralsTable.createdAt })
    .from(referralsTable)
    .innerJoin(usersTable, eq(usersTable.telegramId, referralsTable.inviteeId))
    .where(eq(referralsTable.inviterId, user.telegramId))
    .orderBy(desc(referralsTable.createdAt));
  const total = items.length;
  res.json({
    link: await referralLink(user),
    count: total,
    target: EXTRA_CHANCE_REFERRALS,
    progress: total % EXTRA_CHANCE_REFERRALS,
    extraChancesEarned: Math.floor(total / EXTRA_CHANCE_REFERRALS),
    extraChances: user.extraChances,
    referrals: items.map((item) => ({ name: publicName(item.firstName, item.lastName, item.username), region: item.region, joinedAt: item.joinedAt.toISOString() })),
  });
});

router.get("/support", requireTelegramUser, async (req, res) => {
  const rows = await db
    .select()
    .from(supportMessagesTable)
    .where(eq(supportMessagesTable.telegramId, userId(req)))
    .orderBy(desc(supportMessagesTable.createdAt))
    .limit(30);
  res.json(rows.map((row) => ({ id: row.id, message: row.message, status: row.status, createdAt: row.createdAt.toISOString() })));
});

router.post("/support", requireTelegramUser, rateLimit("support", 5, 10 * 60_000), async (req, res) => {
  const body = parseBody(SendSupportMessageBody, req.body);
  const user = await getUserOrThrow(userId(req));
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const [row] = await db
    .insert(supportMessagesTable)
    .values({ telegramId: user.telegramId, userName: name, phone: user.phoneNumber, message: body.message.trim() })
    .returning();
  const text = [
    "ISHLISH PERSONS — yangi support xabari",
    `Ism: ${name}${user.username ? ` (@${user.username})` : ""}`,
    `Telegram ID: ${user.telegramId}`,
    `Telefon: ${user.phoneNumber ?? "—"}`,
    `Hudud: ${user.region ?? "—"}`,
    "",
    body.message.trim(),
  ].join("\n");
  const results = await Promise.all(ADMIN_IDS.map((id) => sendTelegramMessage(id, text)));
  if (results.some(Boolean)) {
    await db.update(supportMessagesTable).set({ forwarded: true }).where(eq(supportMessagesTable.id, row!.id));
  }
  res.json({ id: row!.id, message: row!.message, status: row!.status, createdAt: row!.createdAt.toISOString() });
});

export default router;
