import { and, count, eq, gt, gte, sql } from "drizzle-orm";
import {
  basicAttemptsTable,
  db,
  gameQuestionsTable,
  gamesTable,
  proAttemptsTable,
  questionsTable,
  usersTable,
  type Game,
  type GameQuestion,
  type User,
} from "@workspace/db";
import { randomBytes } from "node:crypto";
import {
  ACTIVE_WINDOW_MINUTES,
  ANSWER_GRACE_MS,
  BASIC_PASS_PERCENTAGE,
  BASIC_POINTS_PER_CORRECT,
  BASIC_QUESTION_COUNT,
  DAILY_FREE_PRO_GAMES,
  LEVELS,
  MAX_HEARTS,
  PRIZE_UZS,
  PRO_PLAN,
  PRO_POINTS_PER_CORRECT,
  PRO_QUESTION_COUNT,
  PRO_WIN_BONUS,
  startOfTashkentDay,
  TIMER_RULES,
  type Level,
} from "../lib/config";
import { HttpError } from "../lib/http-error";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Mode = "basic" | "pro";

export async function activeGamesNow(): Promise<number> {
  const since = new Date(Date.now() - ACTIVE_WINDOW_MINUTES * 60_000);
  const [row] = await db
    .select({ n: count() })
    .from(gamesTable)
    .where(and(eq(gamesTable.status, "active"), gt(gamesTable.lastActivityAt, since)));
  return Number(row?.n ?? 0);
}

export function secondsForActivity(active: number): number {
  return (TIMER_RULES.find((rule) => active >= rule.minActiveGames) ?? TIMER_RULES[TIMER_RULES.length - 1]!).seconds;
}

export async function currentTimerSeconds(): Promise<number> {
  return secondsForActivity(await activeGamesNow());
}

async function freeProUsedToday(userId: number, executor: Tx | typeof db = db): Promise<number> {
  const [row] = await executor
    .select({ n: count() })
    .from(gamesTable)
    .where(
      and(
        eq(gamesTable.userId, userId),
        eq(gamesTable.mode, "pro"),
        eq(gamesTable.chanceType, "free"),
        gte(gamesTable.startedAt, startOfTashkentDay()),
      ),
    );
  return Number(row?.n ?? 0);
}

export async function getProStatus(user: User) {
  const active = await db.query.gamesTable.findFirst({
    where: and(eq(gamesTable.userId, user.telegramId), eq(gamesTable.mode, "pro"), eq(gamesTable.status, "active")),
  });
  const freeAvailable = (await freeProUsedToday(user.telegramId)) < DAILY_FREE_PRO_GAMES;
  return {
    canPlay: Boolean(active) || freeAvailable || user.extraChances > 0,
    freeAvailable,
    extraChances: user.extraChances,
    hearts: active ? active.hearts : MAX_HEARTS,
    maxHearts: MAX_HEARTS,
    prizeUzs: PRIZE_UZS,
    timerSeconds: await currentTimerSeconds(),
    totalQuestions: PRO_QUESTION_COUNT,
    activeGameId: active?.id ?? null,
    nextFreeAt: new Date(startOfTashkentDay().getTime() + 86_400_000).toISOString(),
  };
}

export async function toGameState(game: Game) {
  let percentage = game.totalQuestions ? Math.round((game.correctCount / game.totalQuestions) * 100) : 0;
  let achievedLevel: string | null = null;
  let passed: boolean | null = null;
  let certificateCode: string | null = null;
  if (game.mode === "basic" && game.status === "finished") {
    const attempt = await db.query.basicAttemptsTable.findFirst({ where: eq(basicAttemptsTable.gameId, game.id) });
    if (attempt) {
      percentage = attempt.percentage;
      achievedLevel = attempt.achievedLevel;
      passed = attempt.passed;
      certificateCode = attempt.certificateCode;
    }
  }
  return {
    id: game.id,
    mode: game.mode as Mode,
    level: game.level,
    status: game.status as "active" | "finished" | "eliminated" | "won" | "abandoned",
    totalQuestions: game.totalQuestions,
    answered: game.currentIndex,
    correctCount: game.correctCount,
    wrongCount: game.wrongCount,
    hearts: game.hearts,
    maxHearts: game.mode === "pro" ? MAX_HEARTS : 0,
    pointsEarned: game.pointsEarned,
    percentage,
    achievedLevel,
    passed,
    certificateCode,
    startedAt: game.startedAt.toISOString(),
    finishedAt: game.finishedAt?.toISOString() ?? null,
  };
}

async function pickQuestions(tx: Tx, level: Level, n: number): Promise<number[]> {
  const rows = await tx
    .select({ id: questionsTable.id })
    .from(questionsTable)
    .where(and(eq(questionsTable.level, level), eq(questionsTable.isActive, true)))
    .orderBy(sql`random()`)
    .limit(n);
  return rows.map((row) => row.id);
}

async function closeGame(tx: Tx, game: Game, status: string): Promise<Game> {
  const [closed] = await tx
    .update(gamesTable)
    .set({ status, finishedAt: new Date(), lastActivityAt: new Date() })
    .where(eq(gamesTable.id, game.id))
    .returning();
  if (game.mode === "pro") {
    await tx.insert(proAttemptsTable).values({
      gameId: game.id,
      userId: game.userId,
      chanceType: game.chanceType ?? "free",
      questionsAnswered: game.currentIndex,
      correctCount: game.correctCount,
      total: game.totalQuestions,
      percentage: Math.round((game.correctCount / game.totalQuestions) * 100),
      heartsLeft: game.hearts,
      outcome: status,
    }).onConflictDoNothing();
    await tx.update(usersTable).set({ proHearts: MAX_HEARTS }).where(eq(usersTable.telegramId, game.userId));
  }
  return closed!;
}

export async function startGame(user: User, mode: Mode, level?: Level) {
  if (mode === "basic" && (!level || !LEVELS.includes(level))) {
    throw new HttpError(400, "Choose a level from A1 to C2.", "LEVEL_REQUIRED");
  }
  const game = await db.transaction(async (tx) => {
    // Serialise game creation per user.
    await tx.select().from(usersTable).where(eq(usersTable.telegramId, user.telegramId)).for("update");
    const actives = await tx
      .select()
      .from(gamesTable)
      .where(and(eq(gamesTable.userId, user.telegramId), eq(gamesTable.status, "active")));
    const resumable = actives.find((g) => g.mode === mode && (mode === "pro" || g.level === level));
    if (resumable) return resumable;
    for (const g of actives) await closeGame(tx, g, "abandoned");

    let chanceType: string | null = null;
    let hearts = 0;
    let ids: number[] = [];
    if (mode === "pro") {
      const [fresh] = await tx.select().from(usersTable).where(eq(usersTable.telegramId, user.telegramId));
      if ((await freeProUsedToday(user.telegramId, tx)) < DAILY_FREE_PRO_GAMES) chanceType = "free";
      else if ((fresh?.extraChances ?? 0) > 0) {
        chanceType = "extra";
        await tx
          .update(usersTable)
          .set({ extraChances: sql`${usersTable.extraChances} - 1` })
          .where(eq(usersTable.telegramId, user.telegramId));
      } else {
        throw new HttpError(403, "No PRO chances left today. Invite 3 friends for an extra chance.", "NO_CHANCES");
      }
      hearts = MAX_HEARTS;
      for (const [planLevel, n] of PRO_PLAN) ids.push(...(await pickQuestions(tx, planLevel, n)));
    } else {
      ids = await pickQuestions(tx, level!, BASIC_QUESTION_COUNT);
    }
    if (ids.length < 5) throw new HttpError(409, "Not enough questions are available yet.", "NO_QUESTIONS");

    const [created] = await tx
      .insert(gamesTable)
      .values({ userId: user.telegramId, mode, level: mode === "basic" ? level! : null, totalQuestions: ids.length, hearts, chanceType })
      .returning();
    await tx.insert(gameQuestionsTable).values(ids.map((questionId, position) => ({ gameId: created!.id, questionId, position })));
    if (mode === "pro") {
      await tx.update(usersTable).set({ proHearts: hearts }).where(eq(usersTable.telegramId, user.telegramId));
    }
    return created!;
  });
  return toGameState(game);
}

async function lockGame(tx: Tx, userId: number, gameId: number): Promise<Game> {
  const [game] = await tx.select().from(gamesTable).where(eq(gamesTable.id, gameId)).for("update");
  if (!game || game.userId !== userId) throw new HttpError(404, "Game not found.", "GAME_NOT_FOUND");
  return game;
}

export async function getGame(userId: number, gameId: number) {
  const game = await db.query.gamesTable.findFirst({ where: eq(gamesTable.id, gameId) });
  if (!game || game.userId !== userId) throw new HttpError(404, "Game not found.", "GAME_NOT_FOUND");
  return toGameState(game);
}

function previousLevel(level: string): string | null {
  const index = LEVELS.indexOf(level as Level);
  return index > 0 ? LEVELS[index - 1]! : null;
}

/** Apply a graded result. Server decides points, hearts and game end. */
async function applyResult(tx: Tx, game: Game, gq: GameQuestion, result: "correct" | "wrong" | "timeout", selected: string | null) {
  const now = new Date();
  await tx
    .update(gameQuestionsTable)
    .set({ status: result, answeredAt: now, selectedOption: selected })
    .where(eq(gameQuestionsTable.id, gq.id));
  await tx
    .update(questionsTable)
    .set({
      timesServed: sql`${questionsTable.timesServed} + 1`,
      timesFailed: sql`${questionsTable.timesFailed} + ${result === "correct" ? 0 : 1}`,
    })
    .where(eq(questionsTable.id, gq.questionId));

  const correct = result === "correct";
  const perCorrect = game.mode === "pro" ? PRO_POINTS_PER_CORRECT : BASIC_POINTS_PER_CORRECT;
  const hearts = game.mode === "pro" && !correct ? Math.max(0, game.hearts - 1) : game.hearts;
  const currentIndex = game.currentIndex + 1;
  let status = "active";
  let gained = correct ? perCorrect : 0;
  if (game.mode === "pro" && hearts === 0) status = "eliminated";
  else if (currentIndex >= game.totalQuestions) {
    status = game.mode === "pro" ? "won" : "finished";
    if (game.mode === "pro") gained += PRO_WIN_BONUS;
  }

  const [updated] = await tx
    .update(gamesTable)
    .set({
      currentIndex,
      hearts,
      correctCount: game.correctCount + (correct ? 1 : 0),
      wrongCount: game.wrongCount + (correct ? 0 : 1),
      pointsEarned: game.pointsEarned + gained,
      lastActivityAt: now,
    })
    .where(eq(gamesTable.id, game.id))
    .returning();
  const userUpdate: Record<string, unknown> = {};
  if (gained) userUpdate["points"] = sql`${usersTable.points} + ${gained}`;
  if (game.mode === "pro") userUpdate["proHearts"] = hearts;
  if (Object.keys(userUpdate).length) {
    await tx.update(usersTable).set(userUpdate).where(eq(usersTable.telegramId, game.userId));
  }

  let finalGame = updated!;
  if (status !== "active") {
    finalGame = await closeGame(tx, updated!, status);
    if (game.mode === "basic") {
      const percentage = Math.round((finalGame.correctCount / finalGame.totalQuestions) * 100);
      const passed = percentage >= BASIC_PASS_PERCENTAGE;
      const achievedLevel = passed ? finalGame.level! : previousLevel(finalGame.level!);
      await tx.insert(basicAttemptsTable).values({
        gameId: finalGame.id,
        userId: finalGame.userId,
        level: finalGame.level!,
        score: finalGame.correctCount,
        total: finalGame.totalQuestions,
        percentage,
        achievedLevel,
        passed,
        certificateCode: `PLC-${finalGame.level}-${finalGame.id.toString(36).toUpperCase()}${randomBytes(2).toString("hex").toUpperCase()}`,
      });
      if (achievedLevel) {
        const [owner] = await tx.select().from(usersTable).where(eq(usersTable.telegramId, finalGame.userId));
        const currentRank = owner?.englishLevel ? LEVELS.indexOf(owner.englishLevel as Level) : -1;
        if (LEVELS.indexOf(achievedLevel as Level) > currentRank) {
          await tx.update(usersTable).set({ englishLevel: achievedLevel }).where(eq(usersTable.telegramId, finalGame.userId));
        }
      }
    }
  }
  return { game: finalGame, heartLost: hearts < game.hearts };
}

function isExpired(gq: GameQuestion, now = Date.now()): boolean {
  return Boolean(gq.expiresAt && now > gq.expiresAt.getTime() + ANSWER_GRACE_MS);
}

export async function issueQuestion(userId: number, gameId: number) {
  const timerSeconds = await currentTimerSeconds();
  return db.transaction(async (tx) => {
    let game = await lockGame(tx, userId, gameId);
    for (;;) {
      if (game.status !== "active") throw new HttpError(409, "This game has ended.", "GAME_FINISHED");
      const [gq] = await tx
        .select()
        .from(gameQuestionsTable)
        .where(and(eq(gameQuestionsTable.gameId, game.id), eq(gameQuestionsTable.position, game.currentIndex)));
      if (!gq) throw new HttpError(409, "Invalid question state.", "INVALID_QUESTION");
      // A reload after expiry cannot restart the timer: record a timeout.
      if (gq.status === "issued" && isExpired(gq)) {
        game = (await applyResult(tx, game, gq, "timeout", null)).game;
        continue;
      }
      let issued = gq;
      if (gq.status === "queued") {
        const now = new Date();
        [issued] = (await tx
          .update(gameQuestionsTable)
          .set({ status: "issued", issuedAt: now, allowedSeconds: timerSeconds, expiresAt: new Date(now.getTime() + timerSeconds * 1000) })
          .where(eq(gameQuestionsTable.id, gq.id))
          .returning()) as [GameQuestion];
        await tx.update(gamesTable).set({ lastActivityAt: now }).where(eq(gamesTable.id, game.id));
      }
      const [question] = await tx.select().from(questionsTable).where(eq(questionsTable.id, issued.questionId));
      if (!question) throw new HttpError(409, "This question is no longer available.", "INVALID_QUESTION");
      return {
        gameId: game.id,
        questionId: issued.id,
        position: game.currentIndex + 1,
        total: game.totalQuestions,
        question: question.text,
        options: [question.optionA, question.optionB, question.optionC, question.optionD],
        serverTime: new Date().toISOString(),
        expiresAt: issued.expiresAt!.toISOString(),
        allowedSeconds: issued.allowedSeconds ?? timerSeconds,
        hearts: game.hearts,
      };
    }
  });
}

export async function answerQuestion(userId: number, gameId: number, questionId: number, optionIndex?: number) {
  const outcome = await db.transaction(async (tx) => {
    const game = await lockGame(tx, userId, gameId);
    if (game.status !== "active") throw new HttpError(409, "This game has ended.", "GAME_FINISHED");
    const [gq] = await tx.select().from(gameQuestionsTable).where(eq(gameQuestionsTable.id, questionId));
    if (!gq || gq.gameId !== game.id) throw new HttpError(409, "This question was not issued to you.", "INVALID_QUESTION");
    if (gq.position !== game.currentIndex || gq.status !== "issued") {
      throw new HttpError(409, "This question has already been answered.", "ALREADY_ANSWERED");
    }
    const [question] = await tx.select().from(questionsTable).where(eq(questionsTable.id, gq.questionId));
    if (!question) throw new HttpError(409, "This question is no longer available.", "INVALID_QUESTION");
    let result: "correct" | "wrong" | "timeout";
    let selected: string | null = null;
    if (optionIndex === undefined || isExpired(gq)) result = "timeout";
    else {
      selected = "ABCD"[optionIndex]!;
      result = selected === question.correctOption ? "correct" : "wrong";
    }
    const applied = await applyResult(tx, game, gq, result, selected);
    return { result, ...applied };
  });
  return {
    result: outcome.result,
    heartLost: outcome.heartLost,
    hearts: outcome.game.hearts,
    game: await toGameState(outcome.game),
  };
}

export async function abandonGame(userId: number, gameId: number) {
  const game = await db.transaction(async (tx) => {
    const locked = await lockGame(tx, userId, gameId);
    if (locked.status !== "active") return locked;
    return closeGame(tx, locked, "abandoned");
  });
  return toGameState(game);
}

