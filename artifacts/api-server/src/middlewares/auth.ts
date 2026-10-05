import type { NextFunction, Request, Response } from "express";
import { AUTH_MAX_AGE_SECONDS, isAdminId } from "../lib/config";
import { HttpError } from "../lib/http-error";
import { logger } from "../lib/logger";
import { validateInitData, type TelegramUser } from "../lib/telegram-auth";

declare global {
  namespace Express {
    interface Request {
      tgUser?: TelegramUser;
      tgStartParam?: string | null;
    }
  }
}

const DEV_USER_IDS = new Set([1000001, 1000002, 1000003]);

function authFailureReason(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  switch (message) {
    case "missing":
      return "missing_data";
    case "duplicate field":
      return "duplicate_field";
    case "bad signature":
      return "bad_signature";
    case "expired":
      return "expired";
    case "bad auth date":
      return "invalid_auth_date";
    case "bad user":
      return "invalid_user";
    default:
      return "invalid_payload";
  }
}

/** Validates Telegram initData. Never trusts a client-supplied Telegram ID. */
export function requireTelegramUser(req: Request, _res: Response, next: NextFunction) {
  const raw = req.header("x-telegram-init-data");
  if (raw) {
    try {
      const { user, startParam } = validateInitData(raw, process.env["TEST_TOKEN"] ?? "", AUTH_MAX_AGE_SECONDS);
      req.tgUser = user;
      req.tgStartParam = startParam;
      return next();
    } catch (error) {
      const failure = authFailureReason(error);
      logger.warn(
        {
          authFailure: failure,
          method: req.method,
          path: req.path,
        },
        "Telegram Mini App initData rejected",
      );
      const expired = failure === "expired";
      return next(new HttpError(
        401,
        expired
          ? "Telegram authorization expired. Reopen the Mini App."
          : "Telegram authorization could not be verified. Reopen the Mini App.",
        expired ? "AUTH_EXPIRED" : "AUTH_INVALID",
      ));
    }
  }
  // Browser preview fallback: development only, fixed non-admin demo accounts.
  const devId = Number(req.header("x-dev-user-id"));
  if (process.env["NODE_ENV"] === "development" && DEV_USER_IDS.has(devId)) {
    req.tgUser = { id: devId, first_name: "Demo", last_name: String(devId).slice(-1), username: `demo${String(devId).slice(-1)}` };
    req.tgStartParam = null;
    return next();
  }
  logger.debug(
    { authFailure: "missing_init_data", method: req.method, path: req.path },
    "Telegram Mini App initData missing",
  );
  return next(new HttpError(401, "Open this app from Telegram to continue.", "AUTH_REQUIRED"));
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireTelegramUser(req, res, (err?: unknown) => {
    if (err) return next(err);
    if (!req.tgUser || !isAdminId(req.tgUser.id)) {
      return next(new HttpError(403, "Admin access only.", "FORBIDDEN"));
    }
    next();
  });
}

const buckets = new Map<string, { start: number; count: number }>();

/** Simple per-user fixed-window limiter (approximate across instances). */
export function rateLimit(scope: string, limit: number, windowMs = 60_000) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const key = `${scope}:${req.tgUser?.id ?? req.ip}`;
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || now - bucket.start > windowMs) {
      buckets.set(key, { start: now, count: 1 });
      if (buckets.size > 50_000) buckets.clear();
      return next();
    }
    bucket.count += 1;
    if (bucket.count > limit) return next(new HttpError(429, "Too many requests. Please wait a moment.", "RATE_LIMITED"));
    next();
  };
}
