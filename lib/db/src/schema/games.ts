import { bigint, index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const gamesTable = pgTable(
  "games",
  {
    id: serial("id").primaryKey(),
    userId: bigint("user_id", { mode: "number" }).notNull(),
    mode: text("mode").notNull(),
    level: text("level"),
    status: text("status").notNull().default("active"),
    totalQuestions: integer("total_questions").notNull(),
    currentIndex: integer("current_index").notNull().default(0),
    correctCount: integer("correct_count").notNull().default(0),
    wrongCount: integer("wrong_count").notNull().default(0),
    hearts: integer("hearts").notNull().default(0),
    pointsEarned: integer("points_earned").notNull().default(0),
    chanceType: text("chance_type"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("games_user_idx").on(t.userId, t.startedAt),
    index("games_status_idx").on(t.status, t.lastActivityAt),
  ],
);

export const gameQuestionsTable = pgTable(
  "game_questions",
  {
    id: serial("id").primaryKey(),
    gameId: integer("game_id").notNull(),
    questionId: integer("question_id").notNull(),
    position: integer("position").notNull(),
    allowedSeconds: integer("allowed_seconds"),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    answeredAt: timestamp("answered_at", { withTimezone: true }),
    selectedOption: text("selected_option"),
    status: text("status").notNull().default("queued"),
  },
  (t) => [uniqueIndex("game_questions_position_idx").on(t.gameId, t.position)],
);

export type Game = typeof gamesTable.$inferSelect;
export type GameQuestion = typeof gameQuestionsTable.$inferSelect;
