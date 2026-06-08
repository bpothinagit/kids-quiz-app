import Link from "next/link";
import { notFound } from "next/navigation";
import { getKid, listAttemptsForKid } from "@/lib/queries";

export default async function ProgressPage({ params }: { params: Promise<{ kidId: string }> }) {
  const { kidId } = await params;
  const kid = getKid(Number(kidId));
  if (!kid) notFound();

  const attempts = listAttemptsForKid(kid.id);

  const bySubject = new Map<string, { attempts: number; correct: number; total: number }>();
  for (const a of attempts) {
    const entry = bySubject.get(a.subject) ?? { attempts: 0, correct: 0, total: 0 };
    entry.attempts += 1;
    entry.correct += a.score;
    entry.total += a.total;
    bySubject.set(a.subject, entry);
  }

  return (
    <main className="flex-1 px-6 py-12">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{kid.name}&apos;s progress</h1>
            {kid.grade_level && <p className="text-sm text-slate-500">{kid.grade_level}</p>}
          </div>
          <Link href={`/practice/${kid.id}`} className="text-sm text-indigo-600 hover:underline">
            ← Back to practice
          </Link>
        </div>

        {attempts.length === 0 ? (
          <p className="rounded-xl bg-white p-4 text-sm text-slate-500 ring-1 ring-slate-200">
            No quizzes taken yet — finish a practice quiz to start tracking progress here.
          </p>
        ) : (
          <>
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">By subject</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {[...bySubject.entries()].map(([subject, stats]) => {
                  const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                  return (
                    <div key={subject} className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                      <p className="font-medium">{subject}</p>
                      <p className="text-2xl font-bold text-indigo-600">{pct}%</p>
                      <p className="text-xs text-slate-400">
                        {stats.correct} / {stats.total} correct across {stats.attempts} quiz{stats.attempts === 1 ? "" : "zes"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Recent attempts</h2>
              <ul className="space-y-2">
                {attempts.map((a) => {
                  const pct = a.total > 0 ? Math.round((a.score / a.total) * 100) : 0;
                  return (
                    <li key={a.id} className="flex items-center justify-between rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200">
                      <div>
                        <p className="font-medium">{a.subject} · {a.materialTitle}</p>
                        <p className="text-xs text-slate-400">{formatDate(a.completed_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{a.score} / {a.total}</p>
                        <p className="text-xs text-slate-400">{pct}%</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function formatDate(isoUtcString: string): string {
  // SQLite's datetime('now') returns UTC without a timezone suffix.
  const date = new Date(`${isoUtcString.replace(" ", "T")}Z`);
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
