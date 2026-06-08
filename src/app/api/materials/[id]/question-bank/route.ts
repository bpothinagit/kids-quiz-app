import { NextRequest, NextResponse } from "next/server";
import { createQuestionBank, getMaterial, listQuestionBanksForMaterial } from "@/lib/queries";
import { validateQuestionsJson } from "@/lib/questionSchema";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const material = getMaterial(Number(id));
  if (!material) {
    return NextResponse.json({ error: "Material not found." }, { status: 404 });
  }
  return NextResponse.json({ questionBanks: listQuestionBanksForMaterial(material.id) });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const material = getMaterial(Number(id));
  if (!material) {
    return NextResponse.json({ error: "Material not found." }, { status: 404 });
  }

  const body = await request.json();
  const raw = typeof body.json === "string" ? body.json : "";
  if (!raw.trim()) {
    return NextResponse.json({ error: "Paste the JSON you got back from the chat first." }, { status: 400 });
  }

  const result = validateQuestionsJson(raw);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const existingCount = listQuestionBanksForMaterial(material.id).length;
  const label = typeof body.label === "string" && body.label.trim()
    ? body.label.trim()
    : `Set ${existingCount + 1}`;

  const questionBank = createQuestionBank({ material_id: material.id, label, questions: result.questions });
  return NextResponse.json({ questionBank }, { status: 201 });
}
