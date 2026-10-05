/**
 * Thin, defensive wrapper around window.Telegram.WebApp.
 * Every call is optional-chained so the app never crashes outside Telegram
 * or on older Telegram clients that lack newer methods.
 */
import { setExtraHeadersGetter } from "@workspace/api-client-react";

type HapticImpact = "light" | "medium" | "heavy" | "rigid" | "soft";
type HapticNotice = "error" | "success" | "warning";

interface TgWebApp {
  initData: string;
  initDataUnsafe: { user?: { id: number; first_name?: string; language_code?: string }; start_param?: string };
  version: string;
  platform: string;
  colorScheme: "light" | "dark";
  isExpanded: boolean;
  safeAreaInset?: { top: number; bottom: number; left: number; right: number };
  contentSafeAreaInset?: { top: number; bottom: number; left: number; right: number };
  ready: () => void;
  expand: () => void;
  close: () => void;
  isVersionAtLeast?: (v: string) => boolean;
  setHeaderColor?: (c: string) => void;
  setBackgroundColor?: (c: string) => void;
  setBottomBarColor?: (c: string) => void;
  disableVerticalSwipes?: () => void;
  enableClosingConfirmation?: () => void;
  disableClosingConfirmation?: () => void;
  requestContact?: (cb: (shared: boolean, response?: { status: string; responseUnsafe?: unknown; response?: string }) => void) => void;
  openTelegramLink?: (url: string) => void;
  openLink?: (url: string) => void;
  showAlert?: (message: string, cb?: () => void) => void;
  onEvent?: (event: string, cb: (...args: unknown[]) => void) => void;
  offEvent?: (event: string, cb: (...args: unknown[]) => void) => void;
  HapticFeedback?: {
    impactOccurred: (style: HapticImpact) => void;
    notificationOccurred: (type: HapticNotice) => void;
    selectionChanged: () => void;
  };
  BackButton?: { show: () => void; hide: () => void; onClick: (cb: () => void) => void; offClick: (cb: () => void) => void };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp };
  }
}

export function getWebApp(): TgWebApp | null {
  return typeof window !== "undefined" ? (window.Telegram?.WebApp ?? null) : null;
}

/** True only when we are inside Telegram with signed initData. */
export function isInTelegram(): boolean {
  return Boolean(getWebApp()?.initData);
}

/** Browser preview in local development uses a fixed non-admin demo account. */
export function isDevPreview(): boolean {
  return import.meta.env.DEV && !isInTelegram();
}

function versionAtLeast(v: string): boolean {
  try {
    return Boolean(getWebApp()?.isVersionAtLeast?.(v));
  } catch {
    return false;
  }
}

function applySafeArea() {
  const app = getWebApp();
  const root = document.documentElement;
  const safe = app?.safeAreaInset ?? { top: 0, bottom: 0, left: 0, right: 0 };
  const content = app?.contentSafeAreaInset ?? { top: 0, bottom: 0, left: 0, right: 0 };
  root.style.setProperty("--tg-safe-top", `${(safe.top ?? 0) + (content.top ?? 0)}px`);
  root.style.setProperty("--tg-safe-bottom", `${(safe.bottom ?? 0) + (content.bottom ?? 0)}px`);
}

let initialised = false;

/** Call once at startup. Safe to call outside Telegram. */
export function initTelegram(): void {
  if (initialised) return;
  initialised = true;
  const app = getWebApp();
  // Read once: client-side navigation drops the ?dev= query param.
  const devUserId = import.meta.env.DEV
    ? String(1000000 + (Number(new URLSearchParams(window.location.search).get("dev")) || 1))
    : null;
  setExtraHeadersGetter((): Record<string, string> | null => {
    const data = getWebApp()?.initData;
    if (data) return { "X-Telegram-Init-Data": data };
    if (devUserId) return { "X-Dev-User-Id": devUserId };
    return null;
  });
  if (!app) return;
  try {
    app.ready();
    app.expand();
    if (versionAtLeast("6.1")) {
      app.setHeaderColor?.("#e8f4eb");
      app.setBackgroundColor?.("#f5faf6");
    }
    if (versionAtLeast("7.10")) app.setBottomBarColor?.("#f5faf6");
    if (versionAtLeast("7.7")) app.disableVerticalSwipes?.();
    applySafeArea();
    app.onEvent?.("safeAreaChanged", applySafeArea);
    app.onEvent?.("contentSafeAreaChanged", applySafeArea);
  } catch {
    /* older clients: ignore */
  }
}

/** Referral params the bot signs into the Mini App URL (?ref=..&rs=..). */
export function getLaunchReferral(): { ref?: string; refSig?: string } {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref") ?? undefined;
  const refSig = params.get("rs") ?? undefined;
  return ref && refSig ? { ref, refSig } : {};
}

export function getTelegramLanguage(): "uz" | "en" | null {
  const code = getWebApp()?.initDataUnsafe?.user?.language_code;
  if (!code) return null;
  return code.startsWith("en") ? "en" : "uz";
}

export const haptic = {
  tap: () => safe(() => getWebApp()?.HapticFeedback?.impactOccurred("light")),
  impact: (style: HapticImpact = "medium") => safe(() => getWebApp()?.HapticFeedback?.impactOccurred(style)),
  success: () => safe(() => getWebApp()?.HapticFeedback?.notificationOccurred("success")),
  error: () => safe(() => getWebApp()?.HapticFeedback?.notificationOccurred("error")),
  warning: () => safe(() => getWebApp()?.HapticFeedback?.notificationOccurred("warning")),
  select: () => safe(() => getWebApp()?.HapticFeedback?.selectionChanged()),
};

function safe(fn: () => void) {
  try {
    fn();
  } catch {
    /* haptics unsupported */
  }
}

export function canRequestContact(): boolean {
  return Boolean(getWebApp()?.requestContact) && versionAtLeast("6.9");
}

/**
 * Ask Telegram for the user's phone. Resolves with the signed response string
 * the server verifies, or null if the user declined.
 */
export function requestContact(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const app = getWebApp();
    if (!app?.requestContact) return reject(new Error("unsupported"));
    try {
      app.requestContact((shared, result) => {
        if (!shared || !result?.response) return resolve(null);
        resolve(result.response);
      });
    } catch (err) {
      reject(err);
    }
  });
}

/** Open the Telegram share sheet for a link (falls back to a normal link). */
export function shareLink(url: string, text: string): void {
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  const app = getWebApp();
  if (app?.openTelegramLink) app.openTelegramLink(shareUrl);
  else window.open(shareUrl, "_blank", "noopener");
}

export function openPhone(phone: string): void {
  window.location.href = `tel:+998${phone}`;
}

export function setClosingConfirmation(enabled: boolean): void {
  safe(() => {
    if (!versionAtLeast("6.2")) return;
    const app = getWebApp();
    if (enabled) app?.enableClosingConfirmation?.();
    else app?.disableClosingConfirmation?.();
  });
}

/** Show Telegram's native back button while `handler` is registered. */
export function bindTelegramBackButton(handler: (() => void) | null): () => void {
  const app = getWebApp();
  const button = versionAtLeast("6.1") ? app?.BackButton : undefined;
  if (!button) return () => undefined;
  if (!handler) {
    button.hide();
    return () => undefined;
  }
  button.onClick(handler);
  button.show();
  return () => {
    button.offClick(handler);
    button.hide();
  };
}
