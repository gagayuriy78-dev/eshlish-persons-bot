import { bigint, index, integer, pgTable, serial, timestamp } from "drizzle-orm/pg-core";

export const referralsTable = pgTable(
  "referrals",
  {
    id: serial("id").primaryKey(),
    inviterId: bigint("inviter_id", { mode: "number" }).notNull(),
    inviteeId: bigint("invitee_id", { mode: "number" }).notNull().unique(),
    rewardPoints: integer("reward_points").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("referrals_inviter_idx").on(t.inviterId)],
);

export type Referral = typeof referralsTable.$inferSelect;
