export type Kid = {
  id: number;
  name: string;
  grade_level: string;
  avatar_color: string;
  avatar_emoji: string;
  created_at: string;
};

export type Material = {
  id: number;
  kid_id: number | null;
  subject: string;
  title: string;
  content_text: string;
  source_filename: string;
  created_at: string;
};

export type Question = {
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
};

export type QuestionBank = {
  id: number;
  material_id: number;
  label: string;
  questions: Question[];
  created_at: string;
};

export type QuizSource = { bankId: number; idx: number };

export type Quiz = {
  id: number;
  kid_id: number;
  question_bank_id: number;
  questionIndices: number[];
  questionSources: QuizSource[] | null;
  created_at: string;
};

export type BankOption = {
  bankId: number;
  bankLabel: string;
  materialId: number;
  materialTitle: string;
  questionCount: number;
};

export type SubjectGroup = {
  subject: string;
  banks: BankOption[];
};

export type Attempt = {
  id: number;
  quiz_id: number;
  kid_id: number;
  answers: number[];
  score: number;
  total: number;
  completed_at: string;
};
