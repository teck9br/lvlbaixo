import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { makeFakeSupabase } from "./helpers/fakeSupabase";

vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/auth/password", () => ({
  checkServerPassword: vi.fn(),
  getServerName: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
  setSessionCookie: vi.fn(),
  clearSessionCookie: vi.fn(),
}));

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { checkServerPassword, getServerName } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";
import { POST, PATCH } from "@/app/api/auth/route";

const USER_ID = "44444444-4444-4444-8444-444444444444";

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.mocked(getSupabaseAdmin).mockReset();
  vi.mocked(checkServerPassword).mockReset();
  vi.mocked(getServerName).mockReset().mockResolvedValue("lvlbaixo");
  vi.mocked(setSessionCookie).mockReset().mockResolvedValue(undefined);
});

describe("POST /api/auth (login)", () => {
  it("rejects an incorrect server password (401)", async () => {
    vi.mocked(checkServerPassword).mockResolvedValue(false);
    const res = await POST(postRequest({ userId: USER_ID, username: "Ruan", password: "wrong" }));
    expect(res.status).toBe(401);
    expect(setSessionCookie).not.toHaveBeenCalled();
  });

  it("rejects an invalid username (400) even with the right password", async () => {
    vi.mocked(checkServerPassword).mockResolvedValue(true);
    const res = await POST(postRequest({ userId: USER_ID, username: "   ", password: "changeme123" }));
    expect(res.status).toBe(400);
  });

  it("blocks a banned user (403)", async () => {
    vi.mocked(checkServerPassword).mockResolvedValue(true);
    vi.mocked(getSupabaseAdmin).mockReturnValue(
      makeFakeSupabase({
        users: { data: { id: USER_ID, is_banned: true }, error: null },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any,
    );
    const res = await POST(postRequest({ userId: USER_ID, username: "Ruan", password: "changeme123" }));
    expect(res.status).toBe(403);
    expect(setSessionCookie).not.toHaveBeenCalled();
  });

  it("logs in a new user, creates the row and opens a session", async () => {
    vi.mocked(checkServerPassword).mockResolvedValue(true);
    vi.mocked(getSupabaseAdmin).mockReturnValue(
      makeFakeSupabase({
        users: { data: null, error: null }, // no existing row -> insert path
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any,
    );

    const res = await POST(postRequest({ userId: USER_ID, username: "  Ruan  ", password: "changeme123" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.user).toEqual({ userId: USER_ID, username: "Ruan" });
    expect(body.serverName).toBe("lvlbaixo");
    expect(setSessionCookie).toHaveBeenCalledWith({ userId: USER_ID, username: "Ruan" });
  });
});

describe("PATCH /api/auth (rename)", () => {
  it("requires an existing session (401)", async () => {
    const { getSession } = await import("@/lib/auth/session");
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await PATCH(postRequest({ username: "Novo Nome" }));
    expect(res.status).toBe(401);
  });

  it("renames and reissues the session cookie", async () => {
    const { getSession } = await import("@/lib/auth/session");
    vi.mocked(getSession).mockResolvedValue({ userId: USER_ID, username: "Ruan" });
    vi.mocked(getSupabaseAdmin).mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeFakeSupabase({ users: { data: null, error: null } }) as any,
    );

    const res = await PATCH(postRequest({ username: "Ruan Felipe" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.user).toEqual({ userId: USER_ID, username: "Ruan Felipe" });
    expect(setSessionCookie).toHaveBeenCalledWith({ userId: USER_ID, username: "Ruan Felipe" });
  });
});
