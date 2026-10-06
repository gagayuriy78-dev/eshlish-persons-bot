# ISHLISH PERSONS

Telegram bot for ISHLISH PERSONS English-language level tests, built with Python, aiogram, and SQLite.

## Setup

For the Replit workflow, add the Telegram token as the `TEST_TOKEN` secret. For a
server deployment, set `BOT_TOKEN` in the server environment. If both variables
are present, the existing `TEST_TOKEN` takes precedence.

## Run

```bash
python main.py
```

The bot responds to `/start` with an ISHLISH PERSONS welcome menu for `Oson`, `O'rta`, and
`Murakkab` difficulty levels. Users can then choose `Grammatika` or `Yaqin so'zlar`.
Each difficulty/category combination starts its own question bank. Users can answer
multiple-choice or written questions and receive a final score. The existing A1-C2
quiz engine remains available through `/quiz`.

## Add questions

Questions are imported from `questions.csv` when the bot starts. Existing rows are
not duplicated, so adding new rows works with an existing database. Use this column
order:

```text
level,difficulty,category,question_type,question_text,option_a,option_b,option_c,option_d,correct_answer
```

Legacy A1-C2 questions use `level` and leave `difficulty` and `category` empty.
ISHLISH PERSONS questions use both `difficulty` (`Oson`, `O'rta`, or `Murakkab`) and
`category` (`Grammatika` or `Yaqin so'zlar`) and leave `level` empty. Set
`question_type` to `test` for multiple-choice questions or `write` for written
answers. For `write` questions, leave the four option columns empty.

## Admin panel

Administrators can open the panel with:

```text
/admin
```

The panel provides `📊 Statistika` and `📢 Xabar tarqatish` actions. The configured
administrator ID defaults to `884336506`; set `ADMIN_TELEGRAM_IDS` to a
comma-separated allow-list to configure it through the environment.

## Registration (Quiet Progress database)

On `/start`, a user who has not registered yet gets a «📝 Ro'yxatdan o'tish»
button that opens the registration Mini App on the Quiet Progress site
(`/miniapp.html`, or `REGISTRATION_WEBAPP_URL`): phone number via Telegram's
signed contact sharing, then first name, last name, address and age. The site
verifies the Telegram signatures, saves the person (visible at `/admin.html`),
and messages the user and the administrators. Registered users get the usual
welcome.

Set `QP_BOT_TOKEN` to the same value as `BOT_API_TOKEN` on the Quiet Progress
server. The API defaults to the Quiet Progress endpoint and can be changed with
`QP_API`. Without `QP_BOT_TOKEN`, or while the API is unreachable, registration
is skipped and the bot works as before.

`WEB_APP_URL` is optional. Set it to an already-hosted HTTPS Mini App URL to
configure the Telegram menu button; without it, the quiz and admin bot still
run, but the Mini App button is not configured.

## Google Cloud VM

For VM setup, persistent SQLite storage, systemd, restart-on-reboot behavior,
and journal logs, follow [the Google Cloud VM deployment guide](deploy/google-cloud-vm.md).

## User accounts and results

The existing SQLite database also stores optional phone/region fields, signup time,
referral relationships, question attempt/failure rates, and completed quiz sessions.
Referral links grant the inviter 50 points once per new user. A certificate image is
sent when a user's cumulative score first reaches 50 points.
