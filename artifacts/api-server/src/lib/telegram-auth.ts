import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

export interface ValidatedPayload {
  fields: Map<string, string>;
  authDate: number;
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length || !/^[0-9a-f]+$/.test(a)) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

/** Validate any Telegram WebApp-signed query string (initData, requestContact response). */
export function validateSignedQuery(
  raw: string,
  botToken: string,
  maxAgeSeconds: number,
  nowSeconds = Date.now() / 1000,
): ValidatedPayload {
  if (!raw || raw.length > 16384 || !botToken) throw new Error("missing");
  const params = new URLSearchParams(raw);
  const fields = new Map<string, string>();
  for (const [key, value] of params) {
    if (fields.has(key)) throw new Error("duplicate field");
    fields.set(key, value);
  }
  const hash = fields.get("hash") ?? "";
  fields.delete("hash");
  const dataCheckString = [...fields.keys()]
    .sort()
    .map((key) => `${key}=${fields.get(key)}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expected = createHmac("sha256", secret).update(dataCheckString).digest("hex");
  if (!safeEqualHex(hash, expected)) throw new Error("bad signature");
  const authDate = Number(fields.get("auth_date") ?? 0);
  const age = nowSeconds - authDate;
  if (!Number.isFinite(authDate) || authDate <= 0 || age < -60) throw new Error("bad auth date");
  if (age > maxAgeSeconds) throw new Error("expired");
  return { fields, authDate };
}

export function validateInitData(raw: string, botToken: string, maxAgeSeconds: number) {
  const { fields } = validateSignedQuery(raw, botToken, maxAgeSeconds);
  const user = JSON.parse(fields.get("user") ?? "null") as TelegramUser | null;
  if (!user || !Number.isSafeInteger(user.id) || user.id <= 0) throw new Error("bad user");
  return { user, startParam: fields.get("start_param") ?? null };
}

/** Verify the signed response of Telegram.WebApp.requestContact(). */
export function validateContactResponse(raw: string, botToken: string, userId: number): string {
  const { fields } = validateSignedQuery(raw, botToken, 15 * 60);
  const contact = JSON.parse(fields.get("contact") ?? "null") as {
    user_id?: number;
    phone_number?: string;
  } | null;
  if (!contact || contact.user_id !== userId || !contact.phone_number) {
    throw new Error("contact mismatch");
  }
  return normalizePhone(contact.phone_number);
}

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) throw new Error("bad phone");
  if (digits.length === 9) return `+998${digits}`;
  return `+${digits}`;
}

/** HMAC the bot attaches to the Mini App URL so referral params cannot be forged. */
export function referralSignature(inviterId: number, inviteeId: number, botToken: string): string {
  const key = createHash("sha256").update(`referral:${botToken}`).digest();
  return createHmac("sha256", key).update(`${inviterId}:${inviteeId}`).digest("hex").slice(0, 32);
}

export function verifyReferralSignature(
  inviterId: number,
  inviteeId: number,
  signature: string,
  botToken: string,
): boolean {
  return safeEqualHex(signature, referralSignature(inviterId, inviteeId, botToken));
}
