import { readFileSync } from "fs";
import { validateQuestionsJson } from "../src/lib/questionSchema.js";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: npx tsx scripts/validate-question-json.mts <path-to-file>");
  process.exit(1);
}

let raw: string;
try {
  raw = readFileSync(filePath, "utf-8");
} catch {
  console.error(`Cannot read file: ${filePath}`);
  process.exit(1);
}

const result = validateQuestionsJson(raw);

if (result.ok) {
  console.log(`✓ ${result.questions.length} question${result.questions.length === 1 ? "" : "s"} valid\n`);
  result.questions.forEach((q, i) => {
    const preview = q.question.length > 70 ? q.question.slice(0, 67) + "..." : q.question;
    const correct = q.options[q.correctIndex];
    console.log(`  [${String(i + 1).padStart(2)}] ${preview}`);
    console.log(`       ✓ ${correct}`);
  });
} else {
  console.error(`✗ Validation failed\n`);
  console.error(`  ${result.error}`);
  process.exit(1);
}
