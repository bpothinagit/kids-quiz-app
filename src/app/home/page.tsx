import Link from "next/link";
import { listKids } from "@/lib/queries";
import { KidAvatar } from "@/components/KidManager";

export default function HomePage() {
  const kids = listKids();

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 gap-10">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">Who&apos;s practicing today?</h1>
        <p className="text-slate-600">Pick your name to start a quiz, or check your progress.</p>
      </div>

      {kids.length === 0 ? (
        <div className="text-center space-y-3">
          <p className="text-slate-600">No kid profiles yet.</p>
          <Link
            href="/parent"
            className="inline-block rounded-full bg-indigo-600 px-6 py-3 text-white font-medium hover:bg-indigo-700"
          >
            Set up a profile in the parent dashboard
          </Link>
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-6">
          {kids.map((kid) => (
            <Link
              key={kid.id}
              href={`/practice/${kid.id}`}
              className="group flex flex-col items-center gap-3 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 hover:shadow-md hover:ring-indigo-300 transition w-40"
            >
              <KidAvatar kid={kid} size="lg" />
              <span className="text-lg font-semibold">{kid.name}</span>
              {kid.grade_level && <span className="text-sm text-slate-600">{kid.grade_level}</span>}
            </Link>
          ))}
        </div>
      )}

      <Link href="/parent" className="text-sm text-slate-600 hover:text-slate-600 underline">
        Parent dashboard
      </Link>
    </main>
  );
}
