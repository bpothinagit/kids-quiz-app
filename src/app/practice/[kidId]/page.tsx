import Link from "next/link";
import { notFound } from "next/navigation";
import { getKid, listBanksGroupedBySubject } from "@/lib/queries";
import PracticePicker from "@/components/PracticePicker";

export default async function PracticePage({ params }: { params: Promise<{ kidId: string }> }) {
  const { kidId } = await params;
  const kid = getKid(Number(kidId));
  if (!kid) notFound();

  const subjectGroups = listBanksGroupedBySubject(kid.id);

  return (
    <main className="flex-1 px-6 py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Hi {kid.name}! What do you want to practice?</h1>
            {kid.grade_level && <p className="text-sm text-slate-600">{kid.grade_level}</p>}
          </div>
          <Link href={`/progress/${kid.id}`} className="text-sm text-indigo-600 hover:underline">
            My progress →
          </Link>
        </div>

        <PracticePicker kidId={kid.id} subjectGroups={subjectGroups} />

        <Link href="/home" className="inline-block text-sm text-slate-600 hover:text-slate-600 underline">
          ← Switch profile
        </Link>
      </div>
    </main>
  );
}
