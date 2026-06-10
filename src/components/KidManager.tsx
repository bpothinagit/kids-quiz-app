"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Kid } from "@/lib/types";

export const AVATARS = [
  { emoji: "🦊", color: "#f97316" },
  { emoji: "🐼", color: "#64748b" },
  { emoji: "🦄", color: "#a855f7" },
  { emoji: "🐸", color: "#22c55e" },
  { emoji: "🦁", color: "#f59e0b" },
  { emoji: "🐧", color: "#3b82f6" },
  { emoji: "🦋", color: "#ec4899" },
  { emoji: "🐉", color: "#6366f1" },
  { emoji: "🦝", color: "#14b8a6" },
  { emoji: "🐯", color: "#eab308" },
  { emoji: "🦕", color: "#84cc16" },
  { emoji: "🐨", color: "#8b5cf6" },
];

const DEFAULT_AVATAR = AVATARS[0];

function getAvatar(emoji: string) {
  return AVATARS.find((a) => a.emoji === emoji) ?? DEFAULT_AVATAR;
}

export function KidAvatar({ kid, size = "md" }: { kid: Kid; size?: "sm" | "md" | "lg" }) {
  const avatar = getAvatar(kid.avatar_emoji);
  const sizeClass = size === "sm" ? "h-10 w-10 text-xl" : size === "lg" ? "h-20 w-20 text-4xl" : "h-12 w-12 text-2xl";
  return (
    <span
      className={`flex items-center justify-center rounded-full ${sizeClass} shadow-sm`}
      style={{ backgroundColor: avatar.color + "33", border: `2.5px solid ${avatar.color}` }}
    >
      {avatar.emoji}
    </span>
  );
}

export default function KidManager({ kids }: { kids: Kid[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [avatarEmoji, setAvatarEmoji] = useState(DEFAULT_AVATAR.emoji);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  function startEdit(kid: Kid) {
    setEditingId(kid.id);
    setName(kid.name);
    setGradeLevel(kid.grade_level);
    setAvatarEmoji(kid.avatar_emoji || DEFAULT_AVATAR.emoji);
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setGradeLevel("");
    setAvatarEmoji(DEFAULT_AVATAR.emoji);
    setError(null);
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setError("Please enter a name.");
      return;
    }
    setBusy(true);
    setError(null);
    const selected = getAvatar(avatarEmoji);
    try {
      const url = editingId ? `/api/kids/${editingId}` : "/api/kids";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          grade_level: gradeLevel.trim(),
          avatar_color: selected.color,
          avatar_emoji: selected.emoji,
        }),
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
              <KidAvatar kid={kid} size="sm" />
              <div>
                <p className="font-medium">{kid.name}</p>
                {kid.grade_level && <p className="text-sm text-slate-600">{kid.grade_level}</p>}
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
        {kids.length === 0 && <li className="text-sm text-slate-600">No kid profiles yet — add one below.</li>}
      </ul>

      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4 rounded-xl bg-white p-4 ring-1 ring-slate-200">
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

        <div className="space-y-1.5">
          <span className="text-sm text-slate-600">Pick an avatar:</span>
          <div className="flex flex-wrap gap-2">
            {AVATARS.map((a) => {
              const selected = avatarEmoji === a.emoji;
              return (
                <button
                  key={a.emoji}
                  type="button"
                  onClick={() => setAvatarEmoji(a.emoji)}
                  title={a.emoji}
                  className={`flex h-11 w-11 items-center justify-center rounded-full text-2xl transition-transform hover:scale-110 ${
                    selected ? "ring-4 ring-offset-1 scale-110" : "ring-2 ring-transparent"
                  }`}
                  style={{
                    backgroundColor: a.color + "33",
                    border: `2.5px solid ${a.color}`,
                    ...(selected ? { outline: `3px solid ${a.color}`, outlineOffset: "2px" } : {}),
                  }}
                >
                  {a.emoji}
                </button>
              );
            })}
          </div>
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
            <button type="button" onClick={resetForm} className="rounded-full px-5 py-2 text-sm text-slate-600 hover:text-slate-700">
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
