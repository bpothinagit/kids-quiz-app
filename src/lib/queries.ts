import db from "./db";
import type { Attempt, Kid, Material, Question, QuestionBank, Quiz, QuizSource, SubjectGroup } from "./types";

// ---- kids ----

export function listKids(): Kid[] {
  return db.prepare("SELECT * FROM kids ORDER BY created_at ASC").all() as Kid[];
}

export function getKid(id: number): Kid | undefined {
  return db.prepare("SELECT * FROM kids WHERE id = ?").get(id) as Kid | undefined;
}

export function createKid(input: { name: string; grade_level: string; avatar_color: string; avatar_emoji: string }): Kid {
  const result = db
    .prepare("INSERT INTO kids (name, grade_level, avatar_color, avatar_emoji) VALUES (?, ?, ?, ?)")
    .run(input.name, input.grade_level, input.avatar_color, input.avatar_emoji);
  return getKid(Number(result.lastInsertRowid))!;
}

export function updateKid(id: number, input: { name: string; grade_level: string; avatar_color: string; avatar_emoji: string }): Kid | undefined {
  db.prepare("UPDATE kids SET name = ?, grade_level = ?, avatar_color = ?, avatar_emoji = ? WHERE id = ?").run(
    input.name,
    input.grade_level,
    input.avatar_color,
    input.avatar_emoji,
    id,
  );
  return getKid(id);
}

export function deleteKid(id: number): void {
  db.prepare("DELETE FROM kids WHERE id = ?").run(id);
}

// ---- materials ----

export function listMaterials(kidId?: number): Material[] {
  if (kidId !== undefined) {
    return db
      .prepare("SELECT * FROM materials WHERE kid_id = ? OR kid_id IS NULL ORDER BY created_at DESC")
      .all(kidId) as Material[];
  }
  return db.prepare("SELECT * FROM materials ORDER BY created_at DESC").all() as Material[];
}

export function getMaterial(id: number): Material | undefined {
  return db.prepare("SELECT * FROM materials WHERE id = ?").get(id) as Material | undefined;
}

export function createMaterial(input: {
  kid_id: number | null;
  subject: string;
  title: string;
  content_text: string;
  source_filename: string;
}): Material {
  const result = db
    .prepare(
      "INSERT INTO materials (kid_id, subject, title, content_text, source_filename) VALUES (?, ?, ?, ?, ?)",
    )
    .run(input.kid_id, input.subject, input.title, input.content_text, input.source_filename);
  return getMaterial(Number(result.lastInsertRowid))!;
}

export function deleteMaterial(id: number): void {
  db.prepare("DELETE FROM materials WHERE id = ?").run(id);
}

// ---- question banks ----

type QuestionBankRow = {
  id: number;
  material_id: number;
  label: string;
  questions_json: string;
  created_at: string;
};

function rowToQuestionBank(row: QuestionBankRow): QuestionBank {
  return {
    id: row.id,
    material_id: row.material_id,
    label: row.label,
    questions: JSON.parse(row.questions_json) as Question[],
    created_at: row.created_at,
  };
}

export function listQuestionBanksForMaterial(materialId: number): QuestionBank[] {
  const rows = db
    .prepare("SELECT * FROM question_banks WHERE material_id = ? ORDER BY created_at DESC")
    .all(materialId) as QuestionBankRow[];
  return rows.map(rowToQuestionBank);
}

export function getQuestionBank(id: number): QuestionBank | undefined {
  const row = db.prepare("SELECT * FROM question_banks WHERE id = ?").get(id) as QuestionBankRow | undefined;
  return row ? rowToQuestionBank(row) : undefined;
}

export function createQuestionBank(input: { material_id: number; label: string; questions: Question[] }): QuestionBank {
  const result = db
    .prepare("INSERT INTO question_banks (material_id, label, questions_json) VALUES (?, ?, ?)")
    .run(input.material_id, input.label, JSON.stringify(input.questions));
  return getQuestionBank(Number(result.lastInsertRowid))!;
}

export function deleteQuestionBank(id: number): void {
  db.prepare("DELETE FROM question_banks WHERE id = ?").run(id);
}

// ---- quizzes ----

type QuizRow = {
  id: number;
  kid_id: number;
  question_bank_id: number;
  question_indices_json: string;
  question_sources_json: string | null;
  created_at: string;
};

function rowToQuiz(row: QuizRow): Quiz {
  return {
    id: row.id,
    kid_id: row.kid_id,
    question_bank_id: row.question_bank_id,
    questionIndices: JSON.parse(row.question_indices_json) as number[],
    questionSources: row.question_sources_json ? (JSON.parse(row.question_sources_json) as QuizSource[]) : null,
    created_at: row.created_at,
  };
}

export function getQuiz(id: number): Quiz | undefined {
  const row = db.prepare("SELECT * FROM quizzes WHERE id = ?").get(id) as QuizRow | undefined;
  return row ? rowToQuiz(row) : undefined;
}

export function createQuiz(input: {
  kid_id: number;
  question_bank_id: number;
  questionIndices?: number[];
  questionSources?: QuizSource[];
}): Quiz {
  if (!input.questionIndices && !input.questionSources) {
    throw new Error("createQuiz requires either questionIndices or questionSources");
  }
  const indicesJson = JSON.stringify(input.questionIndices ?? []);
  const sourcesJson = input.questionSources ? JSON.stringify(input.questionSources) : null;
  const result = db
    .prepare(
      "INSERT INTO quizzes (kid_id, question_bank_id, question_indices_json, question_sources_json) VALUES (?, ?, ?, ?)",
    )
    .run(input.kid_id, input.question_bank_id, indicesJson, sourcesJson);
  return getQuiz(Number(result.lastInsertRowid))!;
}

export function listBanksGroupedBySubject(kidId: number): SubjectGroup[] {
  const materials = listMaterials(kidId);
  const groupMap = new Map<string, SubjectGroup>();
  for (const material of materials) {
    const banks = listQuestionBanksForMaterial(material.id);
    for (const bank of banks) {
      if (!groupMap.has(material.subject)) {
        groupMap.set(material.subject, { subject: material.subject, banks: [] });
      }
      groupMap.get(material.subject)!.banks.push({
        bankId: bank.id,
        bankLabel: bank.label,
        materialId: material.id,
        materialTitle: material.title,
        questionCount: bank.questions.length,
      });
    }
  }
  return Array.from(groupMap.values());
}

// ---- attempts ----

type AttemptRow = {
  id: number;
  quiz_id: number;
  kid_id: number;
  answers_json: string;
  score: number;
  total: number;
  completed_at: string;
};

function rowToAttempt(row: AttemptRow): Attempt {
  return {
    id: row.id,
    quiz_id: row.quiz_id,
    kid_id: row.kid_id,
    answers: JSON.parse(row.answers_json) as number[],
    score: row.score,
    total: row.total,
    completed_at: row.completed_at,
  };
}

export function createAttempt(input: { quiz_id: number; kid_id: number; answers: number[]; score: number; total: number }): Attempt {
  const result = db
    .prepare("INSERT INTO attempts (quiz_id, kid_id, answers_json, score, total) VALUES (?, ?, ?, ?, ?)")
    .run(input.quiz_id, input.kid_id, JSON.stringify(input.answers), input.score, input.total);
  return rowToAttempt(
    db.prepare("SELECT * FROM attempts WHERE id = ?").get(Number(result.lastInsertRowid)) as AttemptRow,
  );
}

export type AttemptWithContext = Attempt & { subject: string; materialTitle: string };

export function listAttemptsForKid(kidId: number): AttemptWithContext[] {
  const rows = db
    .prepare(
      `SELECT a.*, m.subject as subject, m.title as materialTitle
       FROM attempts a
       JOIN quizzes q ON q.id = a.quiz_id
       JOIN question_banks qb ON qb.id = q.question_bank_id
       JOIN materials m ON m.id = qb.material_id
       WHERE a.kid_id = ?
       ORDER BY a.completed_at DESC`,
    )
    .all(kidId) as (AttemptRow & { subject: string; materialTitle: string })[];

  return rows.map((row) => ({ ...rowToAttempt(row), subject: row.subject, materialTitle: row.materialTitle }));
}
