import { NextRequest, NextResponse } from "next/server";
import { createKid, listKids } from "@/lib/queries";

export async function GET() {
  return NextResponse.json({ kids: listKids() });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  const grade_level = typeof body.grade_level === "string" ? body.grade_level.trim() : "";
  const avatar_color = typeof body.avatar_color === "string" && body.avatar_color ? body.avatar_color : "#6366f1";

  const kid = createKid({ name, grade_level, avatar_color });
  return NextResponse.json({ kid }, { status: 201 });
}
