"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Kid } from "@/lib/types";

const COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#8b5cf6"];

export default function KidManager({ kids }: { kids: Kid[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  function startEdit(kid: Kid) {
    setEditingId(kid.id);
    setName(kid.name);
    setGradeLevel(kid.grade_level);
    setColor(kid.avatar_color);
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setGradeLevel("");
    setColor(COLORS[0]);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a name.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const url = editingId ? `/api/kids/${editingId}` : "/api/kids";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), grade_level: gradeLevel.trim(), avatar_color: color }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong.");
      }
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(kid: Kid) {
    if (!confirm(`Remove ${kid.name}'s profile? This also deletes their quiz history.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/kids/${kid.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete profile.");
      if (editingId === kid.id) resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete profile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <ul className="space-y-2">
        {kids.map((kid) => (
          <li
            key={kid.id}
            className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200"
          >
            <div className="flex items-center gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: kid.avatar_color }}
              >
                {kid.name.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <p className="font-medium">{kid.name}</p>
                {kid.grade_level && <p className="text-sm text-slate-500">{kid.grade_level}</p>}
              </div>
            </div>
            <div className="flex gap-2 text-sm">
              <button onClick={() => startEdit(kid)} className="text-indigo-600 hover:underline" disabled={busy}>
                Edit
              </button>
              <button onClick={() => handleDelete(kid)} className="text-red-500 hover:underline" disabled={busy}>
                Remove
              </button>
            </div>
          </li>
        ))}
        {kids.length === 0 && <li className="text-sm text-slate-500">No kid profiles yet — add one below.</li>}
      </ul>

      <form onSubmit={handleSubmit} className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <h3 className="font-medium">{editingId ? "Edit profile" : "Add a kid profile"}</h3>
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 min-w-[10rem] rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Grade / age (optional)"
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
            className="flex-1 min-w-[10rem] rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Color:</span>
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`h-7 w-7 rounded-full ring-2 ${color === c ? "ring-slate-900" : "ring-transparent"}`}
              style={{ backgroundColor: c }}
              aria-label={`Choose color ${c}`}
            />
          ))}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {editingId ? "Save changes" : "Add profile"}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="rounded-full px-5 py-2 text-sm text-slate-500 hover:text-slate-700">
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
