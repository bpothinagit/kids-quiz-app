import { describe, it, expect } from "vitest";
import { buildQuestionPrompt } from "../promptBuilder";
import type { Material } from "../types";

const baseMaterial: Material = {
  id: 1,
  kid_id: null,
  subject: "Math",
  title: "Fractions",
  content_text: "Fractions are parts of a whole number.",
  source_filename: "fractions.txt",
  created_at: "2024-01-01",
};

describe("buildQuestionPrompt", () => {
  it("includes the subject in the prompt", () => {
    const prompt = buildQuestionPrompt(baseMaterial, { gradeLevel: "3rd grade", count: 5 });
    expect(prompt).toContain("Math");
  });

  it("includes the grade level in the prompt", () => {
    const prompt = buildQuestionPrompt(baseMaterial, { gradeLevel: "3rd grade", count: 5 });
    expect(prompt).toContain("3rd grade");
  });

  it("includes the question count in the prompt", () => {
    const prompt = buildQuestionPrompt(baseMaterial, { gradeLevel: "3rd grade", count: 7 });
    expect(prompt).toContain("7");
  });

  it("includes the material title in the prompt", () => {
    const prompt = buildQuestionPrompt(baseMaterial, { gradeLevel: "3rd grade", count: 5 });
    expect(prompt).toContain("Fractions");
  });

  it("includes the material content text in the prompt", () => {
    const prompt = buildQuestionPrompt(baseMaterial, { gradeLevel: "3rd grade", count: 5 });
    expect(prompt).toContain("Fractions are parts of a whole number.");
  });

  it("uses 'appropriate' fallback when gradeLevel is empty", () => {
    const prompt = buildQuestionPrompt(baseMaterial, { gradeLevel: "", count: 5 });
    expect(prompt).toContain("appropriate");
  });

  it("uses 'school-age' fallback when gradeLevel is empty", () => {
    const prompt = buildQuestionPrompt(baseMaterial, { gradeLevel: "", count: 5 });
    expect(prompt).toContain("school-age");
  });

  it("truncates content longer than 12,000 chars and adds a note", () => {
    const longContent = "x".repeat(15000);
    const material = { ...baseMaterial, content_text: longContent };
    const prompt = buildQuestionPrompt(material, { gradeLevel: "5th grade", count: 5 });
    expect(prompt).toContain("[Note: material was truncated");
  });

  it("does not include chars beyond 12,000 when truncating", () => {
    const longContent = "a".repeat(12000) + "SENTINEL";
    const material = { ...baseMaterial, content_text: longContent };
    const prompt = buildQuestionPrompt(material, { gradeLevel: "5th grade", count: 5 });
    expect(prompt).not.toContain("SENTINEL");
  });

  it("does not add truncation note when content is exactly 12,000 chars", () => {
    const content = "b".repeat(12000);
    const material = { ...baseMaterial, content_text: content };
    const prompt = buildQuestionPrompt(material, { gradeLevel: "4th grade", count: 5 });
    expect(prompt).not.toContain("truncated");
  });

  it("does not add truncation note for short content", () => {
    const prompt = buildQuestionPrompt(baseMaterial, { gradeLevel: "3rd grade", count: 5 });
    expect(prompt).not.toContain("truncated");
  });

  it("instructs the LLM to reply with a JSON array", () => {
    const prompt = buildQuestionPrompt(baseMaterial, { gradeLevel: "3rd grade", count: 5 });
    expect(prompt).toContain("JSON array");
  });

  it("includes required JSON field names in schema instructions", () => {
    const prompt = buildQuestionPrompt(baseMaterial, { gradeLevel: "3rd grade", count: 5 });
    expect(prompt).toContain('"correctIndex"');
    expect(prompt).toContain('"explanation"');
    expect(prompt).toContain('"options"');
    expect(prompt).toContain('"question"');
  });

  it("trims leading/trailing whitespace from content_text", () => {
    const material = { ...baseMaterial, content_text: "   trimmed content   " };
    const prompt = buildQuestionPrompt(material, { gradeLevel: "3rd grade", count: 5 });
    expect(prompt).toContain("trimmed content");
    expect(prompt).not.toContain("   trimmed content   ");
  });
});
