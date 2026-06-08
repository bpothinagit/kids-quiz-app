import type { Material } from "./types";

const MAX_MATERIAL_CHARS = 12000;

/**
 * Builds a copy-paste-ready prompt for any LLM chat (Claude, ChatGPT, Gemini, ...)
 * that asks it to generate quiz questions from the material text and reply with
 * only JSON matching the shape `lib/questionSchema.ts` validates.
 */
export function buildQuestionPrompt(material: Material, options: { gradeLevel: string; count: number }): string {
  const { gradeLevel, count } = options;
  let content = material.content_text.trim();
  let truncatedNote = "";
  if (content.length > MAX_MATERIAL_CHARS) {
    content = content.slice(0, MAX_MATERIAL_CHARS);
    truncatedNote = "\n\n[Note: material was truncated to fit a reasonable prompt length.]";
  }

  return `You are creating practice quiz questions for a child studying "${material.subject}" at a ${gradeLevel || "appropriate"} level.

Base the questions ONLY on the material below. Write ${count} multiple-choice questions that:
- Use clear, age-appropriate language for a ${gradeLevel || "school-age"} student
- Vary in style (recall, understanding, applying the idea to a new example, etc.)
- Have exactly 4 answer options each, with only one clearly correct answer
- Include a short, friendly explanation of why the correct answer is right (and, where useful, why a common wrong answer is tempting but incorrect)

Reply with ONLY a JSON array (no extra text, no markdown code fences) in exactly this shape:

[
  {
    "question": "...",
    "options": ["...", "...", "...", "..."],
    "correctIndex": 0,
    "explanation": "..."
  }
]

Rules for the JSON:
- "options" must have exactly 4 strings
- "correctIndex" is the 0-based index (0-3) of the correct option in "options"
- Every field is required for every question

Material ("${material.title}"):
"""
${content}
"""${truncatedNote}`;
}
