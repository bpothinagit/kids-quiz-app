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
          <Link href="/" className="text-sm text-indigo-600 hover:underline">
            ← Back to kid selector
          </Link>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Kid profiles</h2>
          <KidManager kids={kids} />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Study materials</h2>
          <p className="text-sm text-slate-500">
            Upload curriculum text, Word docs, or PDFs, tag them with a subject, then generate practice
            questions from them.
          </p>
          <MaterialUploader kids={kids} materials={materials} />
        </section>
      </div>
    </main>
  );
}
