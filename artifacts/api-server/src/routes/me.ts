import { Router, type IRouter, type Request } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { StartSessionBody, SubmitPhoneBody, SubmitRegionBody, UpdateMeBody } from "@workspace/api-zod";
import { getBotUsername } from "../lib/bot-api";
import { LEVELS, PRIZE_UZS, REGIONS, SUPPORT_PHONE } from "../lib/config";
import { HttpError } from "../lib/http-error";
import { normalizePhone, validateContactResponse } from "../lib/telegram-auth";
import { rateLimit, requireTelegramUser } from "../middlewares/auth";
import { buildMe, completeOnboardingIfReady, ensureUser, getUserOrThrow } from "../services/users";

const router: IRouter = Router();

export function parseBody<T>(schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false } }, value: unknown): T {
  const parsed = schema.safeParse(value ?? {});
  if (!parsed.success) throw new HttpError(400, "Invalid request.", "INVALID_INPUT");
  return parsed.data;
}

export const userId = (req: Request) => req.tgUser!.id;

router.get("/config", async (_req, res) => {
  res.json({ supportPhone: SUPPORT_PHONE, prizeUzs: PRIZE_UZS, regions: [...REGIONS], levels: [...LEVELS], botUsername: await getBotUsername() });
});

router.post("/session", requireTelegramUser, rateLimit("session", 30), async (req, res) => {
  const body = parseBody(StartSessionBody, req.body);
  const user = await ensureUser(req.tgUser!, req.tgStartParam ?? null, body.ref, body.refSig);
  res.json(await buildMe(user));
});

router.get("/me", requireTelegramUser, async (req, res) => {
  res.json(await buildMe(await getUserOrThrow(userId(req))));
});

router.patch("/me", requireTelegramUser, rateLimit("me", 30), async (req, res) => {
  const body = parseBody(UpdateMeBody, req.body);
  await getUserOrThrow(userId(req));
  const patch: Partial<typeof usersTable.$inferInsert> = {};
  if (body.language) patch.language = body.language;
  if (body.region) patch.region = body.region;
  if (Object.keys(patch).length) await db.update(usersTable).set(patch).where(eq(usersTable.telegramId, userId(req)));
  res.json(await buildMe(await getUserOrThrow(userId(req))));
});

router.post("/me/phone", requireTelegramUser, rateLimit("phone", 10), async (req, res) => {
  const body = parseBody(SubmitPhoneBody, req.body);
  await getUserOrThrow(userId(req));
  let phone: string;
  let verified = false;
  try {
    if (body.contactResponse) {
      phone = validateContactResponse(body.contactResponse, process.env["TEST_TOKEN"] ?? "", userId(req));
      verified = true;
    } else if (body.phoneNumber) {
      // Fallback for Telegram clients without requestContact support.
      phone = normalizePhone(body.phoneNumber);
    } else {
      throw new Error("missing");
    }
  } catch {
    throw new HttpError(400, "Phone number could not be verified.", "PHONE_INVALID");
  }
  await db.update(usersTable).set({ phoneNumber: phone, phoneVerified: verified }).where(eq(usersTable.telegramId, userId(req)));
  await completeOnboardingIfReady(userId(req));
  res.json(await buildMe(await getUserOrThrow(userId(req))));
});

router.post("/me/region", requireTelegramUser, rateLimit("region", 20), async (req, res) => {
  const body = parseBody(SubmitRegionBody, req.body);
  await getUserOrThrow(userId(req));
  await db.update(usersTable).set({ region: body.region }).where(eq(usersTable.telegramId, userId(req)));
  await completeOnboardingIfReady(userId(req));
  res.json(await buildMe(await getUserOrThrow(userId(req))));
});

export default router;
