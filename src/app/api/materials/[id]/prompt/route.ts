import { NextRequest, NextResponse } from "next/server";
import { getMaterial } from "@/lib/queries";
import { buildQuestionPrompt } from "@/lib/promptBuilder";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const material = getMaterial(Number(id));
  if (!material) {
    return NextResponse.json({ error: "Material not found." }, { status: 404 });
  }

  const gradeLevel = request.nextUrl.searchParams.get("gradeLevel") || "";
  const countParam = Number(request.nextUrl.searchParams.get("count"));
  const count = Number.isInteger(countParam) && countParam > 0 ? Math.min(countParam, 30) : 10;

  const prompt = buildQuestionPrompt(material, { gradeLevel, count });
  return NextResponse.json({ prompt });
}
