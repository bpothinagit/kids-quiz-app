"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type PracticeOption = {
  materialId: number;
  materialTitle: string;
  subject: string;
  bankId: number;
  bankLabel: string;
  questionCount: number;
};

export default function PracticePicker({ kidId, options }: { kidId: number; options: PracticeOption[] }) {
  const router = useRouter();
  const [selectedBankId, setSelectedBankId] = useState<number | "">(options[0]?.bankId ?? "");
  const [count, setCount] = useState(Math.min(10, options[0]?.questionCount ?? 10));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = options.find((o) => o.bankId === selectedBankId);

  function handleSelectBank(bankId: number) {
    setSelectedBankId(bankId);
    const opt = options.find((o) => o.bankId === bankId);
    if (opt) setCount(Math.min(count, opt.questionCount));
  }

  async function handleStart() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kidId, questionBankId: selected.bankId, count }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start the quiz.");
      router.push(`/quiz/${data.quiz.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the quiz.");
      setBusy(false);
    }
  }

  if (options.length === 0) {
    return (
      <p className="rounded-xl bg-white p-4 text-sm text-slate-500 ring-1 ring-slate-200">
        No practice questions are ready yet. Ask a parent to upload materials and generate question
        banks in the parent dashboard.
      </p>
    );
  }

  return (
    <div className="space-y-4 rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((opt) => (
          <button
            key={opt.bankId}
            onClick={() => handleSelectBank(opt.bankId)}
            className={`text-left rounded-xl border p-3 transition ${
              selectedBankId === opt.bankId ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <p className="font-medium">{opt.subject}</p>
            <p className="text-sm text-slate-600">{opt.materialTitle}</p>
            <p className="text-xs text-slate-400">{opt.bankLabel} · {opt.questionCount} question{opt.questionCount === 1 ? "" : "s"} available</p>
          </button>
        ))}
      </div>

      {selected && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            How many questions?
            <input
              type="number"
              min={1}
              max={selected.questionCount}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(selected.questionCount, Number(e.target.value) || 1)))}
              className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <button
            onClick={handleStart}
            disabled={busy}
            className="rounded-full bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? "Starting…" : "Start quiz"}
          </button>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
