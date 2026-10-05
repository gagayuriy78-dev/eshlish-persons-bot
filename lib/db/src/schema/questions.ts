import { boolean, index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const questionsTable = pgTable(
  "questions",
  {
    id: serial("id").primaryKey(),
    level: text("level").notNull(),
    difficulty: text("difficulty").notNull().default("medium"),
    category: text("category").notNull().default("grammar"),
    text: text("text").notNull(),
    optionA: text("option_a").notNull(),
    optionB: text("option_b").notNull(),
    optionC: text("option_c").notNull(),
    optionD: text("option_d").notNull(),
    correctOption: text("correct_option").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    timesServed: integer("times_served").notNull().default(0),
    timesFailed: integer("times_failed").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [index("questions_level_idx").on(t.level, t.isActive)],
);

export type Question = typeof questionsTable.$inferSelect;
export type InsertQuestion = typeof questionsTable.$inferInsert;
