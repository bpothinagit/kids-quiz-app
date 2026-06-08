# kids-quiz-app

A practice-quiz app for kids, inspired by IXL/Khan Academy — built to run locally with **zero ongoing API costs**.

A parent uploads curriculum materials (`.txt`, `.md`, `.docx`), tags them by subject, and the app
generates a ready-to-paste prompt for any free LLM chat (Claude.ai, ChatGPT, Gemini, etc.). The
JSON response — multiple-choice questions with explanations — is pasted back into the app, validated,
and stored as a reusable question bank. Kids then pick a subject, take a sampled quiz, and see their
score with explanations for every answer. Parents can track each kid's progress over time.

## Highlights

- Multiple kid profiles with progress tracking
- Copy-prompt / paste-results workflow — no API key or per-question cost
- Server-authoritative scoring (answer keys never sent to the client before submission)
- SQLite storage via `better-sqlite3`, no external database to run

## Getting started

```bash
nvm use            # pins to Node 24 via .nvmrc
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create a kid profile in the parent
dashboard, upload a curriculum file, generate a prompt, paste the JSON response back, and
start practicing.
