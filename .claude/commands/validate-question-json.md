Validate a question-bank JSON file against this app's schema before importing it.

The file path to validate is: $ARGUMENTS

## Steps

1. Run the validation helper:
   ```
   npx tsx scripts/validate-question-json.mts $ARGUMENTS
   ```

2. Report the result clearly:
   - On success: show the count of valid questions and a numbered preview of each
     question with its correct answer
   - On failure: show the exact error, explain what the schema expects, and suggest
     how the parent can fix the LLM output (e.g. re-prompt, manually correct the field)

## Context

This app uses a two-phase question generation workflow — parents copy a prompt,
paste it into any LLM (Claude, ChatGPT, etc.), then paste the JSON response back
into the app at `/parent/materials/[id]`. LLM output is sometimes malformed.

`validateQuestionsJson` in `src/lib/questionSchema.ts` accepts:
- A raw JSON array of question objects
- An object with a `{ questions: [...] }` wrapper
- Either of the above wrapped in a ` ```json ``` ` code fence

Each question must have:
- `question` — non-empty string
- `options` — array of exactly 4 non-empty strings
- `correctIndex` — integer 0–3
- `explanation` — non-empty string
