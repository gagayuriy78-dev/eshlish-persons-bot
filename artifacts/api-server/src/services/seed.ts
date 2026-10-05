import { count } from "drizzle-orm";
import { db, questionsTable, type InsertQuestion } from "@workspace/db";
import { SEED_QUESTIONS } from "../data/questions";

const LETTERS = ["A", "B", "C", "D"] as const;
const DIFFICULTY: Record<string, string> = { A1: "easy", A2: "easy", B1: "medium", B2: "medium", C1: "hard", C2: "hard" };

/** Rotate options so the correct letter is spread evenly across A-D. */
export function seedRows(): InsertQuestion[] {
  return SEED_QUESTIONS.map(([level, category, text, a, b, c, d, correct], index) => {
    const options = [a, b, c, d];
    const correctText = options[LETTERS.indexOf(correct)]!;
    const shift = index % 4;
    const rotated = options.map((_, i) => options[(i + shift) % 4]!);
    return {
      level,
      category,
      difficulty: DIFFICULTY[level] ?? "medium",
      text,
      optionA: rotated[0]!,
      optionB: rotated[1]!,
      optionC: rotated[2]!,
      optionD: rotated[3]!,
      correctOption: LETTERS[rotated.indexOf(correctText)]!,
    };
  });
}

export async function seedQuestionsIfEmpty(): Promise<number> {
  const [row] = await db.select({ n: count() }).from(questionsTable);
  if (Number(row?.n ?? 0) > 0) return 0;
  const rows = seedRows();
  await db.insert(questionsTable).values(rows);
  return rows.length;
}
