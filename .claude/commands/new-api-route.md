Scaffold a new Next.js 16 API route handler and matching Vitest test file for this app.

The route path to create is: $ARGUMENTS

## Steps

1. Parse the route path from the argument (e.g. `materials/[id]/summary`).
   - Full handler path: `src/app/api/<route-path>/route.ts`
   - Full test path:    `src/app/api/<route-path>/__tests__/route.test.ts`

2. Detect if the path contains dynamic segments (e.g. `[id]`).
   - If dynamic: use the params-as-Promise pattern (required in Next.js 16)
   - If static: omit the second argument entirely

3. Create `route.ts` using this exact pattern for a **dynamic** route:
   ```ts
   import { NextRequest, NextResponse } from "next/server";
   import {  } from "@/lib/queries";

   export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
     const { id } = await params;
     const entityId = Number(id);

     // TODO: implement
     return NextResponse.json({});
   }
   ```
   For a **static** route (no `[param]` segments):
   ```ts
   import { NextRequest, NextResponse } from "next/server";
   import {  } from "@/lib/queries";

   export async function GET(_req: NextRequest) {
     // TODO: implement
     return NextResponse.json({});
   }
   ```

4. Create `__tests__/route.test.ts` using this pattern:
   ```ts
   import { vi, describe, it, expect, beforeEach } from "vitest";
   import { NextRequest } from "next/server";

   vi.mock("@/lib/queries", () => ({
     // TODO: add mocked functions here
   }));

   import { GET } from "../route";

   beforeEach(() => {
     vi.resetAllMocks();
   });

   function makeRequest(method: string, body?: unknown): NextRequest {
     return new NextRequest("http://localhost/api/<route-path>", {
       method,
       ...(body !== undefined
         ? { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }
         : {}),
     });
   }

   // For dynamic routes only:
   function makeParams(id: string) {
     return { params: Promise.resolve({ id }) };
   }

   describe("GET /api/<route-path>", () => {
     it("returns TODO", async () => {
       const res = await GET(makeRequest("GET"), makeParams("1"));
       expect(res.status).toBe(200);
     });
   });
   ```

5. After creating both files, print the paths created and remind the developer to:
   - Fill in the query function imports
   - Add the query function mocks in the test's `vi.mock` factory
   - Replace the TODO test with real assertions

## Rules

- NEVER skip `await params` on dynamic routes — this is a Next.js 16 breaking change
  that silently fails in older patterns
- Always put tests in a `__tests__/` subdirectory alongside the route, matching
  the pattern used throughout this codebase
- Do NOT add comments explaining the params pattern — it's documented in CLAUDE.md
