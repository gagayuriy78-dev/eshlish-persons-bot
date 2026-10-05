"""Validated CSV import shared by the bot and its Mini App API."""

import csv
import sqlite3
from pathlib import Path

COLUMNS = ("level", "difficulty", "category", "question_type", "question_text",
           "option_a", "option_b", "option_c", "option_d", "correct_answer")


def read_question_rows(path: Path) -> list[tuple[str, ...]]:
    with path.open(encoding="utf-8", newline="") as source:
        reader = csv.DictReader(source)
        if (
            reader.fieldnames is None
            or not set(COLUMNS[3:]).issubset(reader.fieldnames)
            or not ("level" in reader.fieldnames or {"difficulty", "category"}.issubset(reader.fieldnames))
        ):
            raise ValueError("questions.csv ustunlari noto'g'ri.")
        rows = []
        for line, row in enumerate(reader, 2):
            if None in row or any(row.get(column) is None for column in reader.fieldnames):
                raise ValueError(f"questions.csv: {line}-qatorda ustunlar soni noto'g'ri; vergulli matnni qo'shtirnoqqa oling.")
            values = tuple((row.get(column) or "").strip() for column in COLUMNS)
            level, difficulty, category, kind, text, *rest = values
            options, correct = rest[:4], rest[4]
            if not text or not correct or not (level or (difficulty and category)):
                raise ValueError(f"questions.csv: {line}-qatorda savol, daraja yoki to'g'ri javob yo'q.")
            if kind not in ("test", "write"):
                raise ValueError(f"questions.csv: {line}-qatorda savol turi noto'g'ri.")
            if kind == "test" and (not all(options) or correct.casefold() not in {option.casefold() for option in options}):
                raise ValueError(f"questions.csv: {line}-qatorda to'g'ri javob variantlar ichida bo'lishi kerak.")
            if kind == "write" and any(options):
                raise ValueError(f"questions.csv: {line}-qatordagi yozma savol variantlari bo'sh bo'lishi kerak.")
            rows.append(values)
        return rows


def repair_legacy_samples(connection: sqlite3.Connection) -> None:
    """Repair only exact known malformed CSV imports; preserve ids and stats."""
    repairs = [
        (
            ("", "Murakkab", "Grammatika", "test", "If I ___ more time",
             "I would learn another language.", "have", "had", "will have", "am having"),
            ("", "Murakkab", "Grammatika", "test", "If I ___ more time, I would learn another language.",
             "have", "had", "will have", "am having", "had"),
        ),
    ]
    for difficulty, category, text, correct in (
        ("Oson", "Yaqin so'zlar", "Big so'zining yaqin ma'nosini yozing.", "large"),
        ("O'rta", "Grammatika", "They ___ football every Sunday. (to'g'ri fe'lni yozing)", "play"),
        ("Murakkab", "Yaqin so'zlar", "Happy so'zining yaqin ma'nosini yozing.", "joyful"),
    ):
        repairs.append((
            ("", difficulty, category, "write", text, "", "", "", correct, ""),
            ("", difficulty, category, "write", text, "", "", "", "", correct),
        ))
    matching = " AND ".join(f"{column}=?" for column in COLUMNS)
    assignments = ", ".join(f"{column}=?" for column in COLUMNS)
    for old, new in repairs:
        connection.execute(f"UPDATE questions SET {assignments} WHERE {matching}", (*new, *old))


def import_question_rows(connection: sqlite3.Connection, path: Path) -> int:
    rows = read_question_rows(path)
    repair_legacy_samples(connection)
    imported = 0
    matching = " AND ".join(f"{column}=?" for column in COLUMNS)
    for values in rows:
        if connection.execute(f"SELECT 1 FROM questions WHERE {matching} LIMIT 1", values).fetchone():
            continue
        connection.execute(
            f"INSERT INTO questions ({','.join(COLUMNS)}) VALUES ({','.join('?' for _ in COLUMNS)})", values,
        )
        imported += 1
    return imported
