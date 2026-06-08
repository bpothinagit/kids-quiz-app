import { NextRequest, NextResponse } from "next/server";
import { createAttempt, getQuestionBank, getQuiz } from "@/lib/queries";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quiz = getQuiz(Number(id));
  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
  }
  const bank = getQuestionBank(quiz.question_bank_id);
  if (!bank) {
    return NextResponse.json({ error: "Question bank no longer exists." }, { status: 404 });
  }

  const body = await request.json();
  const answers: unknown = body.answers;
  if (!Array.isArray(answers) || answers.length !== quiz.questionIndices.length) {
    return NextResponse.json({ error: "Answers don't match the number of questions in this quiz." }, { status: 400 });
  }

  const results = quiz.questionIndices.map((bankIndex, i) => {
    const question = bank.questions[bankIndex];
    const selected = Number.isInteger(answers[i]) ? Number(answers[i]) : -1;
    const correct = selected === question.correctIndex;
    return {
      question: question.question,
      options: question.options,
      selected,
      correctIndex: question.correctIndex,
      correct,
      explanation: question.explanation,
    };
  });

  const score = results.filter((r) => r.correct).length;
  const total = results.length;

  createAttempt({
    quiz_id: quiz.id,
    kid_id: quiz.kid_id,
    answers: results.map((r) => r.selected),
    score,
    total,
  });

  return NextResponse.json({ score, total, results });
}
