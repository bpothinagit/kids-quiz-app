"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Kid, Material } from "@/lib/types";

export default function MaterialUploader({ kids, materials }: { kids: Kid[]; materials: Material[] }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [kidId, setKidId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileInput.current?.files?.[0];
    if (!file) {
      setError("Please choose a file.");
      return;
    }
    if (!subject.trim()) {
      setError("Please enter a subject (e.g. Math, Reading, Spanish).");
      return;
    }

    const form = new FormData();
    form.set("file", file);
    form.set("subject", subject.trim());
    form.set("title", title.trim());
    form.set("kidId", kidId);

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/materials", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not upload that file.");
      }
      setSubject("");
      setTitle("");
      setKidId("");
      if (fileInput.current) fileInput.current.value = "";
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload that file.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(material: Material) {
    if (!confirm(`Delete "${material.title}"? This also removes any question banks generated from it.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/materials/${material.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete that material.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete that material.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <ul className="space-y-2">
        {materials.map((material) => (
          <li key={material.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200">
            <div>
              <Link href={`/parent/materials/${material.id}`} className="font-medium text-indigo-700 hover:underline">
                {material.title}
              </Link>
              <p className="text-sm text-slate-500">
                {material.subject}
                {material.kid_id ? ` · for ${kids.find((k) => k.id === material.kid_id)?.name ?? "a kid"}` : " · shared with everyone"}
              </p>
            </div>
            <button onClick={() => handleDelete(material)} className="text-sm text-red-500 hover:underline" disabled={busy}>
              Delete
            </button>
          </li>
        ))}
        {materials.length === 0 && <li className="text-sm text-slate-500">No materials uploaded yet.</li>}
      </ul>

      <form onSubmit={handleSubmit} className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <h3 className="font-medium">Upload a material</h3>
        <input
          ref={fileInput}
          type="file"
          accept=".txt,.md,.markdown,.docx,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="block w-full text-sm"
        />
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Subject (e.g. Math, Reading)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="flex-1 min-w-[10rem] rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Title (optional — defaults to filename)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 min-w-[10rem] rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={kidId}
            onChange={(e) => setKidId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Shared with all kids</option>
            {kids.map((kid) => (
              <option key={kid.id} value={kid.id}>
                Just for {kid.name}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          Upload
        </button>
        <p className="text-xs text-slate-400">Supported: .txt, .md, .docx</p>
      </form>
    </div>
  );
}
