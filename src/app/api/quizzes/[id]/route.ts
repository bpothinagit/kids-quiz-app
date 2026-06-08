import { NextRequest, NextResponse } from "next/server";
import { getMaterial, getQuestionBank, getQuiz } from "@/lib/queries";

/**
 * Returns the quiz's questions WITHOUT the answer key — the client shouldn't be
 * able to peek at correctIndex/explanation before submitting.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quiz = getQuiz(Number(id));
  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
  }
  const bank = getQuestionBank(quiz.question_bank_id);
  if (!bank) {
    return NextResponse.json({ error: "Question bank no longer exists." }, { status: 404 });
  }
  const material = getMaterial(bank.material_id);

  const questions = quiz.questionIndices.map((idx) => {
    const q = bank.questions[idx];
    return { question: q.question, options: q.options };
  });

  return NextResponse.json({
    quiz: { id: quiz.id, kidId: quiz.kid_id, subject: material?.subject ?? "", materialTitle: material?.title ?? "" },
    questions,
  });
}
