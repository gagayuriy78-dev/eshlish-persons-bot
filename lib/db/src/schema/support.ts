import { bigint, boolean, index, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const supportMessagesTable = pgTable(
  "support_messages",
  {
    id: serial("id").primaryKey(),
    telegramId: bigint("telegram_id", { mode: "number" }).notNull(),
    userName: text("user_name").notNull().default(""),
    phone: text("phone"),
    message: text("message").notNull(),
    status: text("status").notNull().default("new"),
    forwarded: boolean("forwarded").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [index("support_status_idx").on(t.status, t.createdAt)],
);

export const adminActionsTable = pgTable("admin_actions", {
  id: serial("id").primaryKey(),
  adminId: bigint("admin_id", { mode: "number" }).notNull(),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  details: jsonb("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SupportMessage = typeof supportMessagesTable.$inferSelect;
export type AdminAction = typeof adminActionsTable.$inferSelect;
