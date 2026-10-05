import { logger } from "./logger";

let cachedUsername: string | null = null;
let lookupPromise: Promise<string | null> | null = null;

function token(): string | null {
  return process.env["TEST_TOKEN"] || null;
}

async function call(method: string, body: Record<string, unknown>): Promise<any> {
  const botToken = token();
  if (!botToken) throw new Error("TEST_TOKEN missing");
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  const data = (await response.json()) as { ok: boolean; result?: unknown; description?: string };
  if (!data.ok) throw new Error(`Telegram ${method} failed: ${data.description ?? response.status}`);
  return data.result;
}

export async function getBotUsername(): Promise<string | null> {
  if (cachedUsername) return cachedUsername;
  lookupPromise ??= call("getMe", {})
    .then((me: { username?: string }) => {
      cachedUsername = me.username ?? null;
      return cachedUsername;
    })
    .catch((err: Error) => {
      logger.warn({ err: err.message }, "Could not resolve bot username");
      return null;
    })
    .finally(() => {
      lookupPromise = null;
    });
  return lookupPromise;
}

/** Best-effort notification; never throws. */
export async function sendTelegramMessage(chatId: number, text: string): Promise<boolean> {
  try {
    await call("sendMessage", { chat_id: chatId, text, disable_web_page_preview: true });
    return true;
  } catch (err) {
    logger.warn({ chatId, err: (err as Error).message }, "Telegram sendMessage failed");
    return false;
  }
}
