import { notFound } from "next/navigation";
import { getMaterial, getQuestionBank, getQuiz } from "@/lib/queries";
import QuizRunner from "@/components/QuizRunner";

export default async function QuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params;
  const quiz = getQuiz(Number(quizId));
  if (!quiz) notFound();

  const bank = getQuestionBank(quiz.question_bank_id);
  if (!bank) notFound();

  const material = getMaterial(bank.material_id);

  const questions = quiz.questionIndices.map((idx) => {
    const q = bank.questions[idx];
    return { question: q.question, options: q.options };
  });

  return (
    <main className="flex-1">
      <QuizRunner
        quizId={quiz.id}
        kidId={quiz.kid_id}
        subject={material?.subject ?? ""}
        materialTitle={material?.title ?? ""}
        questions={questions}
      />
    </main>
  );
}
