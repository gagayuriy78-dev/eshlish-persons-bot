import { bigint, boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const usersTable = pgTable(
  "users",
  {
    telegramId: bigint("telegram_id", { mode: "number" }).primaryKey(),
    username: text("username"),
    firstName: text("first_name").notNull().default(""),
    lastName: text("last_name"),
    photoUrl: text("photo_url"),
    phoneNumber: text("phone_number"),
    phoneVerified: boolean("phone_verified").notNull().default(false),
    region: text("region"),
    registrationDate: timestamp("registration_date", { withTimezone: true }).notNull().defaultNow(),
    onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
    referralCode: text("referral_code").notNull().unique(),
    referredBy: bigint("referred_by", { mode: "number" }),
    language: text("language").notNull().default("uz"),
    englishLevel: text("english_level"),
    points: integer("points").notNull().default(0),
    proHearts: integer("pro_hearts").notNull().default(2),
    extraChances: integer("extra_chances").notNull().default(0),
    lastActive: timestamp("last_active", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("users_points_idx").on(t.points), index("users_region_idx").on(t.region)],
);

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
