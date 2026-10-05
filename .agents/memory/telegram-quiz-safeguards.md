---
name: Telegram quiz safeguards
description: Reasons for issued-question identity and production state constraints.
---

Public quiz identifiers must identify a particular issuance, not merely a question-bank row.

**Why:** The same bank question can repeat immediately, especially in a mode with very few questions. A delayed or retried submission must not grade the next occurrence, reset its timer, or overwrite an earlier result.

**How to apply:** Keep issuance identity, original server deadline, user ownership, and consumed status together. Re-fetches resume the original deadline; retries may return the stored result but cannot change it.

Local SQLite security state is suitable only when all requests reach the same surviving database. Do not assume that preview success proves a reliable Autoscale rollout.

**Why:** Replit's documented Autoscale filesystem behavior does not guarantee persistence across restarts or redeployments, and separate instances do not share local attempt/rate-limit records.

**How to apply:** Before a production rollout, resolve shared durable security state and the polling bot's long-running hosting. Preserve the existing question bank; obtain approval before changing storage or deployment arrangements.

Authentication repairs must not reset, replace, or delete database data, and must preserve quiz, PRO, referral, and admin behavior.

**Why:** The user explicitly scoped Telegram authorization work to leave these data and features intact.

**How to apply:** Keep auth fixes limited to the signed-initData flow and related UI diagnostics; ask before any database or feature changes.
