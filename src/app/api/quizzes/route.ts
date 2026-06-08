import { NextRequest, NextResponse } from "next/server";
import { createQuiz, getKid, getQuestionBank } from "@/lib/queries";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const kidId = Number(body.kidId);
  const questionBankId = Number(body.questionBankId);
  const countRaw = Number(body.count);

  const kid = getKid(kidId);
  if (!kid) {
    return NextResponse.json({ error: "Kid not found." }, { status: 404 });
  }
  const bank = getQuestionBank(questionBankId);
  if (!bank) {
    return NextResponse.json({ error: "Question bank not found." }, { status: 404 });
  }

  const count = Number.isInteger(countRaw) && countRaw > 0 ? Math.min(countRaw, bank.questions.length) : Math.min(10, bank.questions.length);

  const questionIndices = sampleIndices(bank.questions.length, count);
  const quiz = createQuiz({ kid_id: kid.id, question_bank_id: bank.id, questionIndices });
  return NextResponse.json({ quiz }, { status: 201 });
}

function sampleIndices(poolSize: number, count: number): number[] {
  const pool = Array.from({ length: poolSize }, (_, i) => i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
