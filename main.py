"""Telegram bot with level-based English quizzes."""

import asyncio
import csv
import hashlib
import hmac
from question_bank import import_question_rows
import io
import os
import re
from urllib.parse import urlencode
import random
import sqlite3
from pathlib import Path
from typing import Any

from aiogram import Bot, Dispatcher, F, types
from aiogram.exceptions import (
    TelegramBadRequest,
    TelegramForbiddenError,
    TelegramRetryAfter,
)
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (
    BufferedInputFile,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    MenuButtonWebApp,
    ReplyKeyboardMarkup,
    ReplyKeyboardRemove,
    WebAppInfo,
)
from PIL import Image, ImageDraw, ImageFont


TOKEN = os.environ.get("TEST_TOKEN") or os.environ.get("BOT_TOKEN")
WEB_APP_URL = os.getenv("WEB_APP_URL", "").strip()
# Page that sends people to t.me/personslc (see main(): the chat menu button).
CHANNEL_MENU_URL = os.getenv(
    "CHANNEL_MENU_URL", "https://quiet-progress-720242842790.europe-west1.run.app/channel.html"
).strip()
DATABASE_PATH = Path(os.getenv("BOT_DATABASE_PATH", "bot_database.db"))
QUESTIONS_CSV_PATH = Path("questions.csv")

if WEB_APP_URL and (
    not WEB_APP_URL.startswith("https://")
    or "YOUR-REPLIT-APP-URL" in WEB_APP_URL
):
    raise RuntimeError("WEB_APP_URL Mini App'ning haqiqiy HTTPS manzili bo'lishi kerak.")

if not TOKEN:
    raise RuntimeError(
        "BOT_TOKEN (or TEST_TOKEN) topilmadi. Telegram bot tokenini environment secret sifatida sozlang."
    )

bot = Bot(token=TOKEN)
dp = Dispatcher()
bot_username = ""


class QuizState(StatesGroup):
    """States used while a user is answering a quiz."""

    testing = State()
    sample_answering = State()


class AdminState(StatesGroup):
    """States used by admin-only flows."""

    broadcasting = State()


LEVEL_BUTTONS = {
    "🇬🇧 A1": "A1",
    "🇬🇧 A2": "A2",
    "🚀 B1": "B1",
    "🚀 B2": "B2",
    "🔥 C1": "C1",
    "🔥 C2": "C2",
}

DIFFICULTY_BUTTONS = {
    "🟢 Oson": "Oson",
    "🟡 O'rta": "O'rta",
    "🔴 Murakkab": "Murakkab",
}

CATEGORY_BUTTONS = {
    "📝 Grammatika": "Grammatika",
    "🔤 Yaqin so'zlar": "Yaqin so'zlar",
}

MAIN_MENU_BUTTONS = {
    "🎓 Testni boshlash",
    "👤 Profil",
    "🏆 Reyting",
    "📞 Bepul dars",
}

def _configured_admin_ids() -> set[int]:
    """Read the allow-list without removing the existing administrator default."""
    configured_ids = os.getenv("ADMIN_TELEGRAM_IDS", "").strip()
    if not configured_ids:
        return {884336506}
    try:
        admin_ids = {int(value.strip()) for value in configured_ids.split(",") if value.strip()}
    except ValueError:
        raise RuntimeError("ADMIN_TELEGRAM_IDS faqat vergul bilan ajratilgan Telegram ID'lar bo'lishi kerak.") from None
    if not admin_ids or any(user_id <= 0 for user_id in admin_ids):
        raise RuntimeError("ADMIN_TELEGRAM_IDS ichida musbat Telegram ID'lar bo'lishi kerak.")
    return admin_ids


ADMIN_IDS = _configured_admin_ids()

CSV_FIELDS = [
    "level",
    "difficulty",
    "category",
    "question_type",
    "question_text",
    "option_a",
    "option_b",
    "option_c",
    "option_d",
    "correct_answer",
]


def init_db() -> None:
    """Create the users and questions tables if they do not exist."""
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DATABASE_PATH) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                telegram_id INTEGER PRIMARY KEY,
                first_name TEXT NOT NULL,
                current_level TEXT,
                score INTEGER NOT NULL DEFAULT 0,
                phone TEXT,
                region TEXT,
                referred_by INTEGER,
                joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        user_columns = {
            row[1]
            for row in connection.execute("PRAGMA table_info(users)").fetchall()
        }
        for column, definition in (
            ("phone", "TEXT"),
            ("region", "TEXT"),
            ("referred_by", "INTEGER"),
            ("joined_at", "TEXT"),
        ):
            if column not in user_columns:
                connection.execute(
                    f"ALTER TABLE users ADD COLUMN {column} {definition}"
                )
        connection.execute(
            "UPDATE users SET joined_at = CURRENT_TIMESTAMP WHERE joined_at IS NULL"
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                level TEXT NOT NULL DEFAULT '',
                difficulty TEXT NOT NULL DEFAULT '',
                category TEXT NOT NULL DEFAULT '',
                question_type TEXT NOT NULL,
                question_text TEXT NOT NULL,
                option_a TEXT NOT NULL DEFAULT '',
                option_b TEXT NOT NULL DEFAULT '',
                option_c TEXT NOT NULL DEFAULT '',
                option_d TEXT NOT NULL DEFAULT '',
                correct_answer TEXT NOT NULL,
                attempts_count INTEGER NOT NULL DEFAULT 0,
                failures_count INTEGER NOT NULL DEFAULT 0,
                failure_rate REAL NOT NULL DEFAULT 0.0
            )
            """
        )
        existing_columns = {
            row[1]
            for row in connection.execute("PRAGMA table_info(questions)").fetchall()
        }
        for column, definition in (
            ("difficulty", "TEXT NOT NULL DEFAULT ''"),
            ("category", "TEXT NOT NULL DEFAULT ''"),
            ("attempts_count", "INTEGER NOT NULL DEFAULT 0"),
            ("failures_count", "INTEGER NOT NULL DEFAULT 0"),
            ("failure_rate", "REAL NOT NULL DEFAULT 0.0"),
        ):
            if column not in existing_columns:
                connection.execute(
                    f"ALTER TABLE questions ADD COLUMN {column} {definition}"
                )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS referrals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                inviter_id INTEGER NOT NULL,
                invitee_id INTEGER NOT NULL UNIQUE,
                is_used INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_referrals_inviter ON referrals(inviter_id)"
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS game_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_id INTEGER NOT NULL,
                mode TEXT NOT NULL,
                achieved_level TEXT,
                difficulty TEXT,
                category TEXT,
                score INTEGER NOT NULL DEFAULT 0,
                mistakes_count INTEGER NOT NULL DEFAULT 0,
                question_count INTEGER NOT NULL DEFAULT 0,
                played_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
            )
            """
        )


def import_questions_from_csv() -> int:
    """Import new rows from questions.csv without duplicating existing rows."""
    if not QUESTIONS_CSV_PATH.exists():
        return 0

    with sqlite3.connect(DATABASE_PATH) as connection:
        connection.execute("BEGIN IMMEDIATE")
        return import_question_rows(connection, QUESTIONS_CSV_PATH)


def get_difficulty_keyboard() -> ReplyKeyboardMarkup:
    """Build the main difficulty menu."""
    return ReplyKeyboardMarkup(
        keyboard=[
            [
                KeyboardButton(text="🟢 Oson"),
                KeyboardButton(text="🟡 O'rta"),
            ],
            [
                KeyboardButton(text="🔴 Murakkab"),
            ],
        ],
        resize_keyboard=True,
        input_field_placeholder="Darajani tanlang...",
    )


def get_main_menu_keyboard() -> ReplyKeyboardMarkup:
    """Build the main ISHLISH PERSONS menu."""
    return ReplyKeyboardMarkup(
        keyboard=[
            [
                KeyboardButton(text="🎓 Testni boshlash"),
                KeyboardButton(text="👤 Profil"),
            ],
            [
                KeyboardButton(text="🏆 Reyting"),
                KeyboardButton(text="🔗 Do'stlarni taklif qilish"),
            ],
            [
                KeyboardButton(text="📞 Bepul dars"),
            ],
        ],
        resize_keyboard=True,
        input_field_placeholder="Menyudan tanlang...",
    )


def referral_signature(inviter_id: int, invitee_id: int) -> str:
    """HMAC the Mini App backend verifies so referral params cannot be forged."""
    key = hashlib.sha256(f"referral:{TOKEN}".encode()).digest()
    message = f"{inviter_id}:{invitee_id}".encode()
    return hmac.new(key, message, hashlib.sha256).hexdigest()[:32]


def build_web_app_url(invitee_id: int, inviter_id: int | None = None) -> str:
    """Mini App URL, carrying a signed referral when the user came via a link."""
    if not inviter_id or inviter_id == invitee_id:
        return WEB_APP_URL
    separator = "&" if "?" in WEB_APP_URL else "?"
    query = urlencode({"ref": inviter_id, "rs": referral_signature(inviter_id, invitee_id)})
    return f"{WEB_APP_URL}{separator}{query}"


def parse_referral_payload(text: str | None) -> int | None:
    """Accept /start ref_<id> (current format) and /start <id> (legacy links)."""
    parts = (text or "").split(maxsplit=1)
    if len(parts) < 2:
        return None
    match = re.fullmatch(r"(?:ref_)?(\d{1,15})", parts[1].strip())
    return int(match.group(1)) if match else None


def get_web_app_start_keyboard(url: str = WEB_APP_URL) -> InlineKeyboardMarkup:
    """Inline button that opens the Telegram Mini App with signed initData."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="Start", web_app=WebAppInfo(url=url))]
        ]
    )


def admin_menu() -> ReplyKeyboardMarkup:
    """Build the admin-only keyboard."""
    return ReplyKeyboardMarkup(
        keyboard=[
            [
                KeyboardButton(text="📢 Xabar tarqatish"),
                KeyboardButton(text="📊 Statistika"),
            ],
            [KeyboardButton(text="⬅️ Bosh menyu")],
        ],
        resize_keyboard=True,
        input_field_placeholder="Admin amalini tanlang...",
    )


def get_category_keyboard() -> ReplyKeyboardMarkup:
    """Build the category menu shown after difficulty selection."""
    return ReplyKeyboardMarkup(
        keyboard=[
            [
                KeyboardButton(text="📝 Grammatika"),
                KeyboardButton(text="🔤 Yaqin so'zlar"),
            ],
            [KeyboardButton(text="⬅️ Bosh menyu")],
        ],
        resize_keyboard=True,
        input_field_placeholder="Yo'nalishni tanlang...",
    )


def get_quiz_levels_keyboard() -> ReplyKeyboardMarkup:
    """Build the existing A1-C2 menu for the full quiz engine."""
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="🇬🇧 A1"), KeyboardButton(text="🇬🇧 A2")],
            [KeyboardButton(text="🚀 B1"), KeyboardButton(text="🚀 B2")],
            [KeyboardButton(text="🔥 C1"), KeyboardButton(text="🔥 C2")],
        ],
        resize_keyboard=True,
        input_field_placeholder="Test darajasini tanlang...",
    )


def get_back_keyboard() -> ReplyKeyboardMarkup:
    """Build a keyboard with a single back button."""
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="⬅️ Bosh menyu")]],
        resize_keyboard=True,
    )


def get_contact_keyboard() -> ReplyKeyboardMarkup:
    """Build the keyboard used to request a phone number."""
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="📱 Raqamni yuborish", request_contact=True)],
            [KeyboardButton(text="⬅️ Bosh menyu")],
        ],
        resize_keyboard=True,
    )


def get_options_keyboard(options: list[str], question_index: int) -> InlineKeyboardMarkup:
    """Build a two-column keyboard for multiple-choice answers.

    The callback carries the question index so a button on an older question
    message can't answer the current one."""
    rows = []
    for row_start in range(0, len(options), 2):
        rows.append(
            [
                InlineKeyboardButton(
                    text=option,
                    callback_data=f"opt_{question_index}_{row_start + offset}",
                )
                for offset, option in enumerate(options[row_start : row_start + 2])
            ]
        )
    return InlineKeyboardMarkup(
        inline_keyboard=rows
    )


def question_text(index: int, total: int, text: str) -> str:
    """Format a question prompt without requiring Telegram parse mode."""
    return f"📝 Savol {index}/{total}:\n\n{text}"


def save_user_level(telegram_id: int, first_name: str, level: str) -> None:
    """Create the user when needed and save the selected level."""
    with sqlite3.connect(DATABASE_PATH) as connection:
        connection.execute(
            """
            INSERT INTO users (telegram_id, first_name, current_level, joined_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(telegram_id) DO UPDATE SET
                first_name = excluded.first_name,
                current_level = excluded.current_level
            """,
            (telegram_id, first_name, level),
        )


def is_admin(user_id: int) -> bool:
    """Return whether a Telegram user is allowed to use the admin panel."""
    return user_id in ADMIN_IDS


def get_admin_statistics() -> str:
    """Build a compact statistics report from the local database."""
    with sqlite3.connect(DATABASE_PATH) as connection:
        user_count, total_score = connection.execute(
            """
            SELECT COUNT(*), COALESCE(SUM(score), 0)
            FROM users
            """
        ).fetchone()
        question_count = connection.execute(
            "SELECT COUNT(*) FROM questions"
        ).fetchone()[0]
        session_count = connection.execute(
            "SELECT COUNT(*) FROM game_sessions"
        ).fetchone()[0]
        referral_count = connection.execute(
            "SELECT COUNT(*) FROM referrals"
        ).fetchone()[0]
        level_counts = connection.execute(
            """
            SELECT COALESCE(current_level, 'Noma''lum'), COUNT(*)
            FROM users
            GROUP BY current_level
            ORDER BY COUNT(*) DESC
            """
        ).fetchall()

    levels = "\n".join(
        f"• {level}: {count} ta" for level, count in level_counts
    ) or "• Hali ma'lumot yo'q"
    return (
        "📊 Bot statistikasi\n\n"
        f"👥 Foydalanuvchilar: {user_count}\n"
        f"🏆 Jami yig'ilgan ball: {total_score}\n"
        f"📝 Savollar: {question_count}\n\n"
        f"🎮 Test sessiyalari: {session_count}\n"
        f"🔗 Takliflar: {referral_count}\n\n"
        f"Darajalar:\n{levels}"
    )


async def get_referral_link(user_id: int) -> str:
    """Build a referral link using the bot username returned by Telegram."""
    global bot_username
    if not bot_username:
        bot_info = await bot.get_me()
        bot_username = bot_info.username or ""
    return f"https://t.me/{bot_username}?start=ref_{user_id}"


def add_score(user_id: int, points: int) -> tuple[int, int, str, str]:
    """Add points and return previous score, new score, level, and name."""
    with sqlite3.connect(DATABASE_PATH) as connection:
        user = connection.execute(
            """
            SELECT score, COALESCE(current_level, 'Noma''lum'), first_name
            FROM users
            WHERE telegram_id = ?
            """,
            (user_id,),
        ).fetchone()
        if user is None:
            return 0, 0, "Noma'lum", ""

        previous_score, level, first_name = user
        new_score = previous_score + points
        connection.execute(
            "UPDATE users SET score = ? WHERE telegram_id = ?",
            (new_score, user_id),
        )
        return previous_score, new_score, level, first_name


def record_question_attempt(question_id: int, is_correct: bool) -> None:
    """Update aggregate question attempt and failure statistics."""
    failure = 0 if is_correct else 1
    with sqlite3.connect(DATABASE_PATH) as connection:
        connection.execute(
            """
            UPDATE questions
            SET attempts_count = attempts_count + 1,
                failures_count = failures_count + ?,
                failure_rate =
                    CAST(failures_count + ? AS REAL) / (attempts_count + 1)
            WHERE id = ?
            """,
            (failure, failure, question_id),
        )


def record_game_session(
    telegram_id: int,
    *,
    mode: str,
    achieved_level: str | None,
    difficulty: str | None,
    category: str | None,
    score: int,
    mistakes_count: int,
    question_count: int,
) -> None:
    """Persist the result of a completed quiz."""
    with sqlite3.connect(DATABASE_PATH) as connection:
        connection.execute(
            """
            INSERT INTO game_sessions (
                telegram_id, mode, achieved_level, difficulty, category,
                score, mistakes_count, question_count
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                telegram_id,
                mode,
                achieved_level,
                difficulty,
                category,
                score,
                mistakes_count,
                question_count,
            ),
        )


async def send_certificate(
    chat_id: int,
    name: str,
    score: int,
    level: str,
) -> None:
    """Generate and send a certificate when a user reaches 50 points."""
    image = Image.new("RGB", (1000, 620), color=(245, 250, 246))
    draw = ImageDraw.Draw(image)

    try:
        font_large = ImageFont.truetype("DejaVuSans-Bold.ttf", 54)
        font_medium = ImageFont.truetype("DejaVuSans.ttf", 34)
    except OSError:
        font_large = ImageFont.load_default()
        font_medium = font_large

    draw.text((55, 55), "ISHLISH PERSONS Certificate", fill=(29, 29, 31), font=font_large)
    draw.text((55, 190), f"Foydalanuvchi: {name}", fill=(86, 86, 90), font=font_medium)
    draw.text((55, 270), f"Daraja: {level}", fill=(86, 86, 90), font=font_medium)
    draw.text(
        (55, 370),
        f"To'plangan ball: {score}",
        fill=(59, 121, 84),
        font=font_large,
    )

    image_bytes = io.BytesIO()
    image.save(image_bytes, format="PNG")
    await bot.send_photo(
        chat_id=chat_id,
        photo=BufferedInputFile(
            image_bytes.getvalue(),
            filename="ishlish-persons-certificate.png",
        ),
        caption="🎉 Tabriklaymiz! Siz 50 ballga erishdingiz.",
        reply_markup=get_main_menu_keyboard(),
    )


@dp.message(CommandStart())
async def start_handler(message: types.Message, state: FSMContext) -> None:
    """Welcome the user and open the Mini App, forwarding a signed referral.

    Referral rewards are granted by the Mini App backend only after the
    invited user finishes onboarding (phone + region), never here.
    """
    await state.clear()
    first_name = message.from_user.first_name
    referral_id = parse_referral_payload(message.text)

    with sqlite3.connect(DATABASE_PATH) as connection:
        existing_user = connection.execute(
            "SELECT 1 FROM users WHERE telegram_id = ?",
            (message.from_user.id,),
        ).fetchone()
        if existing_user is None:
            connection.execute(
                """
                INSERT INTO users (telegram_id, first_name, joined_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                """,
                (message.from_user.id, first_name),
            )
        else:
            connection.execute(
                "UPDATE users SET first_name = ? WHERE telegram_id = ?",
                (first_name, message.from_user.id),
            )

    await message.answer(
        f"Assalomu alaykum, {first_name}!\n\n"
        "ISHLISH PERSONS'ga xush kelibsiz.\n"
        "Darajangizni aniqlang, PRO rejimda 1 000 000 so'mlik sovrin uchun bellashing.\n\n"
        "Boshlash uchun quyidagi tugmani bosing.",
        reply_markup=get_web_app_start_keyboard(
            build_web_app_url(message.from_user.id, referral_id)
        ),
    )


@dp.message(F.text == "🎓 Testni boshlash")
async def test_menu(message: types.Message, state: FSMContext) -> None:
    """Open the difficulty menu."""
    await state.clear()
    await message.answer(
        "Qiyinlik darajasini tanlang:",
        reply_markup=get_difficulty_keyboard(),
    )


@dp.message(
    F.text.in_(
        [
            "👤 Profil",
            "🏆 Reyting",
            "🔗 Do'stlarni taklif qilish",
            "📞 Bepul dars",
        ]
    )
)
async def main_menu_action(message: types.Message) -> None:
    """Handle profile, leaderboard, and free-lesson menu actions."""
    if message.text == "👤 Profil":
        with sqlite3.connect(DATABASE_PATH) as connection:
            user = connection.execute(
                """
                SELECT first_name, score, current_level
                FROM users
                WHERE telegram_id = ?
                """,
                (message.from_user.id,),
            ).fetchone()

        first_name, score, level = user or (
            message.from_user.first_name,
            0,
            "Noma'lum",
        )
        display_level = level or "Noma'lum"
        await message.answer(
            f"👤 Ism: {first_name}\n"
            f"🏆 Ball: {score}\n"
            f"📊 Daraja: {display_level}",
            reply_markup=get_main_menu_keyboard(),
        )
        return

    if message.text == "🏆 Reyting":
        with sqlite3.connect(DATABASE_PATH) as connection:
            users = connection.execute(
                """
                SELECT first_name, score
                FROM users
                ORDER BY score DESC, first_name ASC
                LIMIT 5
                """
            ).fetchall()

        if users:
            leaderboard = "🏆 Top 5 o'quvchilar:\n\n" + "\n".join(
                f"{index}. {name} — {score} ball"
                for index, (name, score) in enumerate(users, start=1)
            )
        else:
            leaderboard = "🏆 Hozircha reytingda foydalanuvchilar yo'q."

        await message.answer(
            leaderboard,
            reply_markup=get_main_menu_keyboard(),
        )
        return

    if message.text == "🔗 Do'stlarni taklif qilish":
        referral_link = await get_referral_link(message.from_user.id)
        await message.answer(
            "3 ta do'st = 1 ta qo'shimcha PRO imkoniyat.\n"
            "Do'stingiz ro'yxatdan to'liq o'tgach (telefon va hudud), sizga +50 ball beriladi.\n\n"
            f"Sizning shaxsiy havolangiz:\n{referral_link}",
            reply_markup=get_main_menu_keyboard(),
        )
        return

    await message.answer(
        "🎯 Ingliz tilini tezroq o'rganmoqchimisiz?\n\n"
        "Bepul sinov darsimizga yozilish uchun "
        "«📱 Raqamni yuborish» tugmasini bosing.",
        reply_markup=get_contact_keyboard(),
    )


@dp.message(F.contact)
async def handle_contact(message: types.Message) -> None:
    """Store a submitted phone number and notify administrators."""
    if not message.contact:
        return

    user_id = message.from_user.id
    if message.contact.user_id and message.contact.user_id != user_id:
        await message.answer(
            "Iltimos, o'zingizning telefon raqamingizni yuboring.",
            reply_markup=get_contact_keyboard(),
        )
        return

    phone = message.contact.phone_number
    with sqlite3.connect(DATABASE_PATH) as connection:
        connection.execute(
            """
            INSERT INTO users (telegram_id, first_name, phone, joined_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(telegram_id) DO UPDATE SET
                phone = excluded.phone,
                first_name = excluded.first_name
            """,
            (user_id, message.from_user.first_name, phone),
        )

    await message.answer(
        "✅ Raqamingiz qabul qilindi! Administratorlarimiz tez orada "
        "siz bilan bog'lanishadi.",
        reply_markup=get_main_menu_keyboard(),
    )

    admin_message = (
        "🔥 Yangi mijoz (lead)!\n\n"
        f"Ismi: {message.from_user.first_name}\n"
        f"Raqami: {phone}\n"
        f"ID: {user_id}"
    )
    for admin_id in ADMIN_IDS:
        try:
            await bot.send_message(admin_id, admin_message)
        except (TelegramBadRequest, TelegramForbiddenError):
            pass


@dp.message(Command("admin"))
async def open_admin_panel(message: types.Message, state: FSMContext) -> None:
    """Open the admin panel for approved Telegram IDs only."""
    await state.clear()
    if not is_admin(message.from_user.id):
        await message.answer(
            "Bu bo'lim faqat adminlar uchun.",
            reply_markup=get_main_menu_keyboard(),
        )
        return

    await message.answer(
        "🛠 Admin paneliga xush kelibsiz.",
        reply_markup=admin_menu(),
    )


@dp.message(F.text == "📊 Statistika")
async def admin_statistics(message: types.Message) -> None:
    """Show bot statistics to an administrator."""
    if not is_admin(message.from_user.id):
        return
    await message.answer(get_admin_statistics(), reply_markup=admin_menu())


@dp.message(F.text == "📢 Xabar tarqatish")
async def start_broadcast(message: types.Message, state: FSMContext) -> None:
    """Ask an administrator for the broadcast text."""
    if not is_admin(message.from_user.id):
        return
    await state.set_state(AdminState.broadcasting)
    await message.answer(
        "Tarqatiladigan xabar matnini yuboring.\n"
        "Bekor qilish uchun /cancel yuboring.",
        reply_markup=get_back_keyboard(),
    )


@dp.message(Command("cancel"), AdminState.broadcasting)
async def cancel_broadcast(message: types.Message, state: FSMContext) -> None:
    """Cancel an active broadcast."""
    if not is_admin(message.from_user.id):
        return
    await state.clear()
    await message.answer(
        "Xabar tarqatish bekor qilindi.",
        reply_markup=admin_menu(),
    )


@dp.message(AdminState.broadcasting)
async def broadcast_message(message: types.Message, state: FSMContext) -> None:
    """Send the administrator's text to all registered users."""
    if not is_admin(message.from_user.id):
        await state.clear()
        return

    text = (message.text or "").strip()
    if text == "⬅️ Bosh menyu":
        await state.clear()
        await message.answer(
            "Bosh menyudasiz.",
            reply_markup=get_main_menu_keyboard(),
        )
        return
    if not text:
        await message.answer("Bo'sh xabar yuborib bo'lmaydi.")
        return

    with sqlite3.connect(DATABASE_PATH) as connection:
        user_ids = [
            row[0]
            for row in connection.execute(
                "SELECT telegram_id FROM users"
            ).fetchall()
        ]

    sent_count = 0
    failed_count = 0
    for user_id in user_ids:
        try:
            await bot.send_message(chat_id=user_id, text=text)
            sent_count += 1
        except TelegramRetryAfter as error:
            await asyncio.sleep(error.retry_after)
            try:
                await bot.send_message(chat_id=user_id, text=text)
                sent_count += 1
            except (TelegramBadRequest, TelegramForbiddenError, TelegramRetryAfter):
                failed_count += 1
        except (TelegramBadRequest, TelegramForbiddenError):
            failed_count += 1
        await asyncio.sleep(0.04)

    await state.clear()
    await message.answer(
        f"📢 Xabar tarqatildi.\n\n"
        f"✅ Yuborildi: {sent_count}\n"
        f"⚠️ Yuborilmadi: {failed_count}",
        reply_markup=admin_menu(),
    )


@dp.message(Command("quiz"))
async def quiz_menu(message: types.Message, state: FSMContext) -> None:
    """Open the existing A1-C2 question engine directly."""
    await state.clear()
    await message.answer(
        "Test darajasini tanlang:",
        reply_markup=get_quiz_levels_keyboard(),
    )


@dp.message(F.text.in_(list(DIFFICULTY_BUTTONS)))
async def choose_difficulty(message: types.Message, state: FSMContext) -> None:
    """Save the chosen difficulty and show test categories."""
    await state.clear()
    difficulty = DIFFICULTY_BUTTONS[message.text]
    await state.update_data(difficulty=difficulty)
    await message.answer(
        f"Siz {message.text} darajani tanladingiz.\n\n"
        "Qaysi yo'nalishda test ishlamoqchisiz?",
        reply_markup=get_category_keyboard(),
    )


@dp.message(F.text == "⬅️ Bosh menyu")
async def back_to_main_menu(message: types.Message, state: FSMContext) -> None:
    """Return to the difficulty menu."""
    await start_handler(message, state)


@dp.message(F.text.in_(list(CATEGORY_BUTTONS)))
async def choose_category(message: types.Message, state: FSMContext) -> None:
    """Start the question bank for the selected difficulty and category."""
    data = await state.get_data()
    difficulty = data.get("difficulty")
    if not difficulty:
        await message.answer(
            "Avval darajani tanlang:",
            reply_markup=get_difficulty_keyboard(),
        )
        return

    category = CATEGORY_BUTTONS[message.text]
    await start_selected_quiz(
        message,
        state,
        difficulty=difficulty,
        category=category,
    )


@dp.message(QuizState.sample_answering)
async def check_sample_answer(message: types.Message, state: FSMContext) -> None:
    """Check the starter question and award points."""
    data = await state.get_data()
    user_answer = (message.text or "").strip().lower()
    correct_answer = str(data.get("sample_correct_answer", "do"))
    is_correct = user_answer == correct_answer

    previous_score = new_score = 0
    level = "Noma'lum"
    name = message.from_user.first_name
    if is_correct:
        previous_score, new_score, level, name = add_score(
            message.from_user.id,
            10,
        )
        result = (
            "✅ To'g'ri javob! +10 ball.\n\n"
            "Izoh: ingliz tilida 'do homework' birikmasi ishlatiladi."
        )
    else:
        result = (
            f"❌ Noto'g'ri javob.\n\n"
            f"Siz '{user_answer}' deb yozdingiz. To'g'ri javob: '{correct_answer}'.\n"
            "Ingliz tilida uy vazifasini bajarish 'do homework' deyiladi."
        )

    record_game_session(
        message.from_user.id,
        mode="basic",
        achieved_level=None,
        difficulty=data.get("difficulty"),
        category=data.get("category"),
        score=10 if is_correct else 0,
        mistakes_count=0 if is_correct else 1,
        question_count=1,
    )
    await state.clear()
    await message.answer(result, reply_markup=get_main_menu_keyboard())
    if is_correct and previous_score < 50 <= new_score:
        await send_certificate(
            message.from_user.id,
            name or message.from_user.first_name,
            new_score,
            level,
        )


@dp.message(F.text.in_(list(LEVEL_BUTTONS)))
async def start_quiz(message: types.Message, state: FSMContext) -> None:
    """Start a quiz for the selected level."""
    selected_level = LEVEL_BUTTONS[message.text]
    await start_selected_quiz(message, state, level=selected_level)


async def start_selected_quiz(
    message: types.Message,
    state: FSMContext,
    *,
    level: str | None = None,
    difficulty: str | None = None,
    category: str | None = None,
) -> None:
    """Load and start either the legacy level quiz or an ISHLISH PERSONS quiz."""
    if level is None and (difficulty is None or category is None):
        raise ValueError("A level or both difficulty and category are required")

    await state.clear()
    save_user_level(
        message.from_user.id,
        message.from_user.first_name,
        level or difficulty or "",
    )

    with sqlite3.connect(DATABASE_PATH) as connection:
        if level is not None:
            questions = connection.execute(
                """
                SELECT id, level, question_type, question_text,
                       option_a, option_b, option_c, option_d, correct_answer
                FROM questions
                WHERE level = ?
                ORDER BY RANDOM()
                LIMIT 30
                """,
                (level,),
            ).fetchall()
        else:
            questions = connection.execute(
                """
                SELECT id, level, question_type, question_text,
                       option_a, option_b, option_c, option_d, correct_answer
                FROM questions
                WHERE difficulty = ? AND category = ?
                ORDER BY RANDOM()
                LIMIT 30
                """,
                (difficulty, category),
            ).fetchall()

    if not questions:
        selection = (
            level
            if level is not None
            else f"{difficulty} — {category}"
        )
        await message.answer(
            f"{selection} uchun hali savollar kiritilmagan.",
            reply_markup=(
                get_quiz_levels_keyboard()
                if level is not None
                else get_category_keyboard()
            ),
        )
        return

    await state.update_data(
        questions=questions,
        current_index=0,
        correct_answers=0,
        mistakes_count=0,
        level=level or difficulty,
        difficulty=difficulty,
        category=category,
        mode="basic",
    )
    await state.set_state(QuizState.testing)

    selection = level or f"{difficulty} — {category}"
    await message.answer(
        f"✅ Siz {selection} ni tanladingiz!\n"
        f"Test boshlandi. Jami {len(questions)} ta savol.",
        reply_markup=ReplyKeyboardRemove(),
    )
    await ask_question(message, state)


async def finish_quiz(message: types.Message, state: FSMContext) -> None:
    """Save the score and show the final quiz result."""
    data = await state.get_data()
    correct = data["correct_answers"]
    total = len(data["questions"])
    mistakes = data.get("mistakes_count", total - correct)

    previous_score, new_score, level, name = add_score(
        message.from_user.id,
        correct,
    )
    record_game_session(
        message.from_user.id,
        mode=data.get("mode", "basic"),
        achieved_level=level if data.get("difficulty") is None else None,
        difficulty=data.get("difficulty"),
        category=data.get("category"),
        score=correct,
        mistakes_count=mistakes,
        question_count=total,
    )

    await message.answer(
        f"🎉 Test yakunlandi!\n\n"
        f"📊 Siz {total} ta savoldan {correct} tasiga to'g'ri javob berdingiz.\n\n"
        "Yana test ishlash uchun /start ni bosing."
    )
    await state.clear()
    if previous_score < 50 <= new_score:
        await send_certificate(
            message.from_user.id,
            name or message.from_user.first_name,
            new_score,
            level,
        )


async def ask_question(message: types.Message, state: FSMContext) -> None:
    """Send the current question or finish the quiz."""
    data = await state.get_data()
    questions: list[tuple[Any, ...]] = data["questions"]
    index = data["current_index"]
    total = len(questions)

    if index >= total:
        await finish_quiz(message, state)
        return

    question = questions[index]
    question_type = question[2]
    text = question_text(index + 1, total, question[3])

    if question_type == "test":
        options = [option for option in question[4:8] if option]
        random.shuffle(options)
        await state.update_data(current_options=options, correct_ans=question[8])
        await message.answer(text, reply_markup=get_options_keyboard(options, index))
    elif question_type == "write":
        await state.update_data(correct_ans=question[8])
        await message.answer(text + "\n\nJavobingizni yozib yuboring:")
    else:
        await state.update_data(current_index=index + 1)
        await message.answer(
            "Bu savol turi hozircha qo'llab-quvvatlanmaydi. Keyingi savolga o'tamiz."
        )
        await ask_question(message, state)


@dp.callback_query(QuizState.testing, F.data.startswith("opt_"))
async def handle_test_answer(
    callback: types.CallbackQuery, state: FSMContext
) -> None:
    """Check an inline multiple-choice answer."""
    if not callback.message:
        await callback.answer("Savol xabari topilmadi.")
        return

    data = await state.get_data()
    try:
        _, question_index, option_index = (callback.data or "").split("_", 2)
        if int(question_index) != data["current_index"]:
            raise ValueError("stale question")
        selected_text = data["current_options"][int(option_index)]
    except (IndexError, KeyError, ValueError):
        await callback.answer("Bu savol eskirgan. /start ni bosing.", show_alert=True)
        return

    correct_answer = data["correct_ans"]
    is_correct = (
        str(selected_text).strip().lower()
        == str(correct_answer).strip().lower()
    )
    correct_answers = data["correct_answers"] + (1 if is_correct else 0)
    mistakes_count = data.get("mistakes_count", 0) + (0 if is_correct else 1)
    current_question = data["questions"][data["current_index"]]
    record_question_attempt(int(current_question[0]), is_correct)
    await state.update_data(
        correct_answers=correct_answers,
        mistakes_count=mistakes_count,
        current_index=data["current_index"] + 1,
    )

    old_text = callback.message.text or ""
    feedback = "✅ To'g'ri!" if is_correct else f"❌ Xato! To'g'ri javob: {correct_answer}"
    await callback.message.edit_text(
        f"{old_text}\n\n{feedback}",
        reply_markup=None,
    )
    await callback.answer()
    await ask_question(callback.message, state)


@dp.message(QuizState.testing)
async def handle_write_answer(message: types.Message, state: FSMContext) -> None:
    """Check a written answer and continue to the next question."""
    data = await state.get_data()
    user_text = message.text or ""
    correct_answer = data["correct_ans"]
    is_correct = (
        user_text.strip().lower() == str(correct_answer).strip().lower()
    )
    correct_answers = data["correct_answers"] + (1 if is_correct else 0)
    mistakes_count = data.get("mistakes_count", 0) + (0 if is_correct else 1)
    current_question = data["questions"][data["current_index"]]
    record_question_attempt(int(current_question[0]), is_correct)
    await state.update_data(
        correct_answers=correct_answers,
        mistakes_count=mistakes_count,
        current_index=data["current_index"] + 1,
    )

    if is_correct:
        await message.answer("✅ To'g'ri!")
    else:
        await message.answer(f"❌ Xato! To'g'ri javob: {correct_answer}")
    await ask_question(message, state)


async def main() -> None:
    """Initialize storage, import questions, and start polling."""
    global bot_username
    init_db()
    imported_count = import_questions_from_csv()
    bot_info = await bot.get_me()
    bot_username = bot_info.username or ""
    # The chat menu button leads to the Persons channel (the Mini App opens from
    # the «Start» button under /start). Menu buttons can't be plain links, so it
    # opens a tiny page that hands over to the channel and closes itself.
    if CHANNEL_MENU_URL:
        try:
            await bot.set_chat_menu_button(
                menu_button=MenuButtonWebApp(
                    text="Persons oilasiga qo'shilish", web_app=WebAppInfo(url=CHANNEL_MENU_URL)
                )
            )
        except TelegramBadRequest as error:
            print(f"Menu tugmasini o'rnatib bo'lmadi: {error}")
    else:
        print("CHANNEL_MENU_URL sozlanmagan; menu tugmasi o'rnatilmadi.")
    print(
        "Bot ishga tushdi va test o'tkazishga tayyor..."
        f" CSV dan {imported_count} ta yangi savol yuklandi."
    )
    try:
        await dp.start_polling(bot)
    finally:
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
