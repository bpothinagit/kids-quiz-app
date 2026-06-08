import { NextRequest, NextResponse } from "next/server";
import { deleteMaterial, getMaterial } from "@/lib/queries";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const material = getMaterial(Number(id));
  if (!material) {
    return NextResponse.json({ error: "Material not found." }, { status: 404 });
  }
  return NextResponse.json({ material });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const materialId = Number(id);
  if (!getMaterial(materialId)) {
    return NextResponse.json({ error: "Material not found." }, { status: 404 });
  }
  deleteMaterial(materialId);
  return NextResponse.json({ ok: true });
}
