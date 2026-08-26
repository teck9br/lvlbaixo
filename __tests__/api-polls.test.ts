import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { makeFakeSupabase } from "./helpers/fakeSupabase";

vi.mock("@/lib/auth/session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdmin: vi.fn() }));

import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { POST as postPoll } from "@/app/api/polls/route";
import { PATCH as patchPoll } from "@/app/api/polls/[pollId]/route";
import { POST as postVote, DELETE as deleteVote } from "@/app/api/polls/[pollId]/votes/route";

const ROOM_ID = "22222222-2222-2222-8222-222222222222";
const POLL_ID = "44444444-4444-4444-8444-444444444444";

function jsonRequest(url: string, method: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.mocked(getSession).mockReset();
  vi.mocked(getSupabaseAdmin).mockReset();
});

describe("POST /api/polls", () => {
  it("rejects unauthenticated requests (401)", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await postPoll(
      jsonRequest("http://localhost/api/polls", "POST", {
        roomId: ROOM_ID,
        question: "Joga hoje?",
        options: ["Sim", "Não"],
      }),
    );
    expect(res.status).toBe(401);
  });

  it("rejects a poll with fewer than 2 options (400)", async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: "u1", username: "Ruan" });
    const res = await postPoll(
      jsonRequest("http://localhost/api/polls", "POST", {
        roomId: ROOM_ID,
        question: "Joga hoje?",
        options: ["Sim"],
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects an empty question (400)", async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: "u1", username: "Ruan" });
    const res = await postPoll(
      jsonRequest("http://localhost/api/polls", "POST", {
        roomId: ROOM_ID,
        question: "   ",
        options: ["Sim", "Não"],
      }),
    );
    expect(res.status).toBe(400);
  });

  it("refuses to create a poll in a non-text (voice) room (400)", async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: "u1", username: "Ruan" });
    vi.mocked(getSupabaseAdmin).mockReturnValue(
      makeFakeSupabase({
        rooms: { data: { id: ROOM_ID, type: "voice" }, error: null },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any,
    );
    const res = await postPoll(
      jsonRequest("http://localhost/api/polls", "POST", {
        roomId: ROOM_ID,
        question: "Joga hoje?",
        options: ["Sim", "Não"],
      }),
    );
    expect(res.status).toBe(400);
  });

  it("creates the poll and its anchor message for a valid text-room post", async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: "u1", username: "Ruan" });
    const poll = {
      id: POLL_ID,
      room_id: ROOM_ID,
      question: "Joga hoje?",
      options: [
        { id: "0", label: "Sim" },
        { id: "1", label: "Não" },
      ],
      created_by_user_id: "u1",
      created_by_username: "Ruan",
      created_at: new Date().toISOString(),
      closed_at: null,
    };
    const message = {
      id: "55555555-5555-5555-8555-555555555555",
      room_id: ROOM_ID,
      user_id: "u1",
      username: "Ruan",
      content: null,
      created_at: new Date().toISOString(),
      poll_id: POLL_ID,
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(
      makeFakeSupabase({
        rooms: { data: { id: ROOM_ID, type: "text" }, error: null },
        polls: { data: poll, error: null },
        messages: { data: message, error: null },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any,
    );

    const res = await postPoll(
      jsonRequest("http://localhost/api/polls", "POST", {
        roomId: ROOM_ID,
        question: "Joga hoje?",
        options: ["Sim", "Não"],
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.poll).toEqual(poll);
    expect(body.message).toEqual(message);
    expect(body.votes).toEqual([]);
  });
});

describe("POST /api/polls/:pollId/votes", () => {
  it("rejects unauthenticated requests (401)", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await postVote(
      jsonRequest(`http://localhost/api/polls/${POLL_ID}/votes`, "POST", { optionId: "0" }),
      { params: Promise.resolve({ pollId: POLL_ID }) },
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 for a poll that doesn't exist", async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: "u1", username: "Ruan" });
    vi.mocked(getSupabaseAdmin).mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeFakeSupabase({ polls: { data: null, error: null } }) as any,
    );
    const res = await postVote(
      jsonRequest(`http://localhost/api/polls/${POLL_ID}/votes`, "POST", { optionId: "0" }),
      { params: Promise.resolve({ pollId: POLL_ID }) },
    );
    expect(res.status).toBe(404);
  });

  it("refuses to vote on a closed poll (400)", async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: "u1", username: "Ruan" });
    vi.mocked(getSupabaseAdmin).mockReturnValue(
      makeFakeSupabase({
        polls: {
          data: { id: POLL_ID, options: [{ id: "0", label: "Sim" }], closed_at: new Date().toISOString() },
          error: null,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any,
    );
    const res = await postVote(
      jsonRequest(`http://localhost/api/polls/${POLL_ID}/votes`, "POST", { optionId: "0" }),
      { params: Promise.resolve({ pollId: POLL_ID }) },
    );
    expect(res.status).toBe(400);
  });

  it("rejects an option id that isn't one of the poll's options (400)", async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: "u1", username: "Ruan" });
    vi.mocked(getSupabaseAdmin).mockReturnValue(
      makeFakeSupabase({
        polls: {
          data: { id: POLL_ID, options: [{ id: "0", label: "Sim" }, { id: "1", label: "Não" }], closed_at: null },
          error: null,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any,
    );
    const res = await postVote(
      jsonRequest(`http://localhost/api/polls/${POLL_ID}/votes`, "POST", { optionId: "9" }),
      { params: Promise.resolve({ pollId: POLL_ID }) },
    );
    expect(res.status).toBe(400);
  });

  it("records a valid vote", async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: "u1", username: "Ruan" });
    const vote = {
      id: "66666666-6666-6666-8666-666666666666",
      poll_id: POLL_ID,
      option_id: "0",
      user_id: "u1",
      username: "Ruan",
      created_at: new Date().toISOString(),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(
      makeFakeSupabase({
        polls: {
          data: { id: POLL_ID, options: [{ id: "0", label: "Sim" }, { id: "1", label: "Não" }], closed_at: null },
          error: null,
        },
        poll_votes: { data: vote, error: null },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any,
    );
    const res = await postVote(
      jsonRequest(`http://localhost/api/polls/${POLL_ID}/votes`, "POST", { optionId: "0" }),
      { params: Promise.resolve({ pollId: POLL_ID }) },
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.vote).toEqual(vote);
  });
});

describe("DELETE /api/polls/:pollId/votes", () => {
  it("rejects unauthenticated requests (401)", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await deleteVote(jsonRequest(`http://localhost/api/polls/${POLL_ID}/votes`, "DELETE"), {
      params: Promise.resolve({ pollId: POLL_ID }),
    });
    expect(res.status).toBe(401);
  });

  it("retracts the caller's vote", async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: "u1", username: "Ruan" });
    vi.mocked(getSupabaseAdmin).mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeFakeSupabase({ poll_votes: { data: null, error: null } }) as any,
    );
    const res = await deleteVote(jsonRequest(`http://localhost/api/polls/${POLL_ID}/votes`, "DELETE"), {
      params: Promise.resolve({ pollId: POLL_ID }),
    });
    expect(res.status).toBe(200);
  });
});

describe("PATCH /api/polls/:pollId", () => {
  it("rejects unauthenticated requests (401)", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await patchPoll(jsonRequest(`http://localhost/api/polls/${POLL_ID}`, "PATCH", { closed: true }), {
      params: Promise.resolve({ pollId: POLL_ID }),
    });
    expect(res.status).toBe(401);
  });

  it("refuses to close a poll the caller didn't create (403)", async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: "u1", username: "Ruan" });
    vi.mocked(getSupabaseAdmin).mockReturnValue(
      makeFakeSupabase({
        polls: { data: { id: POLL_ID, created_by_user_id: "someone-else", closed_at: null }, error: null },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any,
    );
    const res = await patchPoll(jsonRequest(`http://localhost/api/polls/${POLL_ID}`, "PATCH", { closed: true }), {
      params: Promise.resolve({ pollId: POLL_ID }),
    });
    expect(res.status).toBe(403);
  });

  it("lets the creator close their own poll", async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: "u1", username: "Ruan" });
    // fakeSupabase returns one canned result per table for every call in the
    // handler, so it can't distinguish the initial ownership-check select
    // from the later update — closed_at here has to be null (not-yet-closed)
    // for the handler to reach the update call at all. That means this test
    // can only confirm the happy path returns 200, not the resulting
    // closed_at value; the update logic itself is straightforward enough
    // (one .update({closed_at: ...}).eq("id", pollId)) to trust by reading.
    vi.mocked(getSupabaseAdmin).mockReturnValue(
      makeFakeSupabase({
        polls: {
          data: { id: POLL_ID, created_by_user_id: "u1", closed_at: null },
          error: null,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any,
    );
    const res = await patchPoll(jsonRequest(`http://localhost/api/polls/${POLL_ID}`, "PATCH", { closed: true }), {
      params: Promise.resolve({ pollId: POLL_ID }),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.poll.id).toBe(POLL_ID);
  });
});
