import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const existingKid = { id: 1, name: "Alice", grade_level: "3rd", avatar_color: "#6366f1", avatar_emoji: "🦊", created_at: "2024-01-01" };

vi.mock("@/lib/queries", () => ({
  getKid: vi.fn(),
  updateKid: vi.fn(),
  deleteKid: vi.fn(),
}));

import { PATCH, DELETE } from "../route";
import { getKid, updateKid, deleteKid } from "@/lib/queries";

beforeEach(() => {
  vi.resetAllMocks();
});

function makeRequest(method: string, body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/kids/1", {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }
      : {}),
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("PATCH /api/kids/[id]", () => {
  it("updates a kid when it exists", async () => {
    const updated = { ...existingKid, name: "Alicia", grade_level: "4th" };
    vi.mocked(getKid).mockReturnValue(existingKid);
    vi.mocked(updateKid).mockReturnValue(updated);

    const res = await PATCH(makeRequest("PATCH", { name: "Alicia", grade_level: "4th" }), makeParams("1"));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.kid.name).toBe("Alicia");
  });

  it("returns 404 when kid does not exist", async () => {
    vi.mocked(getKid).mockReturnValue(undefined);
    const res = await PATCH(makeRequest("PATCH", { name: "Ghost" }), makeParams("999"));
    const data = await res.json();
    expect(res.status).toBe(404);
    expect(data.error).toMatch(/not found/i);
    expect(updateKid).not.toHaveBeenCalled();
  });

  it("returns 400 when name is missing", async () => {
    vi.mocked(getKid).mockReturnValue(existingKid);
    const res = await PATCH(makeRequest("PATCH", { grade_level: "4th" }), makeParams("1"));
    expect(res.status).toBe(400);
    expect(updateKid).not.toHaveBeenCalled();
  });

  it("returns 400 when name is whitespace-only", async () => {
    vi.mocked(getKid).mockReturnValue(existingKid);
    const res = await PATCH(makeRequest("PATCH", { name: "   " }), makeParams("1"));
    expect(res.status).toBe(400);
    expect(updateKid).not.toHaveBeenCalled();
  });

  it("falls back to existing avatar_color when not provided", async () => {
    vi.mocked(getKid).mockReturnValue(existingKid);
    vi.mocked(updateKid).mockReturnValue(existingKid);
    await PATCH(makeRequest("PATCH", { name: "Alice" }), makeParams("1"));
    expect(updateKid).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ avatar_color: existingKid.avatar_color }),
    );
  });

  it("falls back to existing avatar_emoji when not provided", async () => {
    vi.mocked(getKid).mockReturnValue(existingKid);
    vi.mocked(updateKid).mockReturnValue(existingKid);
    await PATCH(makeRequest("PATCH", { name: "Alice" }), makeParams("1"));
    expect(updateKid).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ avatar_emoji: existingKid.avatar_emoji }),
    );
  });
});

describe("DELETE /api/kids/[id]", () => {
  it("deletes a kid and returns ok: true", async () => {
    vi.mocked(getKid).mockReturnValue(existingKid);
    const res = await DELETE(makeRequest("DELETE"), makeParams("1"));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(deleteKid).toHaveBeenCalledWith(1);
  });

  it("returns 404 when kid does not exist", async () => {
    vi.mocked(getKid).mockReturnValue(undefined);
    const res = await DELETE(makeRequest("DELETE"), makeParams("999"));
    const data = await res.json();
    expect(res.status).toBe(404);
    expect(data.error).toMatch(/not found/i);
    expect(deleteKid).not.toHaveBeenCalled();
  });
});
