import { NextRequest, NextResponse } from "next/server";
import { getMaterial, getQuestionBank, getQuiz } from "@/lib/queries";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quiz = getQuiz(Number(id));
  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
  }

  if (quiz.questionSources && quiz.questionSources.length > 0) {
    const uniqueBankIds = [...new Set(quiz.questionSources.map((s) => s.bankId))];
    const bankMap = new Map(uniqueBankIds.map((bid) => [bid, getQuestionBank(bid)]));
    if ([...bankMap.values()].some((b) => !b)) {
      return NextResponse.json({ error: "A question bank no longer exists." }, { status: 404 });
    }

    const questions = quiz.questionSources.map(({ bankId, idx }) => {
      const q = bankMap.get(bankId)!.questions[idx];
      return { question: q.question, options: q.options };
    });

    const firstBank = bankMap.get(quiz.questionSources[0].bankId)!;
    const material = getMaterial(firstBank.material_id);
    return NextResponse.json({
      quiz: { id: quiz.id, kidId: quiz.kid_id, subject: material?.subject ?? "", materialTitle: material?.title ?? "" },
      questions,
    });
  }

  // Legacy single-bank path
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
