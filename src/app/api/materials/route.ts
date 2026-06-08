import { NextRequest, NextResponse } from "next/server";
import { createMaterial, listMaterials } from "@/lib/queries";
import { extractTextFromFile } from "@/lib/parseFile";

export async function GET(request: NextRequest) {
  const kidIdParam = request.nextUrl.searchParams.get("kidId");
  const kidId = kidIdParam ? Number(kidIdParam) : undefined;
  return NextResponse.json({ materials: listMaterials(kidId) });
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const file = form.get("file");
  const subject = String(form.get("subject") ?? "").trim();
  const titleInput = String(form.get("title") ?? "").trim();
  const kidIdRaw = form.get("kidId");
  const kid_id = kidIdRaw && String(kidIdRaw) !== "" ? Number(kidIdRaw) : null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Please choose a file to upload." }, { status: 400 });
  }
  if (!subject) {
    return NextResponse.json({ error: "Please provide a subject." }, { status: 400 });
  }

  let content_text: string;
  try {
    content_text = await extractTextFromFile(file);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not read that file." }, { status: 400 });
  }

  if (!content_text) {
    return NextResponse.json({ error: "That file appears to be empty." }, { status: 400 });
  }

  const title = titleInput || file.name.replace(/\.[^.]+$/, "");

  const material = createMaterial({
    kid_id,
    subject,
    title,
    content_text,
    source_filename: file.name,
  });

  return NextResponse.json({ material }, { status: 201 });
}
