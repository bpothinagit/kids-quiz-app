import { vi, describe, it, expect, beforeEach } from "vitest";

// The factory is hoisted by Vitest, so testDb must be created inside it.
// We import the mocked module below to get a reference for table cleanup.
vi.mock("@/lib/db", async () => {
  const { default: Database } = await import("better-sqlite3");
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS kids (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      grade_level TEXT NOT NULL DEFAULT '',
      avatar_color TEXT NOT NULL DEFAULT '#6366f1',
      avatar_emoji TEXT NOT NULL DEFAULT '🦊',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kid_id INTEGER REFERENCES kids(id) ON DELETE CASCADE,
      subject TEXT NOT NULL,
      title TEXT NOT NULL,
      content_text TEXT NOT NULL,
      source_filename TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS question_banks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      questions_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kid_id INTEGER NOT NULL REFERENCES kids(id) ON DELETE CASCADE,
      question_bank_id INTEGER NOT NULL REFERENCES question_banks(id) ON DELETE CASCADE,
      question_indices_json TEXT NOT NULL,
      question_sources_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
      kid_id INTEGER NOT NULL REFERENCES kids(id) ON DELETE CASCADE,
      answers_json TEXT NOT NULL,
      score INTEGER NOT NULL,
      total INTEGER NOT NULL,
      completed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return { default: db };
});

import db from "@/lib/db";
import {
  listKids,
  getKid,
  createKid,
  updateKid,
  deleteKid,
  listMaterials,
  getMaterial,
  createMaterial,
  deleteMaterial,
  listQuestionBanksForMaterial,
  getQuestionBank,
  createQuestionBank,
  deleteQuestionBank,
  getQuiz,
  createQuiz,
  createAttempt,
  listAttemptsForKid,
  listBanksGroupedBySubject,
} from "../queries";
import type { Question } from "../types";

const sampleQuestion: Question = {
  question: "What color is the sky?",
  options: ["Red", "Blue", "Green", "Yellow"],
  correctIndex: 1,
  explanation: "The sky appears blue due to Rayleigh scattering.",
};

beforeEach(() => {
  // Clear all tables in reverse dependency order so FK constraints are satisfied
  db.exec("DELETE FROM attempts");
  db.exec("DELETE FROM quizzes");
  db.exec("DELETE FROM question_banks");
  db.exec("DELETE FROM materials");
  db.exec("DELETE FROM kids");
});

// ---- kids ----

describe("kids", () => {
  it("listKids returns empty array when no kids exist", () => {
    expect(listKids()).toEqual([]);
  });

  it("createKid inserts and returns the new kid", () => {
    const kid = createKid({ name: "Alice", grade_level: "3rd", avatar_color: "#ff0000", avatar_emoji: "🦊" });
    expect(kid.id).toBeGreaterThan(0);
    expect(kid.name).toBe("Alice");
    expect(kid.grade_level).toBe("3rd");
    expect(kid.avatar_color).toBe("#ff0000");
    expect(kid.avatar_emoji).toBe("🦊");
  });

  it("listKids returns all created kids in ascending creation order", () => {
    createKid({ name: "Alice", grade_level: "3rd", avatar_color: "#aaa", avatar_emoji: "🦊" });
    createKid({ name: "Bob", grade_level: "4th", avatar_color: "#bbb", avatar_emoji: "🐶" });
    const kids = listKids();
    expect(kids).toHaveLength(2);
    expect(kids[0].name).toBe("Alice");
    expect(kids[1].name).toBe("Bob");
  });

  it("getKid returns the correct kid by id", () => {
    const created = createKid({ name: "Charlie", grade_level: "2nd", avatar_color: "#ccc", avatar_emoji: "🐱" });
    const found = getKid(created.id);
    expect(found).toBeDefined();
    expect(found?.name).toBe("Charlie");
  });

  it("getKid returns undefined for a non-existent id", () => {
    expect(getKid(9999)).toBeUndefined();
  });

  it("updateKid changes the kid's fields", () => {
    const kid = createKid({ name: "Dave", grade_level: "1st", avatar_color: "#111", avatar_emoji: "🐭" });
    const updated = updateKid(kid.id, { name: "David", grade_level: "2nd", avatar_color: "#222", avatar_emoji: "🐹" });
    expect(updated?.name).toBe("David");
    expect(updated?.grade_level).toBe("2nd");
    expect(updated?.avatar_color).toBe("#222");
    expect(updated?.avatar_emoji).toBe("🐹");
  });

  it("updateKid returns undefined for a non-existent id", () => {
    expect(updateKid(9999, { name: "Ghost", grade_level: "", avatar_color: "#000", avatar_emoji: "👻" })).toBeUndefined();
  });

  it("deleteKid removes the kid", () => {
    const kid = createKid({ name: "Eve", grade_level: "5th", avatar_color: "#eee", avatar_emoji: "🦁" });
    deleteKid(kid.id);
    expect(getKid(kid.id)).toBeUndefined();
    expect(listKids()).toHaveLength(0);
  });
});

// ---- materials ----

describe("materials", () => {
  it("listMaterials returns empty array when no materials exist", () => {
    expect(listMaterials()).toEqual([]);
  });

  it("createMaterial inserts and returns the new material", () => {
    const mat = createMaterial({
      kid_id: null,
      subject: "Science",
      title: "Photosynthesis",
      content_text: "Plants make food from sunlight.",
      source_filename: "photo.txt",
    });
    expect(mat.id).toBeGreaterThan(0);
    expect(mat.subject).toBe("Science");
    expect(mat.title).toBe("Photosynthesis");
    expect(mat.kid_id).toBeNull();
  });

  it("listMaterials returns all materials when no kidId filter is given", () => {
    createMaterial({ kid_id: null, subject: "Math", title: "Algebra", content_text: "x+y", source_filename: "a.txt" });
    createMaterial({ kid_id: null, subject: "English", title: "Grammar", content_text: "nouns", source_filename: "b.txt" });
    expect(listMaterials()).toHaveLength(2);
  });

  it("listMaterials with kidId includes shared and kid-specific materials, excludes others", () => {
    const kid = createKid({ name: "Alice", grade_level: "3rd", avatar_color: "#aaa", avatar_emoji: "🦊" });
    const other = createKid({ name: "Bob", grade_level: "4th", avatar_color: "#bbb", avatar_emoji: "🐶" });
    createMaterial({ kid_id: null, subject: "Shared", title: "Shared", content_text: "shared", source_filename: "s.txt" });
    createMaterial({ kid_id: kid.id, subject: "Personal", title: "Personal", content_text: "personal", source_filename: "p.txt" });
    createMaterial({ kid_id: other.id, subject: "Other", title: "Other", content_text: "other", source_filename: "o.txt" });

    const materials = listMaterials(kid.id);
    const titles = materials.map((m) => m.title);
    expect(titles).toContain("Shared");
    expect(titles).toContain("Personal");
    expect(titles).not.toContain("Other");
  });

  it("getMaterial returns the correct material", () => {
    const mat = createMaterial({ kid_id: null, subject: "History", title: "WWII", content_text: "...", source_filename: "h.txt" });
    expect(getMaterial(mat.id)?.title).toBe("WWII");
  });

  it("getMaterial returns undefined for non-existent id", () => {
    expect(getMaterial(9999)).toBeUndefined();
  });

  it("deleteMaterial removes the material", () => {
    const mat = createMaterial({ kid_id: null, subject: "Art", title: "Colors", content_text: "...", source_filename: "c.txt" });
    deleteMaterial(mat.id);
    expect(getMaterial(mat.id)).toBeUndefined();
  });

  it("deleting a kid cascades to delete their materials", () => {
    const kid = createKid({ name: "Alice", grade_level: "3rd", avatar_color: "#aaa", avatar_emoji: "🦊" });
    const mat = createMaterial({ kid_id: kid.id, subject: "Math", title: "Algebra", content_text: "x", source_filename: "a.txt" });
    deleteKid(kid.id);
    expect(getMaterial(mat.id)).toBeUndefined();
  });
});

// ---- question banks ----

describe("question banks", () => {
  it("listQuestionBanksForMaterial returns empty array when none exist", () => {
    const mat = createMaterial({ kid_id: null, subject: "X", title: "X", content_text: "x", source_filename: "x.txt" });
    expect(listQuestionBanksForMaterial(mat.id)).toEqual([]);
  });

  it("createQuestionBank stores and parses questions as JSON", () => {
    const mat = createMaterial({ kid_id: null, subject: "Science", title: "Bio", content_text: "...", source_filename: "b.txt" });
    const bank = createQuestionBank({ material_id: mat.id, label: "Quiz 1", questions: [sampleQuestion] });
    expect(bank.id).toBeGreaterThan(0);
    expect(bank.label).toBe("Quiz 1");
    expect(bank.questions).toHaveLength(1);
    expect(bank.questions[0].question).toBe(sampleQuestion.question);
    expect(bank.questions[0].correctIndex).toBe(1);
  });

  it("listQuestionBanksForMaterial returns only banks for that material", () => {
    const mat1 = createMaterial({ kid_id: null, subject: "A", title: "A", content_text: "a", source_filename: "a.txt" });
    const mat2 = createMaterial({ kid_id: null, subject: "B", title: "B", content_text: "b", source_filename: "b.txt" });
    createQuestionBank({ material_id: mat1.id, label: "Bank 1", questions: [sampleQuestion] });
    createQuestionBank({ material_id: mat2.id, label: "Bank 2", questions: [sampleQuestion] });

    const banks = listQuestionBanksForMaterial(mat1.id);
    expect(banks).toHaveLength(1);
    expect(banks[0].label).toBe("Bank 1");
  });

  it("getQuestionBank returns the correct bank", () => {
    const mat = createMaterial({ kid_id: null, subject: "X", title: "X", content_text: "x", source_filename: "x.txt" });
    const bank = createQuestionBank({ material_id: mat.id, label: "My Bank", questions: [sampleQuestion] });
    const found = getQuestionBank(bank.id);
    expect(found?.label).toBe("My Bank");
    expect(found?.questions[0].correctIndex).toBe(1);
  });

  it("getQuestionBank returns undefined for non-existent id", () => {
    expect(getQuestionBank(9999)).toBeUndefined();
  });

  it("deleteQuestionBank removes the bank", () => {
    const mat = createMaterial({ kid_id: null, subject: "X", title: "X", content_text: "x", source_filename: "x.txt" });
    const bank = createQuestionBank({ material_id: mat.id, label: "Gone", questions: [sampleQuestion] });
    deleteQuestionBank(bank.id);
    expect(getQuestionBank(bank.id)).toBeUndefined();
  });

  it("deleting a material cascades to delete its question banks", () => {
    const mat = createMaterial({ kid_id: null, subject: "X", title: "X", content_text: "x", source_filename: "x.txt" });
    const bank = createQuestionBank({ material_id: mat.id, label: "Cascade", questions: [sampleQuestion] });
    deleteMaterial(mat.id);
    expect(getQuestionBank(bank.id)).toBeUndefined();
  });
});

// ---- quizzes ----

describe("quizzes", () => {
  it("createQuiz stores question indices as JSON and returns a Quiz", () => {
    const kid = createKid({ name: "Alice", grade_level: "3rd", avatar_color: "#aaa", avatar_emoji: "🦊" });
    const mat = createMaterial({ kid_id: null, subject: "S", title: "T", content_text: "c", source_filename: "f.txt" });
    const bank = createQuestionBank({ material_id: mat.id, label: "B", questions: [sampleQuestion, sampleQuestion] });

    const quiz = createQuiz({ kid_id: kid.id, question_bank_id: bank.id, questionIndices: [0, 1] });
    expect(quiz.id).toBeGreaterThan(0);
    expect(quiz.kid_id).toBe(kid.id);
    expect(quiz.question_bank_id).toBe(bank.id);
    expect(quiz.questionIndices).toEqual([0, 1]);
    expect(quiz.questionSources).toBeNull();
  });

  it("createQuiz stores questionSources for multi-bank quizzes", () => {
    const kid = createKid({ name: "Bob", grade_level: "4th", avatar_color: "#bbb", avatar_emoji: "🐶" });
    const mat1 = createMaterial({ kid_id: null, subject: "Math", title: "Algebra", content_text: "x", source_filename: "a.txt" });
    const mat2 = createMaterial({ kid_id: null, subject: "Math", title: "Geometry", content_text: "y", source_filename: "b.txt" });
    const bank1 = createQuestionBank({ material_id: mat1.id, label: "B1", questions: [sampleQuestion] });
    const bank2 = createQuestionBank({ material_id: mat2.id, label: "B2", questions: [sampleQuestion] });

    const sources = [{ bankId: bank1.id, idx: 0 }, { bankId: bank2.id, idx: 0 }];
    const quiz = createQuiz({ kid_id: kid.id, question_bank_id: bank1.id, questionSources: sources });
    expect(quiz.questionSources).toEqual(sources);
    expect(quiz.questionIndices).toEqual([]);
  });

  it("getQuiz returns undefined for non-existent id", () => {
    expect(getQuiz(9999)).toBeUndefined();
  });
});

// ---- listBanksGroupedBySubject ----

describe("listBanksGroupedBySubject", () => {
  it("returns an empty array when no banks exist for the kid", () => {
    const kid = createKid({ name: "Alice", grade_level: "3rd", avatar_color: "#aaa", avatar_emoji: "🦊" });
    expect(listBanksGroupedBySubject(kid.id)).toEqual([]);
  });

  it("groups banks by subject", () => {
    const kid = createKid({ name: "Alice", grade_level: "3rd", avatar_color: "#aaa", avatar_emoji: "🦊" });
    const mathMat = createMaterial({ kid_id: kid.id, subject: "Math", title: "Algebra", content_text: "x", source_filename: "a.txt" });
    const sciMat = createMaterial({ kid_id: kid.id, subject: "Science", title: "Biology", content_text: "y", source_filename: "b.txt" });
    createQuestionBank({ material_id: mathMat.id, label: "Q1", questions: [sampleQuestion, sampleQuestion] });
    createQuestionBank({ material_id: sciMat.id, label: "Q2", questions: [sampleQuestion] });

    const groups = listBanksGroupedBySubject(kid.id);
    expect(groups).toHaveLength(2);
    const math = groups.find((g) => g.subject === "Math")!;
    expect(math.banks).toHaveLength(1);
    expect(math.banks[0].questionCount).toBe(2);
    expect(math.banks[0].materialTitle).toBe("Algebra");
    const sci = groups.find((g) => g.subject === "Science")!;
    expect(sci.banks).toHaveLength(1);
    expect(sci.banks[0].questionCount).toBe(1);
  });

  it("includes multiple banks within the same subject", () => {
    const kid = createKid({ name: "Bob", grade_level: "4th", avatar_color: "#bbb", avatar_emoji: "🐶" });
    const mat1 = createMaterial({ kid_id: kid.id, subject: "Math", title: "Algebra", content_text: "x", source_filename: "a.txt" });
    const mat2 = createMaterial({ kid_id: kid.id, subject: "Math", title: "Geometry", content_text: "y", source_filename: "b.txt" });
    createQuestionBank({ material_id: mat1.id, label: "B1", questions: [sampleQuestion] });
    createQuestionBank({ material_id: mat2.id, label: "B2", questions: [sampleQuestion, sampleQuestion] });

    const groups = listBanksGroupedBySubject(kid.id);
    expect(groups).toHaveLength(1);
    expect(groups[0].subject).toBe("Math");
    expect(groups[0].banks).toHaveLength(2);
  });

  it("includes shared materials (kid_id = null) alongside kid-specific ones", () => {
    const kid = createKid({ name: "Alice", grade_level: "3rd", avatar_color: "#aaa", avatar_emoji: "🦊" });
    const shared = createMaterial({ kid_id: null, subject: "History", title: "WWII", content_text: "...", source_filename: "h.txt" });
    const personal = createMaterial({ kid_id: kid.id, subject: "History", title: "Ancient Rome", content_text: "...", source_filename: "r.txt" });
    createQuestionBank({ material_id: shared.id, label: "S", questions: [sampleQuestion] });
    createQuestionBank({ material_id: personal.id, label: "P", questions: [sampleQuestion] });

    const groups = listBanksGroupedBySubject(kid.id);
    const history = groups.find((g) => g.subject === "History")!;
    expect(history.banks).toHaveLength(2);
  });
});

// ---- attempts ----

describe("attempts", () => {
  function setupQuiz() {
    const kid = createKid({ name: "Alice", grade_level: "3rd", avatar_color: "#aaa", avatar_emoji: "🦊" });
    const mat = createMaterial({ kid_id: null, subject: "Math", title: "Algebra", content_text: "x", source_filename: "a.txt" });
    const bank = createQuestionBank({ material_id: mat.id, label: "Quiz", questions: [sampleQuestion, sampleQuestion] });
    const quiz = createQuiz({ kid_id: kid.id, question_bank_id: bank.id, questionIndices: [0, 1] });
    return { kid, mat, bank, quiz };
  }

  it("createAttempt stores answers as JSON and returns an Attempt", () => {
    const { kid, quiz } = setupQuiz();
    const attempt = createAttempt({ quiz_id: quiz.id, kid_id: kid.id, answers: [1, 0], score: 1, total: 2 });
    expect(attempt.id).toBeGreaterThan(0);
    expect(attempt.answers).toEqual([1, 0]);
    expect(attempt.score).toBe(1);
    expect(attempt.total).toBe(2);
  });

  it("listAttemptsForKid returns attempts with subject and materialTitle from join", () => {
    const { kid, quiz } = setupQuiz();
    createAttempt({ quiz_id: quiz.id, kid_id: kid.id, answers: [1, 1], score: 2, total: 2 });

    const attempts = listAttemptsForKid(kid.id);
    expect(attempts).toHaveLength(1);
    expect(attempts[0].score).toBe(2);
    expect(attempts[0].subject).toBe("Math");
    expect(attempts[0].materialTitle).toBe("Algebra");
  });

  it("listAttemptsForKid returns empty array for a kid with no attempts", () => {
    const kid = createKid({ name: "NewKid", grade_level: "1st", avatar_color: "#000", avatar_emoji: "🐣" });
    expect(listAttemptsForKid(kid.id)).toEqual([]);
  });

  it("listAttemptsForKid only returns attempts for the requested kid", () => {
    const kid1 = createKid({ name: "Kid1", grade_level: "1st", avatar_color: "#aaa", avatar_emoji: "🦊" });
    const kid2 = createKid({ name: "Kid2", grade_level: "2nd", avatar_color: "#bbb", avatar_emoji: "🐶" });
    const mat = createMaterial({ kid_id: null, subject: "S", title: "T", content_text: "c", source_filename: "f.txt" });
    const bank = createQuestionBank({ material_id: mat.id, label: "B", questions: [sampleQuestion] });
    const quiz1 = createQuiz({ kid_id: kid1.id, question_bank_id: bank.id, questionIndices: [0] });
    const quiz2 = createQuiz({ kid_id: kid2.id, question_bank_id: bank.id, questionIndices: [0] });
    createAttempt({ quiz_id: quiz1.id, kid_id: kid1.id, answers: [1], score: 1, total: 1 });
    createAttempt({ quiz_id: quiz2.id, kid_id: kid2.id, answers: [0], score: 0, total: 1 });

    expect(listAttemptsForKid(kid1.id)).toHaveLength(1);
    expect(listAttemptsForKid(kid2.id)).toHaveLength(1);
    expect(listAttemptsForKid(kid1.id)[0].score).toBe(1);
    expect(listAttemptsForKid(kid2.id)[0].score).toBe(0);
  });
});
