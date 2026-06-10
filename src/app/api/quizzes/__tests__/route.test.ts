import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockKid = { id: 1, name: "Alice", grade_level: "3rd", avatar_color: "#6366f1", avatar_emoji: "🦊", created_at: "2024-01-01" };

const mockQuestion = {
  question: "Q?",
  options: ["A", "B", "C", "D"] as [string, string, string, string],
  correctIndex: 0 as const,
  explanation: "Because A.",
};

const mockBank = {
  id: 10,
  material_id: 5,
  label: "Test Bank",
  questions: [mockQuestion, mockQuestion, mockQuestion, mockQuestion, mockQuestion],
  created_at: "2024-01-01",
};

const mockQuiz = { id: 99, kid_id: 1, question_bank_id: 10, questionIndices: [0, 1, 2], questionSources: null, created_at: "2024-01-01" };

vi.mock("@/lib/queries", () => ({
  getKid: vi.fn(),
  getQuestionBank: vi.fn(),
  createQuiz: vi.fn(),
}));

import { POST } from "../route";
import { getKid, getQuestionBank, createQuiz } from "@/lib/queries";

beforeEach(() => {
  vi.resetAllMocks();
});

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/quizzes", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/quizzes", () => {
  it("creates a quiz and returns it with status 201", async () => {
    vi.mocked(getKid).mockReturnValue(mockKid);
    vi.mocked(getQuestionBank).mockReturnValue(mockBank);
    vi.mocked(createQuiz).mockReturnValue(mockQuiz);

    const res = await POST(makeRequest({ kidId: 1, questionBankId: 10, count: 3 }));
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.quiz).toBeDefined();
    expect(createQuiz).toHaveBeenCalledOnce();
  });

  it("returns 404 when kid does not exist", async () => {
    vi.mocked(getKid).mockReturnValue(undefined);
    vi.mocked(getQuestionBank).mockReturnValue(mockBank);

    const res = await POST(makeRequest({ kidId: 999, questionBankId: 10, count: 3 }));
    const data = await res.json();
    expect(res.status).toBe(404);
    expect(data.error).toMatch(/kid not found/i);
    expect(createQuiz).not.toHaveBeenCalled();
  });

  it("returns 404 when question bank does not exist", async () => {
    vi.mocked(getKid).mockReturnValue(mockKid);
    vi.mocked(getQuestionBank).mockReturnValue(undefined);

    const res = await POST(makeRequest({ kidId: 1, questionBankId: 999, count: 3 }));
    const data = await res.json();
    expect(res.status).toBe(404);
    expect(data.error).toMatch(/question bank not found/i);
    expect(createQuiz).not.toHaveBeenCalled();
  });

  it("caps count at the number of available questions", async () => {
    vi.mocked(getKid).mockReturnValue(mockKid);
    vi.mocked(getQuestionBank).mockReturnValue(mockBank); // 5 questions
    vi.mocked(createQuiz).mockReturnValue(mockQuiz);

    await POST(makeRequest({ kidId: 1, questionBankId: 10, count: 100 }));
    const call = vi.mocked(createQuiz).mock.calls[0][0];
    expect(call.questionIndices.length).toBeLessThanOrEqual(mockBank.questions.length);
  });

  it("defaults to at most 10 questions when count is not a valid integer", async () => {
    vi.mocked(getKid).mockReturnValue(mockKid);
    vi.mocked(getQuestionBank).mockReturnValue(mockBank); // 5 questions
    vi.mocked(createQuiz).mockReturnValue(mockQuiz);

    await POST(makeRequest({ kidId: 1, questionBankId: 10, count: "bad" }));
    const call = vi.mocked(createQuiz).mock.calls[0][0];
    // Bank has 5 questions, default is min(10, 5) = 5
    expect(call.questionIndices.length).toBe(5);
  });

  it("sampled indices are unique and within bounds", async () => {
    vi.mocked(getKid).mockReturnValue(mockKid);
    vi.mocked(getQuestionBank).mockReturnValue(mockBank);
    vi.mocked(createQuiz).mockImplementation((input) => ({ ...mockQuiz, questionIndices: input.questionIndices ?? [] }));

    const res = await POST(makeRequest({ kidId: 1, questionBankId: 10, count: 3 }));
    const data = await res.json();
    const indices: number[] = data.quiz.questionIndices;
    expect(new Set(indices).size).toBe(indices.length);
    for (const idx of indices) {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(mockBank.questions.length);
    }
  });
});

describe("POST /api/quizzes — multi-bank mode", () => {
  const mockBank2 = {
    id: 20,
    material_id: 6,
    label: "Bank 2",
    questions: [mockQuestion, mockQuestion, mockQuestion],
    created_at: "2024-01-01",
  };

  it("creates a multi-bank quiz when bankIds array is provided", async () => {
    vi.mocked(getKid).mockReturnValue(mockKid);
    vi.mocked(getQuestionBank).mockImplementation((id) => (id === 10 ? mockBank : id === 20 ? mockBank2 : undefined));
    vi.mocked(createQuiz).mockReturnValue({ ...mockQuiz, questionSources: [{ bankId: 10, idx: 0 }] });

    const res = await POST(makeRequest({ kidId: 1, bankIds: [10, 20], count: 4 }));
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.quiz).toBeDefined();
    expect(createQuiz).toHaveBeenCalledOnce();
    const call = vi.mocked(createQuiz).mock.calls[0][0];
    expect(call.questionSources).toBeDefined();
    expect(call.questionIndices).toBeUndefined();
  });

  it("pools questions from all selected banks", async () => {
    vi.mocked(getKid).mockReturnValue(mockKid);
    vi.mocked(getQuestionBank).mockImplementation((id) => (id === 10 ? mockBank : id === 20 ? mockBank2 : undefined));
    vi.mocked(createQuiz).mockImplementation((input) => ({ ...mockQuiz, questionSources: input.questionSources ?? [] }));

    await POST(makeRequest({ kidId: 1, bankIds: [10, 20], count: 8 }));
    const call = vi.mocked(createQuiz).mock.calls[0][0];
    // Pool has 5 + 3 = 8 questions; count=8 uses all
    expect(call.questionSources!.length).toBe(8);
    const bankIdsUsed = new Set(call.questionSources!.map((s: { bankId: number }) => s.bankId));
    expect(bankIdsUsed).toContain(10);
    expect(bankIdsUsed).toContain(20);
  });

  it("caps count at pool size for multi-bank", async () => {
    vi.mocked(getKid).mockReturnValue(mockKid);
    vi.mocked(getQuestionBank).mockImplementation((id) => (id === 10 ? mockBank : id === 20 ? mockBank2 : undefined));
    vi.mocked(createQuiz).mockImplementation((input) => ({ ...mockQuiz, questionSources: input.questionSources ?? [] }));

    await POST(makeRequest({ kidId: 1, bankIds: [10, 20], count: 999 }));
    const call = vi.mocked(createQuiz).mock.calls[0][0];
    expect(call.questionSources!.length).toBeLessThanOrEqual(8);
  });

  it("returns 404 when a bank in bankIds does not exist", async () => {
    vi.mocked(getKid).mockReturnValue(mockKid);
    vi.mocked(getQuestionBank).mockImplementation((id) => (id === 10 ? mockBank : undefined));

    const res = await POST(makeRequest({ kidId: 1, bankIds: [10, 999], count: 3 }));
    const data = await res.json();
    expect(res.status).toBe(404);
    expect(data.error).toMatch(/question bank/i);
    expect(createQuiz).not.toHaveBeenCalled();
  });

  it("returns 404 when kid does not exist in multi-bank mode", async () => {
    vi.mocked(getKid).mockReturnValue(undefined);

    const res = await POST(makeRequest({ kidId: 999, bankIds: [10], count: 3 }));
    const data = await res.json();
    expect(res.status).toBe(404);
    expect(data.error).toMatch(/kid not found/i);
  });
});
