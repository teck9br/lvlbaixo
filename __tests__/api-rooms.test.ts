import { describe, expect, it, vi, beforeEach } from "vitest";
import { makeFakeSupabase } from "./helpers/fakeSupabase";

vi.mock("@/lib/auth/session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdmin: vi.fn() }));

import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { GET } from "@/app/api/rooms/route";

// Mirrors supabase/seed.sql — 6 fixed channels in a fixed order.
const SEEDED_ROOMS = [
  { id: "1", name: "link-gc", slug: "link-gc", type: "text", category: "text", position: 1, topic: null },
  { id: "2", name: "regras", slug: "regras", type: "text", category: "text", position: 2, topic: null },
  {
    id: "3",
    name: "bate-papo-do-uol",
    slug: "bate-papo-do-uol",
    type: "text",
    category: "text",
    position: 3,
    topic: null,
  },
  {
    id: "4",
    name: "CS de Cadeira 🎮🚨",
    slug: "cs-de-cadeira",
    type: "voice",
    category: "voice",
    position: 4,
    topic: null,
  },
  { id: "5", name: "CS de Rua", slug: "cs-de-rua", type: "voice", category: "voice", position: 5, topic: null },
  { id: "6", name: "GAY POR:", slug: "gay-por", type: "voice", category: "afk", position: 6, topic: null },
];

beforeEach(() => {
  vi.mocked(getSession).mockReset();
  vi.mocked(getSupabaseAdmin).mockReset();
});

describe("GET /api/rooms", () => {
  it("rejects unauthenticated requests (401)", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the seeded channel list in order", async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: "u1", username: "Ruan" });
    vi.mocked(getSupabaseAdmin).mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeFakeSupabase({ rooms: { data: SEEDED_ROOMS, error: null } }) as any,
    );

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.rooms).toHaveLength(6);
    expect(body.rooms.map((r: { slug: string }) => r.slug)).toEqual([
      "link-gc",
      "regras",
      "bate-papo-do-uol",
      "cs-de-cadeira",
      "cs-de-rua",
      "gay-por",
    ]);
  });

  it("returns 503 when the database is unreachable", async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: "u1", username: "Ruan" });
    vi.mocked(getSupabaseAdmin).mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeFakeSupabase({ rooms: { data: null, error: new Error("boom") } }) as any,
    );
    const res = await GET();
    expect(res.status).toBe(503);
  });
});
