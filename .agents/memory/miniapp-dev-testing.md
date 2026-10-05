---
name: Mini App dev-preview testing
description: How to exercise the Telegram Mini App (user + admin screens) in a normal browser during development.
---

Browser preview has no Telegram initData, so the frontend sends a dev-only demo user header (?dev=N picks user 1000000+N, read once at boot). Demo users are never admins by default.

**Why:** Admin is enforced server-side by Telegram ID, and screenshots/testers cannot sign in to Telegram.

**How to apply:** To verify admin UI, temporarily run the API server yourself (background shell, not a detached nohup — it gets killed) with `ADMIN_TELEGRAM_IDS=884336506,1000003`, open `/admin?dev=3`, then kill it and restart the API workflow. Onboard demo users via curl (POST /api/session, /api/me/phone with phoneNumber, /api/me/region). Clean the dev DB of demo/test rows afterwards.
