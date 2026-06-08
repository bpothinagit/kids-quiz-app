import type { Question } from "./types";

export type ValidationResult =
  | { ok: true; questions: Question[] }
  | { ok: false; error: string };

/**
 * Validates pasted JSON against the expected question shape. Strict but with
 * forgiving entry points (raw array, or `{ questions: [...] }`, or fenced
 * code blocks) since pasted LLM output varies in wrapper format.
 */
export function validateQuestionsJson(raw: string): ValidationResult {
  const text = stripCodeFence(raw.trim());

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "That doesn't look like valid JSON. Make sure you copied the full reply, including the surrounding [ ] or { }." };
  }

  const arr = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.questions)
      ? parsed.questions
      : null;

  if (!arr) {
    return { ok: false, error: "Expected a JSON array of questions, or an object with a \"questions\" array." };
  }
  if (arr.length === 0) {
    return { ok: false, error: "The questions list is empty." };
  }

  const questions: Question[] = [];
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    const where = `Question ${i + 1}`;

    if (!isRecord(item)) {
      return { ok: false, error: `${where}: expected an object.` };
    }
    if (typeof item.question !== "string" || !item.question.trim()) {
      return { ok: false, error: `${where}: missing or empty "question" text.` };
    }
    if (!Array.isArray(item.options) || item.options.length !== 4 || !item.options.every((o) => typeof o === "string" && o.trim())) {
      return { ok: false, error: `${where}: "options" must be an array of exactly 4 non-empty strings.` };
    }
    const correctIndex = item.correctIndex;
    if (typeof correctIndex !== "number" || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) {
      return { ok: false, error: `${where}: "correctIndex" must be an integer from 0 to 3.` };
    }
    if (typeof item.explanation !== "string" || !item.explanation.trim()) {
      return { ok: false, error: `${where}: missing or empty "explanation" text.` };
    }

    questions.push({
      question: item.question.trim(),
      options: [item.options[0].trim(), item.options[1].trim(), item.options[2].trim(), item.options[3].trim()],
      correctIndex: correctIndex as 0 | 1 | 2 | 3,
      explanation: item.explanation.trim(),
    });
  }

  return { ok: true, questions };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stripCodeFence(text: string): string {
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : text;
}
