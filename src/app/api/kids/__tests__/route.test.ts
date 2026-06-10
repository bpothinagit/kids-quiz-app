import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockKid = { id: 1, name: "Alice", grade_level: "3rd", avatar_color: "#6366f1", avatar_emoji: "🦊", created_at: "2024-01-01" };

vi.mock("@/lib/queries", () => ({
  listKids: vi.fn(),
  createKid: vi.fn(),
}));

import { GET, POST } from "../route";
import { listKids, createKid } from "@/lib/queries";

beforeEach(() => {
  vi.resetAllMocks();
});

function makeRequest(method: string, body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/kids", {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }
      : {}),
  });
}

describe("GET /api/kids", () => {
  it("returns all kids", async () => {
    vi.mocked(listKids).mockReturnValue([mockKid]);
    const res = await GET();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.kids).toHaveLength(1);
    expect(data.kids[0].name).toBe("Alice");
  });

  it("returns an empty array when no kids exist", async () => {
    vi.mocked(listKids).mockReturnValue([]);
    const res = await GET();
    const data = await res.json();
    expect(data.kids).toEqual([]);
  });
});

describe("POST /api/kids", () => {
  it("creates a kid with all fields provided", async () => {
    vi.mocked(createKid).mockReturnValue(mockKid);
    const res = await POST(makeRequest("POST", { name: "Alice", grade_level: "3rd", avatar_color: "#ff0000", avatar_emoji: "🐶" }));
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.kid).toEqual(mockKid);
    expect(createKid).toHaveBeenCalledWith({ name: "Alice", grade_level: "3rd", avatar_color: "#ff0000", avatar_emoji: "🐶" });
  });

  it("uses default avatar_color when not provided", async () => {
    vi.mocked(createKid).mockReturnValue(mockKid);
    await POST(makeRequest("POST", { name: "Alice" }));
    expect(createKid).toHaveBeenCalledWith(expect.objectContaining({ avatar_color: "#6366f1" }));
  });

  it("uses default avatar_emoji when not provided", async () => {
    vi.mocked(createKid).mockReturnValue(mockKid);
    await POST(makeRequest("POST", { name: "Alice" }));
    expect(createKid).toHaveBeenCalledWith(expect.objectContaining({ avatar_emoji: "🦊" }));
  });

  it("trims whitespace from name", async () => {
    vi.mocked(createKid).mockReturnValue(mockKid);
    await POST(makeRequest("POST", { name: "  Alice  " }));
    expect(createKid).toHaveBeenCalledWith(expect.objectContaining({ name: "Alice" }));
  });

  it("returns 400 when name is missing", async () => {
    const res = await POST(makeRequest("POST", { grade_level: "3rd" }));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toMatch(/name/i);
    expect(createKid).not.toHaveBeenCalled();
  });

  it("returns 400 when name is whitespace-only", async () => {
    const res = await POST(makeRequest("POST", { name: "   " }));
    expect(res.status).toBe(400);
    expect(createKid).not.toHaveBeenCalled();
  });

  it("returns 400 when name is not a string", async () => {
    const res = await POST(makeRequest("POST", { name: 42 }));
    expect(res.status).toBe(400);
    expect(createKid).not.toHaveBeenCalled();
  });
});
