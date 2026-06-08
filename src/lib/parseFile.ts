import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

const TEXT_EXTENSIONS = [".txt", ".md", ".markdown"];

/**
 * Extracts plain text from an uploaded file. Supports .pdf (via pdf-parse),
 * .docx (via mammoth), and plain text formats. Throws a user-facing error for
 * anything else.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (name.endsWith(".pdf")) {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      // Drop the "-- N of M --" page separators pdf-parse inserts between pages.
      return result.text.replace(/^--\s*\d+\s*of\s*\d+\s*--$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
    } finally {
      await parser.destroy();
    }
  }

  if (name.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }

  if (TEXT_EXTENSIONS.some((ext) => name.endsWith(ext)) || file.type.startsWith("text/")) {
    return buffer.toString("utf-8").trim();
  }

  if (name.endsWith(".doc")) {
    throw new Error("Old-style .doc files aren't supported — please save it as .docx or paste the text into a .txt file.");
  }

  throw new Error("Unsupported file type. Please upload a .txt, .md, .pdf, or .docx file.");
}
