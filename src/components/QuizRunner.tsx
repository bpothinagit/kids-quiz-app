"use client";

import Link from "next/link";
import { useState } from "react";

type QuizQuestion = { question: string; options: [string, string, string, string] };

type QuestionResult = {
  question: string;
  options: string[];
  selected: number;
  correctIndex: number;
  correct: boolean;
  explanation: string;
};

export default function QuizRunner({
  quizId,
  kidId,
  subject,
  materialTitle,
  questions,
}: {
  quizId: number;
  kidId: number;
  subject: string;
  materialTitle: string;
  questions: QuizQuestion[];
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>(() => Array(questions.length).fill(-1));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{ score: number; total: number; results: QuestionResult[] } | null>(null);

  const current = questions[index];
  const isLast = index === questions.length - 1;
  const hasAnswered = answers[index] !== -1;

  function selectOption(optionIndex: number) {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = optionIndex;
      return next;
    });
  }

  async function handleNextOrFinish() {
    if (!isLast) {
      setIndex((i) => i + 1);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/quizzes/${quizId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not submit your answers.");
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your answers.");
    } finally {
      setSubmitting(false);
    }
  }

  if (results) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-6 py-12">
        <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
          <p className="text-sm text-slate-600">{subject} · {materialTitle}</p>
          <p className="mt-2 text-4xl font-bold text-indigo-600">
            {results.score} / {results.total}
          </p>
          <p className="mt-1 text-slate-600">{scoreMessage(results.score, results.total)}</p>
        </div>

        <div className="space-y-4">
          {results.results.map((r, i) => (
            <div key={i} className={`rounded-xl border p-4 ${r.correct ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
              <p className="font-medium">{i + 1}. {r.question}</p>
              <ul className="mt-2 space-y-1 text-sm">
                {r.options.map((opt, optIdx) => (
                  <li
                    key={optIdx}
                    className={
                      optIdx === r.correctIndex
                        ? "font-semibold text-emerald-700"
                        : optIdx === r.selected
                          ? "font-semibold text-amber-700 line-through"
                          : "text-slate-600"
                    }
                  >
                    {optIdx === r.correctIndex ? "✓ " : optIdx === r.selected ? "✗ " : "• "}
                    {opt}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-slate-600"><span className="font-medium">Why: </span>{r.explanation}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-between">
          <Link href={`/practice/${kidId}`} className="rounded-full bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Practice again
          </Link>
          <Link href={`/progress/${kidId}`} className="rounded-full px-6 py-2 text-sm text-slate-600 hover:text-slate-700 underline">
            View my progress
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-12">
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>{subject} · {materialTitle}</span>
        <span>Question {index + 1} of {questions.length}</span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${((index + (hasAnswered ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>

      <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
        <p className="text-lg font-semibold">{current.question}</p>
        <div className="mt-4 space-y-2">
          {current.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => selectOption(i)}
              className={`block w-full rounded-xl border px-4 py-3 text-left transition ${
                answers[index] === i ? "border-indigo-400 bg-indigo-50 font-medium" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end">
        <button
          onClick={handleNextOrFinish}
          disabled={!hasAnswered || submitting}
          className="rounded-full bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? "Submitting…" : isLast ? "Finish quiz" : "Next question"}
        </button>
      </div>
    </div>
  );
}

function scoreMessage(score: number, total: number): string {
  const pct = total > 0 ? score / total : 0;
  if (pct === 1) return "Perfect score! Amazing work! 🌟";
  if (pct >= 0.8) return "Great job! 🎉";
  if (pct >= 0.5) return "Good effort — review the explanations below to learn more.";
  return "Keep practicing — check out the explanations below to learn from this set.";
}
