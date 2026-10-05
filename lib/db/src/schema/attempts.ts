import { bigint, boolean, index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const basicAttemptsTable = pgTable(
  "basic_attempts",
  {
    id: serial("id").primaryKey(),
    gameId: integer("game_id").notNull().unique(),
    userId: bigint("user_id", { mode: "number" }).notNull(),
    level: text("level").notNull(),
    score: integer("score").notNull(),
    total: integer("total").notNull(),
    percentage: integer("percentage").notNull(),
    achievedLevel: text("achieved_level"),
    passed: boolean("passed").notNull(),
    certificateCode: text("certificate_code").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("basic_attempts_user_idx").on(t.userId)],
);

export const proAttemptsTable = pgTable(
  "pro_attempts",
  {
    id: serial("id").primaryKey(),
    gameId: integer("game_id").notNull().unique(),
    userId: bigint("user_id", { mode: "number" }).notNull(),
    chanceType: text("chance_type").notNull(),
    questionsAnswered: integer("questions_answered").notNull(),
    correctCount: integer("correct_count").notNull(),
    total: integer("total").notNull(),
    percentage: integer("percentage").notNull(),
    heartsLeft: integer("hearts_left").notNull(),
    outcome: text("outcome").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("pro_attempts_user_idx").on(t.userId)],
);

export type BasicAttempt = typeof basicAttemptsTable.$inferSelect;
export type ProAttempt = typeof proAttemptsTable.$inferSelect;
