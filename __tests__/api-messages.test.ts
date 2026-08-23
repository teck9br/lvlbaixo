import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { makeFakeSupabase } from "./helpers/fakeSupabase";

vi.mock("@/lib/auth/session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdmin: vi.fn() }));

import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { POST } from "@/app/api/messages/route";

const ROOM_ID = "22222222-2222-2222-8222-222222222222";

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.mocked(getSession).mockReset();
  vi.mocked(getSupabaseAdmin).mockReset();
});

describe("POST /api/messages", () => {
  it("rejects unauthenticated requests (401)", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await POST(postRequest({ roomId: ROOM_ID, content: "oi" }));
    expect(res.status).toBe(401);
  });

  it("rejects an empty message (400)", async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: "u1", username: "Ruan" });
    const res = await POST(postRequest({ roomId: ROOM_ID, content: "   " }));
    expect(res.status).toBe(400);
  });

  it("rejects invalid payloads, e.g. a non-uuid roomId (400)", async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: "u1", username: "Ruan" });
    const res = await POST(postRequest({ roomId: "not-a-uuid", content: "oi" }));
    expect(res.status).toBe(400);
  });

  it("refuses to post into a non-text (voice) room (400)", async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: "u1", username: "Ruan" });
    vi.mocked(getSupabaseAdmin).mockReturnValue(
      makeFakeSupabase({
        rooms: { data: { id: ROOM_ID, type: "voice" }, error: null },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any,
    );
    const res = await POST(postRequest({ roomId: ROOM_ID, content: "oi" }));
    expect(res.status).toBe(400);
  });

  it("inserts and returns the message for a valid text-room post", async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: "u1", username: "Ruan" });
    const insertedMessage = {
      id: "33333333-3333-3333-3333-333333333333",
      room_id: ROOM_ID,
      user_id: "u1",
      username: "Ruan",
      content: "Fala galera!",
      created_at: new Date().toISOString(),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(
      makeFakeSupabase({
        rooms: { data: { id: ROOM_ID, type: "text" }, error: null },
        messages: { data: insertedMessage, error: null },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any,
    );

    const res = await POST(postRequest({ roomId: ROOM_ID, content: "Fala galera!" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toEqual(insertedMessage);
  });
});
