import Link from "next/link";
import { listKids, listMaterials } from "@/lib/queries";
import KidManager from "@/components/KidManager";
import MaterialUploader from "@/components/MaterialUploader";

export default function ParentDashboard() {
  const kids = listKids();
  const materials = listMaterials();

  return (
    <main className="flex-1 px-6 py-12">
      <div className="mx-auto max-w-3xl space-y-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Parent dashboard</h1>
          <Link href="/home" className="text-sm text-indigo-600 hover:underline">
            ← Back to kid selector
          </Link>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
            <h2 className="text-lg font-semibold">Kid profiles</h2>
          </div>
          <div className="p-5">
            <KidManager kids={kids} />
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
            <h2 className="text-lg font-semibold">Study materials</h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Upload curriculum text, Word docs, or PDFs, tag them with a subject, then generate practice
              questions from them.
            </p>
          </div>
          <div className="p-5">
            <MaterialUploader kids={kids} materials={materials} />
          </div>
        </section>
      </div>
    </main>
  );
}
