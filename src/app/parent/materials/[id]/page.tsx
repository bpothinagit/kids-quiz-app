import Link from "next/link";
import { notFound } from "next/navigation";
import { getMaterial, listQuestionBanksForMaterial } from "@/lib/queries";
import QuestionBankImporter from "@/components/QuestionBankImporter";

export default async function MaterialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const material = getMaterial(Number(id));
  if (!material) notFound();

  const questionBanks = listQuestionBanksForMaterial(material.id);
  const preview = material.content_text.length > 600 ? `${material.content_text.slice(0, 600)}…` : material.content_text;

  return (
    <main className="flex-1 px-6 py-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <Link href="/parent" className="text-sm text-indigo-600 hover:underline">
            ← Back to parent dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{material.title}</h1>
          <p className="text-sm text-slate-500">Subject: {material.subject}</p>
        </div>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Extracted text</h2>
          <p className="whitespace-pre-wrap rounded-xl bg-white p-4 text-sm text-slate-600 ring-1 ring-slate-200">{preview}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Generate practice questions</h2>
          <QuestionBankImporter materialId={material.id} questionBanks={questionBanks} />
        </section>
      </div>
    </main>
  );
}
