import { NextRequest, NextResponse } from "next/server";
import { createQuiz, getKid, getQuestionBank } from "@/lib/queries";
import type { QuizSource } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const kidId = Number(body.kidId);

  const kid = getKid(kidId);
  if (!kid) {
    return NextResponse.json({ error: "Kid not found." }, { status: 404 });
  }

  // Multi-bank mode: bankIds array
  if (Array.isArray(body.bankIds) && body.bankIds.length > 0) {
    const bankIds: number[] = [...new Set(body.bankIds.map(Number))];
    const banks = bankIds.map((id) => getQuestionBank(id));
    const missingIdx = banks.findIndex((b) => !b);
    if (missingIdx !== -1) {
      return NextResponse.json({ error: "One or more question banks not found." }, { status: 404 });
    }

    const pool: QuizSource[] = [];
    for (let b = 0; b < bankIds.length; b++) {
      const bank = banks[b]!;
      for (let i = 0; i < bank.questions.length; i++) {
        pool.push({ bankId: bankIds[b], idx: i });
      }
    }

    const countRaw = Number(body.count);
    const count =
      Number.isInteger(countRaw) && countRaw > 0 ? Math.min(countRaw, pool.length) : Math.min(10, pool.length);

    shuffle(pool);
    const questionSources = pool.slice(0, count);

    const quiz = createQuiz({ kid_id: kid.id, question_bank_id: bankIds[0], questionSources });
    return NextResponse.json({ quiz }, { status: 201 });
  }

  // Legacy single-bank mode
  const questionBankId = Number(body.questionBankId);
  const bank = getQuestionBank(questionBankId);
  if (!bank) {
    return NextResponse.json({ error: "Question bank not found." }, { status: 404 });
  }

  const countRaw = Number(body.count);
  const count =
    Number.isInteger(countRaw) && countRaw > 0
      ? Math.min(countRaw, bank.questions.length)
      : Math.min(10, bank.questions.length);

  const questionIndices = sampleIndices(bank.questions.length, count);
  const quiz = createQuiz({ kid_id: kid.id, question_bank_id: bank.id, questionIndices });
  return NextResponse.json({ quiz }, { status: 201 });
}

function sampleIndices(poolSize: number, count: number): number[] {
  const pool = Array.from({ length: poolSize }, (_, i) => i);
  shuffle(pool);
  return pool.slice(0, count);
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
