"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SubjectGroup } from "@/lib/types";

export default function PracticePicker({
  kidId,
  subjectGroups,
}: {
  kidId: number;
  subjectGroups: SubjectGroup[];
}) {
  const router = useRouter();

  const firstGroup = subjectGroups[0] ?? null;

  const [selectedSubject, setSelectedSubject] = useState<string | null>(firstGroup?.subject ?? null);
  const [selectedBankIds, setSelectedBankIds] = useState<Set<number>>(
    () => new Set(firstGroup?.banks.map((b) => b.bankId) ?? []),
  );
  const [count, setCount] = useState(() => {
    const total = firstGroup?.banks.reduce((s, b) => s + b.questionCount, 0) ?? 0;
    return Math.min(10, total);
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentGroup = subjectGroups.find((g) => g.subject === selectedSubject) ?? null;

  const totalAvailable = currentGroup?.banks
    .filter((b) => selectedBankIds.has(b.bankId))
    .reduce((sum, b) => sum + b.questionCount, 0) ?? 0;

  function handleSelectSubject(subject: string) {
    const group = subjectGroups.find((g) => g.subject === subject);
    if (!group) return;
    setSelectedSubject(subject);
    const allBankIds = new Set(group.banks.map((b) => b.bankId));
    setSelectedBankIds(allBankIds);
    const newTotal = group.banks.reduce((s, b) => s + b.questionCount, 0);
    setCount((c) => Math.min(c, newTotal || 10));
  }

  function toggleBank(bankId: number) {
    const next = new Set(selectedBankIds);
    if (next.has(bankId)) {
      next.delete(bankId);
    } else {
      next.add(bankId);
    }
    setSelectedBankIds(next);
    const newTotal =
      currentGroup?.banks.filter((b) => next.has(b.bankId)).reduce((s, b) => s + b.questionCount, 0) ?? 0;
    if (newTotal > 0) {
      setCount((c) => Math.min(c, newTotal));
    }
  }

  async function handleStart() {
    if (selectedBankIds.size === 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kidId, bankIds: [...selectedBankIds], count }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start the quiz.");
      router.push(`/quiz/${data.quiz.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the quiz.");
      setBusy(false);
    }
  }

  if (subjectGroups.length === 0) {
    return (
      <p className="rounded-xl bg-amber-50 p-4 text-sm font-medium text-amber-700 ring-1 ring-amber-200">
        No practice questions are ready yet. Ask a parent to upload materials and generate question banks in the parent
        dashboard.
      </p>
    );
  }

  return (
    <div className="space-y-5 rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Subject</p>
        <div className="flex flex-wrap gap-2">
          {subjectGroups.map((g) => (
            <button
              key={g.subject}
              onClick={() => handleSelectSubject(g.subject)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                selectedSubject === g.subject
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {g.subject}
            </button>
          ))}
        </div>
      </div>

      {currentGroup && (
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Include materials</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {currentGroup.banks.map((bank) => (
              <label
                key={bank.bankId}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                  selectedBankIds.has(bank.bankId)
                    ? "border-indigo-400 bg-indigo-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-indigo-600"
                  checked={selectedBankIds.has(bank.bankId)}
                  onChange={() => toggleBank(bank.bankId)}
                />
                <div>
                  <p className="font-medium">{bank.materialTitle}</p>
                  <p className="text-sm text-slate-600">
                    {bank.bankLabel} · {bank.questionCount} question{bank.questionCount === 1 ? "" : "s"}
                  </p>
                </div>
              </label>
            ))}
          </div>
          {selectedBankIds.size === 0 && (
            <p className="mt-2 text-sm text-amber-600">Select at least one material to start.</p>
          )}
        </div>
      )}

      {totalAvailable > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            How many questions?
            <input
              type="number"
              min={1}
              max={totalAvailable}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(totalAvailable, Number(e.target.value) || 1)))}
              className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <span className="text-slate-400">of {totalAvailable} available</span>
          </label>
          <button
            onClick={handleStart}
            disabled={busy || selectedBankIds.size === 0}
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
