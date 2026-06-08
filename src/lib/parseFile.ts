import mammoth from "mammoth";

const TEXT_EXTENSIONS = [".txt", ".md", ".markdown"];

/**
 * Extracts plain text from an uploaded file. Supports .docx (via mammoth) and
 * plain text formats. Throws a user-facing error for anything else.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

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

  throw new Error("Unsupported file type. Please upload a .txt, .md, or .docx file.");
}
