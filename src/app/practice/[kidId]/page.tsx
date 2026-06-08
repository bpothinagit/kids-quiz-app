import Link from "next/link";
import { notFound } from "next/navigation";
import { getKid, listMaterials, listQuestionBanksForMaterial } from "@/lib/queries";
import PracticePicker, { type PracticeOption } from "@/components/PracticePicker";

export default async function PracticePage({ params }: { params: Promise<{ kidId: string }> }) {
  const { kidId } = await params;
  const kid = getKid(Number(kidId));
  if (!kid) notFound();

  const materials = listMaterials(kid.id);
  const options: PracticeOption[] = materials.flatMap((material) =>
    listQuestionBanksForMaterial(material.id).map((bank) => ({
      materialId: material.id,
      materialTitle: material.title,
      subject: material.subject,
      bankId: bank.id,
      bankLabel: bank.label,
      questionCount: bank.questions.length,
    })),
  );

  return (
    <main className="flex-1 px-6 py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Hi {kid.name}! What do you want to practice?</h1>
            {kid.grade_level && <p className="text-sm text-slate-500">{kid.grade_level}</p>}
          </div>
          <Link href={`/progress/${kid.id}`} className="text-sm text-indigo-600 hover:underline">
            My progress →
          </Link>
        </div>

        <PracticePicker kidId={kid.id} options={options} />

        <Link href="/" className="inline-block text-sm text-slate-400 hover:text-slate-600 underline">
          ← Switch profile
        </Link>
      </div>
    </main>
  );
}
