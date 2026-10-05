# ISHLISH PERSONS

Telegram bot + Telegram Mini App for ISHLISH PERSONS English level tests (Basic A1–C2 with certificate)
and a PRO survivor challenge with a 1,000,000 UZS prize. UI languages: Uzbek (default) and English.

## Run & Operate

- `Telegram Bot` workflow — `python main.py` (aiogram, polling). Needs `TEST_TOKEN`, `WEB_APP_URL`.
- `artifacts/api-server: API Server` — Express API at `/api` (Postgres via `@workspace/db`).
- `artifacts/persons-lc-challenge: web` — the Mini App (React + Vite) at `/`.
- Schema changes: edit `lib/db/src/schema/`, then `pnpm --filter @workspace/db run push`.
- API contract: edit `lib/api-spec/openapi.yaml`, then run codegen (`pnpm --filter @workspace/api-spec run codegen`).

## Where things live

- `main.py` — chat bot. `/start ref_<id>` opens the Mini App with a signed `?ref=&rs=` param;
  it never credits referrals itself. Bot chat quizzes and `/admin` broadcast still use local SQLite (`bot_database.db`).
- `artifacts/api-server/src/` — `lib/` (config constants, Telegram initData/contact HMAC checks, Bot API),
  `middlewares/auth.ts`, `services/` (users, game engine, question seeding), `routes/`, `data/questions.ts` (seed bank).
- `artifacts/persons-lc-challenge/src/` — `lib/telegram.ts` (WebApp wrapper + auth header), `i18n/` (all UI strings, uz/en).

## Architecture decisions

- The server is authoritative: answers, correctness, timer deadlines, score, hearts and chances live in Postgres.
  The correct option is never sent to the client. A timeout counts as wrong.
- Auth = Telegram `initData` HMAC in header `X-Telegram-Init-Data`. Dev-only browser fallback header
  `X-Dev-User-Id` (IDs 1000001–1000003, non-admin) works only when `NODE_ENV=development`.
- Admin = Telegram ID `884336506` (config `ADMIN_TELEGRAM_IDS`), checked on the server for every admin route.
- Referrals: attached only when the user row is first created, from a signed source (initData `start_param`
  or the bot's `rs` signature). Credited only after phone + region onboarding: +50 points, every 3 = +1 PRO chance.
- PRO: 2 hearts, 1 free game per Tashkent day + extra chances, dynamic timer 12/8/5 s by current load.
- Questions used in past games are deactivated instead of deleted. Admin actions are logged.
- Admin question edits affect only the Mini App (Postgres). The bot's chat quiz bank in SQLite is separate.

## Product

Mandatory onboarding (Telegram phone share + one of 12 regions), home, Basic, PRO, results/certificate,
weekly/overall leaderboard, friends/referrals, profile with language switch, support (917119966, messages
forwarded to the admin), and an admin dashboard (users with phones, PRO monitor, questions CRUD,
referrals, support inbox, analytics, settings).

## Gotchas

- Do not log bot tokens or raw initData.
- Mini App links in the bot must point to the published URL (`WEB_APP_URL`), never localhost.
- The polling bot is not part of the Autoscale deployment; it runs from the `Telegram Bot` workflow.
