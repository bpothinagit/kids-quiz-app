# Kids Quiz App

A practice-quiz app for kids, to serve their home tutoring and practice needs — built to run locally with **zero ongoing API costs**.

A parent uploads curriculum materials (`.txt`, `.md`, `.docx`, `.pdf`), tags them by subject, and the app generates a ready-to-paste prompt for any LLM chat (Claude.ai, ChatGPT, Gemini, etc.). The JSON response — multiple-choice questions with explanations — is pasted back, validated, and stored as a reusable question bank. Kids pick a subject, choose which materials to include, take a sampled quiz, and see their score with explanations for every answer.

---

## Features

- **Multiple kid profiles** with avatars and grade levels
- **Copy-prompt / paste-results workflow** — no API key or per-question cost
- **Multi-material quiz selection** — kids choose a subject and check off which uploaded materials to draw questions from; the app pools and shuffles questions from all selected banks into a single quiz
- **Server-authoritative scoring** — answer keys are never sent to the client before submission
- **Progress tracking** — full attempt history per kid with score and per-question review
- **PDF, DOCX, TXT, Markdown** upload support
- **SQLite storage** via `better-sqlite3` — no external database to run

---

## Getting Started

```bash
nvm use          # pins to Node 24 via .nvmrc
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Typical workflow

1. **Parent dashboard** (`/parent`) — upload a curriculum file and tag it with a subject
2. **Material page** (`/parent/materials/[id]`) — click "Generate prompt", copy it, paste into any LLM chat, paste the JSON response back
3. **Home** (`/`) — create a kid profile
4. **Practice** (`/practice/[kidId]`) — select a subject, check off one or more materials, set question count, start
5. **Progress** (`/progress/[kidId]`) — view attempt history and scores

---

## Commands

```bash
npm run dev            # Next.js dev server (http://localhost:3000)
npm run build          # Production build
npm run lint           # ESLint
npm test               # Run all Vitest tests (single pass)
npm run test:watch     # Vitest in watch mode
npm run test:coverage  # Coverage report
```

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 · Tailwind CSS v4 |
| Database | better-sqlite3 (SQLite, single file `data/app.db`) |
| File parsing | mammoth (DOCX) · pdf-parse (PDF) |
| Tests | Vitest |
| Language | TypeScript |

---

## Architecture

### Two-phase question generation

The app never calls an LLM directly, so there is no API key and no per-request cost.

1. Parent visits a material's page → clicks **"Generate prompt"** → copies the prompt
2. Parent pastes the prompt into any LLM chat
3. Parent pastes the JSON response back → the app validates it with `validateQuestionsJson` and saves it as a question bank

`src/lib/promptBuilder.ts` builds the prompt. `src/lib/questionSchema.ts` validates the pasted JSON (handles code fences, `{ questions: [...] }` wrappers, and per-field validation).

### Multi-material quiz selection

When a kid starts a quiz, materials are grouped by **subject**. The kid selects a subject, then checks off which question banks to include. The server pools all `{bankId, questionIndex}` pairs from every selected bank, Fisher-Yates shuffles the combined pool, samples the requested count, and stores it as `questionSources` on the quiz row. A single quiz can therefore span multiple materials without duplicates.

### Answer-key security

`GET /api/quizzes/[id]` strips `correctIndex` and `explanation` from every question before responding. The answer key only arrives in the `POST /api/quizzes/[id]/submit` response after the kid has submitted all answers. Grading is done entirely server-side.

### Page structure

| Route | Audience | Purpose |
|---|---|---|
| `/` | Both | Kid profile picker / home |
| `/parent` | Parent | Upload materials, manage question banks |
| `/parent/materials/[id]` | Parent | Generate prompt, paste JSON, view banks |
| `/practice/[kidId]` | Kid | Choose subject + materials, start a quiz |
| `/quiz/[quizId]` | Kid | Take the quiz |
| `/progress/[kidId]` | Kid / Parent | Attempt history |

### Database schema

```
kids
 └─ materials        (kid_id nullable → shared across all kids when NULL)
     └─ question_banks  (questions stored as questions_json TEXT)
         └─ quizzes      (question_bank_id + question_sources_json for multi-bank)
             └─ attempts  (answers_json + score + total)
```

---

## Project Structure

```
src/
  app/
    api/                  # Next.js API route handlers
      kids/
      materials/
      quizzes/
    parent/               # Parent dashboard pages
    practice/             # Kid practice picker page
    progress/             # Kid progress page
    quiz/                 # Quiz runner page
  components/             # Client components
    KidManager.tsx
    MaterialUploader.tsx
    PracticePicker.tsx
    QuestionBankImporter.tsx
    QuizRunner.tsx
  lib/
    db.ts                 # SQLite singleton + schema
    queries.ts            # All prepared statements
    types.ts              # Shared TypeScript types
    promptBuilder.ts      # LLM prompt generation
    questionSchema.ts     # JSON validation for pasted responses
    parseFile.ts          # File → text extraction
data/
  app.db                  # SQLite database (auto-created on first run)
```
