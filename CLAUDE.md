# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # start Next.js dev server
npm run build        # production build
npm run lint         # ESLint
npm test             # run all Vitest tests (single pass)
npm run test:watch   # Vitest in watch mode
npm run test:coverage  # coverage report

# Run a single test file
npx vitest run src/lib/__tests__/questionSchema.test.ts
```

## Code Quality Requirements

Every code implementation must include quality unit tests with proper coverage:
- Write unit tests for all new functions, components, and API routes
- Cover happy paths, edge cases, and error conditions
- Tests must be co-located or in a `__tests__` directory alongside the code
- Do not consider an implementation complete without its tests

## Architecture

### Stack
- **Next.js 16** (App Router) · **React 19** · **TypeScript** · **Tailwind CSS v4**
- **better-sqlite3** for the database — synchronous, no ORM, raw SQL only
- **Vitest** for tests

### Next.js 16 breaking change — `params` is a Promise
Route segment params in both page components and API route handlers are `Promise<{...}>` and must be awaited:

```ts
// API route handler
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  ...
}
```

Read `node_modules/next/dist/docs/` before writing new route handlers or pages.

### Database
- Single file: `data/app.db` (created automatically on first run)
- Schema + initialization live in `src/lib/db.ts`; migrations are `ALTER TABLE … ADD COLUMN` wrapped in try/catch
- All queries are in `src/lib/queries.ts` — plain prepared statements, no abstraction layer
- The `db` singleton is the default export of `src/lib/db.ts`

**Entity relationships (in dependency order):**
```
kids
 └─ materials        (kid_id nullable → shared across all kids when NULL)
     └─ question_banks  (questions stored as questions_json TEXT)
         └─ quizzes      (question_bank_id + question_indices_json)
             └─ attempts  (answers_json + score + total)
```

### Two-phase question generation (no LLM API key required)
The app never calls an LLM directly. Instead:
1. Parent visits a material's page → clicks "Generate prompt" → copies the prompt from `GET /api/materials/[id]/prompt`
2. Parent pastes the prompt into any LLM chat (Claude, ChatGPT, etc.)
3. Parent pastes the JSON response back → `POST /api/materials/[id]/question-bank` validates it with `validateQuestionsJson` and saves it

`src/lib/promptBuilder.ts` builds the copy-paste prompt. `src/lib/questionSchema.ts` validates the pasted JSON (handles code fences, `{ questions: [...] }` wrapper, and per-field validation).

### Quiz answer key is never sent to the client
`GET /api/quizzes/[id]` strips `correctIndex` and `explanation` before responding. The answer key only comes back in the `POST /api/quizzes/[id]/submit` response after the kid has answered all questions. Grading happens server-side in that submit handler.

### Page structure
| Route | Audience | Purpose |
|---|---|---|
| `/` | Both | Kid profile picker / home |
| `/parent` | Parent | Upload materials, manage question banks |
| `/parent/materials/[id]` | Parent | Generate prompt, paste JSON, view banks |
| `/practice/[kidId]` | Kid | Choose a question bank and start a quiz |
| `/quiz/[quizId]` | Kid | Take the quiz (QuizRunner component) |
| `/progress/[kidId]` | Kid/Parent | Attempt history |

Pages are server components; interactive widgets are `"use client"` components in `src/components/`.

### Testing patterns
- **Pure functions** (`questionSchema`, `promptBuilder`): import and assert directly, no mocks needed
- **Database queries** (`queries.ts`): mock `@/lib/db` with an in-memory better-sqlite3 instance inside the `vi.mock` factory (factory is hoisted — do not reference outer variables):
  ```ts
  vi.mock("@/lib/db", async () => {
    const { default: Database } = await import("better-sqlite3");
    const db = new Database(":memory:");
    db.exec(`/* same schema as db.ts */`);
    return { default: db };
  });
  // then import db to clear tables in beforeEach
  import db from "@/lib/db";
  beforeEach(() => { db.exec("DELETE FROM kids"); ... });
  ```
- **API route handlers**: mock `@/lib/queries` with `vi.mock`, construct `NextRequest` directly, call the exported handler, assert on `response.json()`
- Dynamic route handlers need params passed as `{ params: Promise.resolve({ id: "1" }) }`
