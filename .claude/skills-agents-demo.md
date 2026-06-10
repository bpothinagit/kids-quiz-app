# Claude Code: Custom Commands & Agents Demo Plan

This document describes 2 custom commands (slash commands) and 2 custom agents
to build and demo within the kids-quiz-app codebase.

> **Naming note:** Claude Code calls these *commands*, not skills. They live in
> `.claude/commands/` and are invoked with a `/` prefix. "Skills" is sometimes
> used informally but `.claude/commands/` is the actual folder the CLI reads.

---

## Custom Commands (slash commands)

Commands are markdown files in `.claude/commands/` that define repeatable
slash-command tasks. Claude Code reads the file content as the prompt when
you type `/<command-name>`, substituting `$ARGUMENTS` with whatever follows.

---

### Command 1 — `/new-api-route`

**File:** `.claude/commands/new-api-route.md`

**What it does:**
Scaffolds a new API route handler + a matching Vitest test file, pre-wired
with the Next.js 16 `params: Promise<{id: string}>` pattern that this repo
requires. Avoids the copy-paste boilerplate that every new route needs.

**Invocation:**
```
/new-api-route materials/[id]/summary
```

**What gets created:**
- `src/app/api/materials/[id]/summary/route.ts` — handler with typed params
  await, proper `NextRequest`/`NextResponse` imports, and placeholder GET/POST
- `src/app/api/materials/[id]/summary/__tests__/route.test.ts` — skeleton
  Vitest file with `vi.mock("@/lib/queries", ...)` and a `NextRequest`
  construction example, matching the testing patterns in CLAUDE.md

**Demo talking points:**
- Shows commands eliminating project-specific boilerplate (not generic scaffolding)
- The command reads `CLAUDE.md` to apply the correct `params` pattern —
  demonstrates that commands have full context of the repo
- Saves ~10 minutes per new route; prevents the `params` await bug that
  breaks every Next.js 16 route when forgotten

---

### Command 2 — `/validate-question-json`

**File:** `.claude/commands/validate-question-json.md`

**What it does:**
Reads a JSON file (the kind a parent gets back from Claude.ai / ChatGPT),
runs it through `validateQuestionsJson` from `src/lib/questionSchema.ts`,
and reports pass/fail with field-level error messages in readable prose.

**Invocation:**
```
/validate-question-json ~/Downloads/math-questions.json
```

**What gets created / shown:**
- A terminal report listing each invalid question by index with the specific
  field that failed (e.g., `question[2].options: must have exactly 4 items`)
- A summary line: `✓ 15 questions valid` or `✗ 3 errors found`

**Demo talking points:**
- Bridges the LLM-generated JSON → app import workflow that is core to the
  app's design (parents paste JSON from any LLM)
- Commands can be domain tools, not just dev tools — a tech-savvy parent could
  run this before pasting into the UI
- Demonstrates commands calling into real app logic (`questionSchema.ts`) rather
  than being standalone scripts

---

## Custom Agents

Agents are specialized AI instances spawned via the Claude Agent SDK with their
own system prompt, tool access, and task focus. They run independently and
return a structured result.

---

### Agent 1 — Question Bank Quality Reviewer

**Agent name:** `question-bank-reviewer`

**What it does:**
Reads one or more question banks from the database, then evaluates each
question for educational quality:
- Is the question unambiguous and clearly worded?
- Are the wrong-answer distractors plausible (not obviously wrong)?
- Does the explanation actually explain *why* the correct answer is right?
- Is the difficulty level appropriate for the kid's grade level?

Returns a structured report: a quality score per question, a list of flagged
questions with specific issues, and an overall bank rating.

**Where it fits in the app:**
Parent visits `/parent/materials/[id]` → after importing a question bank,
a "Review quality" button spawns this agent → report appears before the bank
is used in a real quiz.

**Demo talking points:**
- LLM-generated questions aren't always good — this agent adds a review gate
  before kids see the questions
- Demonstrates agents doing domain judgment (educational quality) on structured
  data, not just text summarization
- The agent reads from the real SQLite DB via the same `queries.ts` functions
  the app uses — it's integrated, not bolted on

---

### Agent 2 — Kid Progress Analyzer

**Agent name:** `progress-analyzer`

**What it does:**
Reads a kid's full attempt history (`listAttemptsForKid`) across all subjects
and quizzes, then produces a personalized learning report:
- Which subjects the kid is strong/weak in (score % by subject)
- Which question types or topics they consistently miss (pattern across wrong
  answers)
- Trend line: improving / plateauing / regressing over recent attempts
- Recommended next focus area with a suggested practice plan

Returns a markdown report that can be shown on the `/progress/[kidId]` page.

**Where it fits in the app:**
Parent or kid visits `/progress/[kidId]` → clicks "Get AI report" button →
agent is spawned server-side → markdown report is rendered alongside the
attempt history table.

**Demo talking points:**
- Turns raw `score/total` numbers into actionable insight — something a simple
  SQL query can't do
- Shows agents synthesizing data across time and multiple dimensions (subject,
  question type, trend)
- The output is directly useful to a non-technical parent, not just a developer

---

## Build Order

| Step | Task | Notes |
|---|---|---|
| 1 | Create `/validate-question-json` command | Smallest scope; pure function test |
| 2 | Create `/new-api-route` command | Requires template authoring |
| 3 | Build `question-bank-reviewer` agent | Needs DB access + quality rubric prompt |
| 4 | Build `progress-analyzer` agent | Needs `listAttemptsForKid` + trend logic |

## Files Created

```
.claude/
  commands/
    validate-question-json.md    ← Command 1 definition
    new-api-route.md             ← Command 2 definition
  agents/
    question-bank-reviewer.md   ← Agent 1 definition
    progress-analyzer.md        ← Agent 2 definition
scripts/
  validate-question-json.mts    ← Helper called by Command 1
```
