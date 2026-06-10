import { describe, it, expect } from "vitest";
import { validateQuestionsJson } from "../questionSchema";

const validQuestion = {
  question: "What is 2+2?",
  options: ["1", "2", "3", "4"],
  correctIndex: 3,
  explanation: "Two plus two equals four.",
};

describe("validateQuestionsJson", () => {
  describe("valid inputs", () => {
    it("accepts a valid JSON array", () => {
      const result = validateQuestionsJson(JSON.stringify([validQuestion]));
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.questions).toHaveLength(1);
        expect(result.questions[0].question).toBe("What is 2+2?");
        expect(result.questions[0].correctIndex).toBe(3);
      }
    });

    it("accepts a { questions: [...] } wrapper object", () => {
      const result = validateQuestionsJson(JSON.stringify({ questions: [validQuestion] }));
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.questions).toHaveLength(1);
      }
    });

    it("strips markdown json code fences", () => {
      const fenced = "```json\n" + JSON.stringify([validQuestion]) + "\n```";
      const result = validateQuestionsJson(fenced);
      expect(result.ok).toBe(true);
    });

    it("strips bare code fences without language tag", () => {
      const fenced = "```\n" + JSON.stringify([validQuestion]) + "\n```";
      const result = validateQuestionsJson(fenced);
      expect(result.ok).toBe(true);
    });

    it("trims leading/trailing whitespace from question and explanation", () => {
      const q = { ...validQuestion, question: "  Trimmed?  ", explanation: "  Because.  " };
      const result = validateQuestionsJson(JSON.stringify([q]));
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.questions[0].question).toBe("Trimmed?");
        expect(result.questions[0].explanation).toBe("Because.");
      }
    });

    it("trims whitespace from each option", () => {
      const q = { ...validQuestion, options: ["  a  ", "  b  ", "  c  ", "  d  "] };
      const result = validateQuestionsJson(JSON.stringify([q]));
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.questions[0].options).toEqual(["a", "b", "c", "d"]);
      }
    });

    it("accepts multiple questions", () => {
      const result = validateQuestionsJson(JSON.stringify([validQuestion, validQuestion, validQuestion]));
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.questions).toHaveLength(3);
    });

    it.each([0, 1, 2, 3])("accepts correctIndex = %i", (i) => {
      const q = { ...validQuestion, correctIndex: i };
      const result = validateQuestionsJson(JSON.stringify([q]));
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.questions[0].correctIndex).toBe(i);
    });
  });

  describe("invalid JSON", () => {
    it("returns error for non-JSON input", () => {
      const result = validateQuestionsJson("not json at all");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/valid JSON/i);
    });

    it("returns error for empty string", () => {
      const result = validateQuestionsJson("");
      expect(result.ok).toBe(false);
    });
  });

  describe("wrong top-level shape", () => {
    it("returns error for a plain object without 'questions' key", () => {
      const result = validateQuestionsJson(JSON.stringify({ foo: "bar" }));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/array of questions/i);
    });

    it("returns error for a primitive value", () => {
      const result = validateQuestionsJson("42");
      expect(result.ok).toBe(false);
    });

    it("returns error for an empty array", () => {
      const result = validateQuestionsJson("[]");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/empty/i);
    });

    it("returns error for empty { questions: [] } wrapper", () => {
      const result = validateQuestionsJson(JSON.stringify({ questions: [] }));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/empty/i);
    });
  });

  describe("invalid question items", () => {
    it("returns error when an item is not an object", () => {
      const result = validateQuestionsJson(JSON.stringify(["not-an-object"]));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/Question 1/);
    });

    it("returns error for missing question text", () => {
      const { question: _q, ...rest } = validQuestion;
      const result = validateQuestionsJson(JSON.stringify([rest]));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/"question"/);
    });

    it("returns error for empty question text", () => {
      const q = { ...validQuestion, question: "   " };
      const result = validateQuestionsJson(JSON.stringify([q]));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/"question"/);
    });

    it("returns error when options has fewer than 4 items", () => {
      const q = { ...validQuestion, options: ["a", "b", "c"] };
      const result = validateQuestionsJson(JSON.stringify([q]));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/4/);
    });

    it("returns error when options has more than 4 items", () => {
      const q = { ...validQuestion, options: ["a", "b", "c", "d", "e"] };
      const result = validateQuestionsJson(JSON.stringify([q]));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/4/);
    });

    it("returns error when an option is an empty string", () => {
      const q = { ...validQuestion, options: ["a", "", "c", "d"] };
      const result = validateQuestionsJson(JSON.stringify([q]));
      expect(result.ok).toBe(false);
    });

    it("returns error when an option is whitespace-only", () => {
      const q = { ...validQuestion, options: ["a", "b", "  ", "d"] };
      const result = validateQuestionsJson(JSON.stringify([q]));
      expect(result.ok).toBe(false);
    });

    it.each([-1, 4, 10])("returns error when correctIndex = %i (out of range)", (bad) => {
      const q = { ...validQuestion, correctIndex: bad };
      const result = validateQuestionsJson(JSON.stringify([q]));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/correctIndex/);
    });

    it("returns error when correctIndex is a float", () => {
      const q = { ...validQuestion, correctIndex: 1.5 };
      const result = validateQuestionsJson(JSON.stringify([q]));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/correctIndex/);
    });

    it("returns error when correctIndex is a string", () => {
      const q = { ...validQuestion, correctIndex: "2" };
      const result = validateQuestionsJson(JSON.stringify([q]));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/correctIndex/);
    });

    it("returns error for missing explanation", () => {
      const { explanation: _e, ...rest } = validQuestion;
      const result = validateQuestionsJson(JSON.stringify([rest]));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/explanation/);
    });

    it("returns error for empty explanation", () => {
      const q = { ...validQuestion, explanation: "   " };
      const result = validateQuestionsJson(JSON.stringify([q]));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/explanation/);
    });

    it("reports the correct question number in multi-question errors", () => {
      const bad = { ...validQuestion, question: "" };
      const result = validateQuestionsJson(JSON.stringify([validQuestion, bad]));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/Question 2/);
    });
  });
});
