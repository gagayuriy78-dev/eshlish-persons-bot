import { Router, type IRouter, type Request } from "express";
import { and, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { adminActionsTable, db, questionsTable, supportMessagesTable } from "@workspace/db";
import {
  CreateAdminQuestionBody,
  ListAdminQuestionsQueryParams,
  ListAdminUsersQueryParams,
  UpdateAdminSupportBody,
} from "@workspace/api-zod";
import { getBotUsername } from "../lib/bot-api";
import {
  ACTIVE_WINDOW_MINUTES,
  ADMIN_IDS,
  BASIC_QUESTION_COUNT,
  DAILY_FREE_PRO_GAMES,
  EXTRA_CHANCE_REFERRALS,
  MAX_HEARTS,
  PRIZE_UZS,
  PRO_QUESTION_COUNT,
  REFERRAL_REWARD_POINTS,
  SUPPORT_PHONE,
  TIMER_RULES,
} from "../lib/config";
import { HttpError } from "../lib/http-error";
import { requireAdmin } from "../middlewares/auth";
import { activeGamesNow, secondsForActivity } from "../services/games";
import { parseBody, userId } from "./me";

const router: IRouter = Router();
router.use("/admin", requireAdmin);

type Row = Record<string, unknown>;
const rows = async (query: SQL) => (await db.execute(query)).rows as Row[];
const num = (v: unknown) => Number(v ?? 0);
const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);
const str = (v: unknown) => (v === null || v === undefined ? null : String(v));

async function logAction(req: Request, action: string, targetType: string, targetId: string | number, details?: unknown) {
  await db.insert(adminActionsTable).values({ adminId: userId(req), action, targetType, targetId: String(targetId), details: details ?? null });
}

function idParam(req: Request, name: string): number {
  const id = Number(req.params[name]);
  if (!Number.isSafeInteger(id) || id <= 0) throw new HttpError(400, "Invalid id.", "INVALID_INPUT");
  return id;
}

function paging(page?: number, pageSize?: number) {
  const p = Math.max(1, page ?? 1);
  const size = Math.min(100, Math.max(1, pageSize ?? 25));
  return { page: p, pageSize: size, offset: (p - 1) * size };
}

router.get("/admin/stats", async (_req, res) => {
  const [totals] = await rows(sql`
    select
      (select count(*) from users) as total_users,
      (select count(*) from users where registration_date >= date_trunc('day', now() at time zone 'Asia/Tashkent') at time zone 'Asia/Tashkent') as new_today,
      (select count(*) from users where last_active >= now() - interval '24 hours') as active_users,
      (select count(distinct user_id) from games where mode = 'pro') as pro_users,
      (select count(distinct user_id) from games where mode = 'basic') as basic_users,
      (select count(*) from users where phone_number is not null) as phone_leads,
      (select count(*) from referrals) as referrals,
      (select count(*) from games where mode = 'pro' and status = 'active') as active_pro,
      (select count(*) from support_messages where status <> 'resolved') as open_support,
      (select count(*) from questions where is_active) as questions`);
  const signups = await rows(sql`
    select to_char(d, 'YYYY-MM-DD') as date,
      (select count(*) from users u where (u.registration_date at time zone 'Asia/Tashkent')::date = d) as count
    from generate_series((now() at time zone 'Asia/Tashkent')::date - 13, (now() at time zone 'Asia/Tashkent')::date, interval '1 day') as d order by d`);
  const games = await rows(sql`
    select to_char(d, 'YYYY-MM-DD') as date,
      (select count(*) from games g where g.mode = 'basic' and (g.started_at at time zone 'Asia/Tashkent')::date = d) as basic,
      (select count(*) from games g where g.mode = 'pro' and (g.started_at at time zone 'Asia/Tashkent')::date = d) as pro
    from generate_series((now() at time zone 'Asia/Tashkent')::date - 13, (now() at time zone 'Asia/Tashkent')::date, interval '1 day') as d order by d`);
  const levels = await rows(sql`select coalesce(english_level, 'none') as label, count(*) as count from users group by 1 order by 1`);
  const regions = await rows(sql`select region as label, count(*) as count from users where region is not null group by 1 order by 2 desc`);
  const hardest = await rows(sql`
    select id, text, level, times_served, round(100.0 * times_failed / nullif(times_served, 0)) as fail_rate
    from questions where times_served >= 3 order by fail_rate desc nulls last, times_served desc limit 8`);
  const t = totals ?? {};
  res.json({
    totalUsers: num(t["total_users"]),
    newToday: num(t["new_today"]),
    activeUsers: num(t["active_users"]),
    proUsers: num(t["pro_users"]),
    basicUsers: num(t["basic_users"]),
    phoneLeads: num(t["phone_leads"]),
    referrals: num(t["referrals"]),
    activeProGames: num(t["active_pro"]),
    openSupport: num(t["open_support"]),
    questions: num(t["questions"]),
    signupsByDay: signups.map((r) => ({ date: String(r["date"]), count: num(r["count"]) })),
    gamesByDay: games.map((r) => ({ date: String(r["date"]), basic: num(r["basic"]), pro: num(r["pro"]) })),
    levelDistribution: levels.map((r) => ({ label: String(r["label"]), count: num(r["count"]) })),
    regionDistribution: regions.map((r) => ({ label: String(r["label"]), count: num(r["count"]) })),
    hardestQuestions: hardest.map((r) => ({ id: num(r["id"]), text: String(r["text"]), level: String(r["level"]), served: num(r["times_served"]), failRate: num(r["fail_rate"]) })),
  });
});

router.get("/admin/users", async (req, res) => {
  const query = parseBody(ListAdminUsersQueryParams, req.query);
  const { page, pageSize, offset } = paging(query.page, query.pageSize);
  const conds: SQL[] = [sql`true`];
  if (query.q?.trim()) {
    const like = `%${query.q.trim()}%`;
    conds.push(sql`(u.first_name ilike ${like} or u.last_name ilike ${like} or u.username ilike ${like} or u.phone_number ilike ${like} or u.telegram_id::text like ${like})`);
  }
  if (query.region) conds.push(sql`u.region = ${query.region}`);
  if (query.level) conds.push(query.level === "none" ? sql`u.english_level is null` : sql`u.english_level = ${query.level}`);
  if (query.mode === "pro") conds.push(sql`exists (select 1 from games g where g.user_id = u.telegram_id and g.mode = 'pro')`);
  if (query.mode === "basic") conds.push(sql`exists (select 1 from games g where g.user_id = u.telegram_id and g.mode = 'basic')`);
  if (query.mode === "none") conds.push(sql`not exists (select 1 from games g where g.user_id = u.telegram_id)`);
  if (query.from) conds.push(sql`u.registration_date >= ${String(query.from)}::date`);
  if (query.to) conds.push(sql`u.registration_date < ${String(query.to)}::date + 1`);
  if (query.hasReferrals !== undefined) {
    conds.push(query.hasReferrals ? sql`exists (select 1 from referrals r where r.inviter_id = u.telegram_id)` : sql`not exists (select 1 from referrals r where r.inviter_id = u.telegram_id)`);
  }
  const where = sql.join(conds, sql` and `);
  const [{ total } = { total: 0 }] = await rows(sql`select count(*) as total from users u where ${where}`);
  const items = await rows(sql`
    select u.*,
      (select count(*) from referrals r where r.inviter_id = u.telegram_id) as referral_count,
      (select count(*) from basic_attempts b where b.user_id = u.telegram_id) as basic_tests,
      (select count(*) from pro_attempts p where p.user_id = u.telegram_id) as pro_attempts
    from users u where ${where}
    order by u.registration_date desc limit ${pageSize} offset ${offset}`);
  res.json({
    total: num(total),
    page,
    pageSize,
    items: items.map((u) => ({
      telegramId: num(u["telegram_id"]),
      firstName: String(u["first_name"] ?? ""),
      lastName: str(u["last_name"]),
      username: str(u["username"]),
      phoneNumber: str(u["phone_number"]),
      phoneVerified: Boolean(u["phone_verified"]),
      region: str(u["region"]),
      englishLevel: str(u["english_level"]),
      points: num(u["points"]),
      proHearts: num(u["pro_hearts"]),
      extraChances: num(u["extra_chances"]),
      referralCount: num(u["referral_count"]),
      basicTests: num(u["basic_tests"]),
      proAttempts: num(u["pro_attempts"]),
      onboardingComplete: Boolean(u["onboarded_at"]),
      registrationDate: iso(u["registration_date"])!,
      lastActive: iso(u["last_active"])!,
    })),
  });
});

router.get("/admin/pro", async (_req, res) => {
  const base = sql`
    select g.id, g.user_id, g.status, g.current_index, g.total_questions, g.correct_count, g.hearts, g.points_earned,
      g.started_at, g.last_activity_at, g.finished_at, u.first_name, u.last_name, u.username
    from games g join users u on u.telegram_id = g.user_id where g.mode = 'pro'`;
  const map = (r: Row) => ({
    gameId: num(r["id"]),
    telegramId: num(r["user_id"]),
    name: [r["first_name"], r["last_name"]].filter(Boolean).join(" ") || "Player",
    username: str(r["username"]),
    status: String(r["status"]),
    currentQuestion: Math.min(num(r["current_index"]) + 1, num(r["total_questions"])),
    total: num(r["total_questions"]),
    correctCount: num(r["correct_count"]),
    hearts: num(r["hearts"]),
    pointsEarned: num(r["points_earned"]),
    startedAt: iso(r["started_at"])!,
    lastActivityAt: iso(r["last_activity_at"])!,
    finishedAt: iso(r["finished_at"]),
  });
  const [active, eliminated, winners, leaders] = await Promise.all([
    rows(sql`${base} and g.status = 'active' order by g.correct_count desc, g.last_activity_at desc limit 100`),
    rows(sql`${base} and g.status = 'eliminated' order by g.finished_at desc limit 50`),
    rows(sql`${base} and g.status = 'won' order by g.finished_at desc limit 50`),
    rows(sql`${base} order by g.correct_count desc, g.hearts desc, g.finished_at asc nulls last limit 10`),
  ]);
  res.json({ active: active.map(map), eliminated: eliminated.map(map), winners: winners.map(map), leaders: leaders.map(map) });
});

function toAdminQuestion(q: typeof questionsTable.$inferSelect) {
  return {
    id: q.id,
    level: q.level,
    difficulty: q.difficulty,
    category: q.category,
    text: q.text,
    options: [q.optionA, q.optionB, q.optionC, q.optionD],
    correctOption: q.correctOption,
    isActive: q.isActive,
    timesServed: q.timesServed,
    timesFailed: q.timesFailed,
    createdAt: q.createdAt.toISOString(),
  };
}

router.get("/admin/questions", async (req, res) => {
  const query = parseBody(ListAdminQuestionsQueryParams, req.query);
  const { page, pageSize, offset } = paging(query.page, query.pageSize);
  const conds: SQL[] = [];
  if (query.level) conds.push(eq(questionsTable.level, query.level));
  if (query.q?.trim()) {
    const like = `%${query.q.trim()}%`;
    conds.push(or(ilike(questionsTable.text, like), ilike(questionsTable.category, like))!);
  }
  const where = conds.length ? and(...conds) : undefined;
  const [{ n } = { n: 0 }] = await db.select({ n: count() }).from(questionsTable).where(where);
  const items = await db.select().from(questionsTable).where(where).orderBy(desc(questionsTable.id)).limit(pageSize).offset(offset);
  res.json({ items: items.map(toAdminQuestion), total: Number(n), page, pageSize });
});

function questionValues(body: ReturnType<typeof CreateAdminQuestionBody.parse>) {
  const options = body.options.map((o) => o.trim());
  if (new Set(options.map((o) => o.toLowerCase())).size !== 4) throw new HttpError(400, "Options must be different.", "INVALID_INPUT");
  return {
    level: body.level,
    difficulty: body.difficulty,
    category: body.category.trim(),
    text: body.text.trim(),
    optionA: options[0]!,
    optionB: options[1]!,
    optionC: options[2]!,
    optionD: options[3]!,
    correctOption: body.correctOption,
    isActive: body.isActive ?? true,
  };
}

router.post("/admin/questions", async (req, res) => {
  const body = parseBody(CreateAdminQuestionBody, req.body);
  const [created] = await db.insert(questionsTable).values(questionValues(body)).returning();
  await logAction(req, "question.create", "question", created!.id);
  res.json(toAdminQuestion(created!));
});

router.patch("/admin/questions/:questionId", async (req, res) => {
  const id = idParam(req, "questionId");
  const body = parseBody(CreateAdminQuestionBody, req.body);
  const [updated] = await db.update(questionsTable).set(questionValues(body)).where(eq(questionsTable.id, id)).returning();
  if (!updated) throw new HttpError(404, "Question not found.", "NOT_FOUND");
  await logAction(req, "question.update", "question", id);
  res.json(toAdminQuestion(updated));
});

router.delete("/admin/questions/:questionId", async (req, res) => {
  const id = idParam(req, "questionId");
  const [used] = await rows(sql`select count(*) as n from game_questions where question_id = ${id}`);
  // Questions already used in games are deactivated to keep history intact.
  if (num(used?.["n"]) > 0) {
    const [row] = await db.update(questionsTable).set({ isActive: false }).where(eq(questionsTable.id, id)).returning();
    if (!row) throw new HttpError(404, "Question not found.", "NOT_FOUND");
  } else {
    const deleted = await db.delete(questionsTable).where(eq(questionsTable.id, id)).returning();
    if (!deleted.length) throw new HttpError(404, "Question not found.", "NOT_FOUND");
  }
  await logAction(req, "question.delete", "question", id);
  res.json({ ok: true });
});

router.get("/admin/referrals", async (req, res) => {
  const { page, pageSize, offset } = paging(Number(req.query["page"]) || 1, Number(req.query["pageSize"]) || 25);
  const [{ total } = { total: 0 }] = await rows(sql`select count(*) as total from referrals`);
  const items = await rows(sql`
    select r.id, r.inviter_id, r.invitee_id, r.reward_points, r.created_at,
      concat_ws(' ', a.first_name, a.last_name) as inviter_name,
      concat_ws(' ', b.first_name, b.last_name) as invitee_name, b.region as invitee_region
    from referrals r left join users a on a.telegram_id = r.inviter_id left join users b on b.telegram_id = r.invitee_id
    order by r.created_at desc limit ${pageSize} offset ${offset}`);
  const top = await rows(sql`
    select r.inviter_id, concat_ws(' ', u.first_name, u.last_name) as name, count(*) as n
    from referrals r left join users u on u.telegram_id = r.inviter_id group by 1, 2 order by 3 desc limit 10`);
  res.json({
    total: num(total),
    page,
    pageSize,
    items: items.map((r) => ({
      id: num(r["id"]),
      inviterId: num(r["inviter_id"]),
      inviterName: String(r["inviter_name"] ?? ""),
      inviteeId: num(r["invitee_id"]),
      inviteeName: String(r["invitee_name"] ?? ""),
      inviteeRegion: str(r["invitee_region"]),
      rewardPoints: num(r["reward_points"]),
      createdAt: iso(r["created_at"])!,
    })),
    topInviters: top.map((r) => ({ telegramId: num(r["inviter_id"]), name: String(r["name"] ?? ""), count: num(r["n"]) })),
  });
});

const toAdminSupport = (m: typeof supportMessagesTable.$inferSelect) => ({
  id: m.id,
  telegramId: m.telegramId,
  userName: m.userName,
  phone: m.phone,
  message: m.message,
  status: m.status,
  forwarded: m.forwarded,
  createdAt: m.createdAt.toISOString(),
});

router.get("/admin/support", async (req, res) => {
  const status = req.query["status"];
  const valid = status === "new" || status === "read" || status === "resolved";
  const items = await db
    .select()
    .from(supportMessagesTable)
    .where(valid ? eq(supportMessagesTable.status, status) : undefined)
    .orderBy(desc(supportMessagesTable.createdAt))
    .limit(200);
  res.json(items.map(toAdminSupport));
});

router.patch("/admin/support/:messageId", async (req, res) => {
  const id = idParam(req, "messageId");
  const body = parseBody(UpdateAdminSupportBody, req.body);
  const [row] = await db.update(supportMessagesTable).set({ status: body.status }).where(eq(supportMessagesTable.id, id)).returning();
  if (!row) throw new HttpError(404, "Message not found.", "NOT_FOUND");
  await logAction(req, "support.status", "support_message", id, { status: body.status });
  res.json(toAdminSupport(row));
});

router.get("/admin/settings", async (_req, res) => {
  const active = await activeGamesNow();
  const actions = await db.select().from(adminActionsTable).orderBy(desc(adminActionsTable.createdAt)).limit(30);
  res.json({
    adminIds: ADMIN_IDS,
    supportPhone: SUPPORT_PHONE,
    prizeUzs: PRIZE_UZS,
    dailyFreeProGames: DAILY_FREE_PRO_GAMES,
    maxHearts: MAX_HEARTS,
    basicQuestionCount: BASIC_QUESTION_COUNT,
    proQuestionCount: PRO_QUESTION_COUNT,
    extraChanceReferrals: EXTRA_CHANCE_REFERRALS,
    referralRewardPoints: REFERRAL_REWARD_POINTS,
    currentTimerSeconds: secondsForActivity(active),
    activeGamesNow: active,
    timerRules: TIMER_RULES,
    botUsername: await getBotUsername(),
    recentActions: actions.map((a) => ({ id: a.id, adminId: a.adminId, action: a.action, targetType: a.targetType, targetId: a.targetId, createdAt: a.createdAt.toISOString() })),
  });
});

export default router;
