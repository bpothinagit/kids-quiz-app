import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockQuestion = (correctIndex: 0 | 1 | 2 | 3) => ({
  question: "What is correct?",
  options: ["A", "B", "C", "D"] as [string, string, string, string],
  correctIndex,
  explanation: "This is why.",
});

const mockBank = {
  id: 10,
  material_id: 5,
  label: "Test Bank",
  questions: [mockQuestion(1), mockQuestion(2), mockQuestion(0)],
  created_at: "2024-01-01",
};

const mockQuiz = { id: 42, kid_id: 1, question_bank_id: 10, questionIndices: [0, 1, 2], questionSources: null, created_at: "2024-01-01" };

vi.mock("@/lib/queries", () => ({
  getQuiz: vi.fn(),
  getQuestionBank: vi.fn(),
  createAttempt: vi.fn(),
}));

import { POST } from "../route";
import { getQuiz, getQuestionBank, createAttempt } from "@/lib/queries";

beforeEach(() => {
  vi.resetAllMocks();
});

function makeRequest(quizId: string, body: unknown): [NextRequest, { params: Promise<{ id: string }> }] {
  return [
    new NextRequest(`http://localhost/api/quizzes/${quizId}/submit`, {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }),
    { params: Promise.resolve({ id: quizId }) },
  ];
}

describe("POST /api/quizzes/[id]/submit", () => {
  beforeEach(() => {
    vi.mocked(getQuiz).mockReturnValue(mockQuiz);
    vi.mocked(getQuestionBank).mockReturnValue(mockBank);
    vi.mocked(createAttempt).mockReturnValue({
      id: 1, quiz_id: 42, kid_id: 1, answers: [], score: 0, total: 0, completed_at: "2024-01-01",
    });
  });

  it("returns score, total, and per-question results", async () => {
    // Questions correctIndices: [1, 2, 0]. Submit correct answers.
    const res = await POST(...makeRequest("42", { answers: [1, 2, 0] }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.score).toBe(3);
    expect(data.total).toBe(3);
    expect(data.results).toHaveLength(3);
    expect(data.results.every((r: { correct: boolean }) => r.correct)).toBe(true);
  });

  it("scores a mix of correct and incorrect answers", async () => {
    // Q0 correct=1, Q1 correct=2, Q2 correct=0. Submit 1, 0, 0 → score=2
    const res = await POST(...makeRequest("42", { answers: [1, 0, 0] }));
    const data = await res.json();
    expect(data.score).toBe(2);
    expect(data.total).toBe(3);
    expect(data.results[0].correct).toBe(true);
    expect(data.results[1].correct).toBe(false);
    expect(data.results[2].correct).toBe(true);
  });

  it("scores zero when all answers are wrong", async () => {
    const res = await POST(...makeRequest("42", { answers: [0, 0, 1] }));
    const data = await res.json();
    expect(data.score).toBe(0);
    expect(data.total).toBe(3);
    expect(data.results.every((r: { correct: boolean }) => !r.correct)).toBe(true);
  });

  it("includes question text, options, correctIndex, selected, and explanation in results", async () => {
    const res = await POST(...makeRequest("42", { answers: [1, 2, 0] }));
    const data = await res.json();
    const result = data.results[0];
    expect(result).toHaveProperty("question");
    expect(result).toHaveProperty("options");
    expect(result).toHaveProperty("correctIndex");
    expect(result).toHaveProperty("selected");
    expect(result).toHaveProperty("explanation");
    expect(result).toHaveProperty("correct");
  });

  it("treats non-integer answers as -1 (wrong)", async () => {
    const res = await POST(...makeRequest("42", { answers: ["bad", null, 0] }));
    const data = await res.json();
    // Q0 correct=1, submitted "bad"→-1 → wrong
    expect(data.results[0].correct).toBe(false);
    expect(data.results[0].selected).toBe(-1);
  });

  it("persists the attempt via createAttempt", async () => {
    await POST(...makeRequest("42", { answers: [1, 2, 0] }));
    expect(createAttempt).toHaveBeenCalledOnce();
    expect(createAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ quiz_id: 42, kid_id: 1, score: 3, total: 3 }),
    );
  });

  it("returns 404 when quiz does not exist", async () => {
    vi.mocked(getQuiz).mockReturnValue(undefined);
    const res = await POST(...makeRequest("999", { answers: [] }));
    const data = await res.json();
    expect(res.status).toBe(404);
    expect(data.error).toMatch(/quiz not found/i);
    expect(createAttempt).not.toHaveBeenCalled();
  });

  it("returns 404 when question bank no longer exists", async () => {
    vi.mocked(getQuestionBank).mockReturnValue(undefined);
    const res = await POST(...makeRequest("42", { answers: [1, 2, 0] }));
    const data = await res.json();
    expect(res.status).toBe(404);
    expect(data.error).toMatch(/question bank/i);
    expect(createAttempt).not.toHaveBeenCalled();
  });

  it("returns 400 when answers array length mismatches number of quiz questions", async () => {
    const res = await POST(...makeRequest("42", { answers: [1] })); // quiz has 3 questions
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toMatch(/answers/i);
    expect(createAttempt).not.toHaveBeenCalled();
  });

  it("returns 400 when answers is not an array", async () => {
    const res = await POST(...makeRequest("42", { answers: "not-an-array" }));
    expect(res.status).toBe(400);
    expect(createAttempt).not.toHaveBeenCalled();
  });
});

describe("POST /api/quizzes/[id]/submit — multi-bank quiz", () => {
  const bankA = {
    id: 10,
    material_id: 5,
    label: "Bank A",
    questions: [mockQuestion(1)],
    created_at: "2024-01-01",
  };
  const bankB = {
    id: 20,
    material_id: 6,
    label: "Bank B",
    questions: [mockQuestion(2)],
    created_at: "2024-01-01",
  };
  const multiQuiz = {
    id: 55,
    kid_id: 1,
    question_bank_id: 10,
    questionIndices: [],
    questionSources: [
      { bankId: 10, idx: 0 },
      { bankId: 20, idx: 0 },
    ],
    created_at: "2024-01-01",
  };

  beforeEach(() => {
    vi.mocked(getQuiz).mockReturnValue(multiQuiz);
    vi.mocked(getQuestionBank).mockImplementation((id) => (id === 10 ? bankA : id === 20 ? bankB : undefined));
    vi.mocked(createAttempt).mockReturnValue({
      id: 2, quiz_id: 55, kid_id: 1, answers: [], score: 0, total: 0, completed_at: "2024-01-01",
    });
  });

  it("grades a multi-bank quiz correctly", async () => {
    // bankA q0 correctIndex=1, bankB q0 correctIndex=2
    const res = await POST(...makeRequest("55", { answers: [1, 2] }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.score).toBe(2);
    expect(data.total).toBe(2);
    expect(data.results[0].correct).toBe(true);
    expect(data.results[1].correct).toBe(true);
  });

  it("returns 400 when answers length mismatches questionSources length", async () => {
    const res = await POST(...makeRequest("55", { answers: [1] }));
    expect(res.status).toBe(400);
    expect(createAttempt).not.toHaveBeenCalled();
  });

  it("returns 404 when a source bank no longer exists", async () => {
    vi.mocked(getQuestionBank).mockReturnValue(undefined);
    const res = await POST(...makeRequest("55", { answers: [1, 2] }));
    expect(res.status).toBe(404);
    expect(createAttempt).not.toHaveBeenCalled();
  });
});
