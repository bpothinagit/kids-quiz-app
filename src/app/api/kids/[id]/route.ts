import { NextRequest, NextResponse } from "next/server";
import { deleteKid, getKid, updateKid } from "@/lib/queries";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const kidId = Number(id);
  const existing = getKid(kidId);
  if (!existing) {
    return NextResponse.json({ error: "Kid not found." }, { status: 404 });
  }

  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  const grade_level = typeof body.grade_level === "string" ? body.grade_level.trim() : "";
  const avatar_color = typeof body.avatar_color === "string" && body.avatar_color ? body.avatar_color : existing.avatar_color;
  const avatar_emoji = typeof body.avatar_emoji === "string" && body.avatar_emoji ? body.avatar_emoji : existing.avatar_emoji;

  const kid = updateKid(kidId, { name, grade_level, avatar_color, avatar_emoji });
  return NextResponse.json({ kid });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const kidId = Number(id);
  if (!getKid(kidId)) {
    return NextResponse.json({ error: "Kid not found." }, { status: 404 });
  }
  deleteKid(kidId);
  return NextResponse.json({ ok: true });
}
