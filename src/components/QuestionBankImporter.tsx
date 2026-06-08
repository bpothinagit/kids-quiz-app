"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { QuestionBank } from "@/lib/types";

export default function QuestionBankImporter({
  materialId,
  questionBanks,
}: {
  materialId: number;
  questionBanks: QuestionBank[];
}) {
  const router = useRouter();
  const [gradeLevel, setGradeLevel] = useState("");
  const [count, setCount] = useState(10);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function generatePrompt() {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const params = new URLSearchParams({ gradeLevel, count: String(count) });
      const res = await fetch(`/api/materials/${materialId}/prompt?${params}`);
      if (!res.ok) throw new Error("Could not build the prompt.");
      const data = await res.json();
      setPrompt(data.prompt);
      setCopied(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build the prompt.");
    } finally {
      setBusy(false);
    }
  }

  async function copyPrompt() {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy automatically — select the text and copy it manually.");
    }
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!pasted.trim()) {
      setError("Paste the JSON reply from your chat first.");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/materials/${materialId}/question-bank`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: pasted }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "That didn't look right — check the JSON and try again.");
      setSuccess(`Saved a question bank with ${data.questionBank.questions.length} questions!`);
      setPasted("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't look right — check the JSON and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <h3 className="font-medium">Step 1 — Generate a prompt</h3>
        <p className="text-sm text-slate-500">
          Configure a couple of details, then copy the prompt into your favorite AI chat (Claude.ai,
          ChatGPT, Gemini, etc.).
        </p>
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Grade / level (e.g. 4th grade)"
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
            className="flex-1 min-w-[10rem] rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Questions:
            <input
              type="number"
              min={1}
              max={30}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
              className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <button
            onClick={generatePrompt}
            disabled={busy}
            className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Build prompt
          </button>
        </div>

        {prompt && (
          <div className="space-y-2">
            <textarea
              readOnly
              value={prompt}
              rows={10}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 font-mono text-xs"
            />
            <button
              onClick={copyPrompt}
              className="rounded-full border border-indigo-300 px-4 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
            >
              {copied ? "Copied!" : "Copy prompt"}
            </button>
          </div>
        )}
      </div>

      <form onSubmit={handleImport} className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <h3 className="font-medium">Step 2 — Paste the reply back</h3>
        <p className="text-sm text-slate-500">
          Copy the JSON the chat gave you and paste it here. We&apos;ll check it&apos;s well-formed and save it
          as a reusable question bank.
        </p>
        <textarea
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          rows={8}
          placeholder='[ { "question": "...", "options": ["...","...","...","..."], "correctIndex": 0, "explanation": "..." } ]'
          className="w-full rounded-lg border border-slate-300 p-3 font-mono text-xs"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-emerald-600">{success}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          Validate &amp; save
        </button>
      </form>

      <div className="space-y-2">
        <h3 className="font-medium">Saved question banks</h3>
        {questionBanks.length === 0 ? (
          <p className="text-sm text-slate-500">None yet — generate one above to start practicing this material.</p>
        ) : (
          <ul className="space-y-2">
            {questionBanks.map((bank) => (
              <li key={bank.id} className="rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200">
                <p className="font-medium">{bank.label}</p>
                <p className="text-sm text-slate-500">{bank.questions.length} questions</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
