import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/livekit/token", () => ({ createLiveKitToken: vi.fn() }));

import { getSession } from "@/lib/auth/session";
import { createLiveKitToken } from "@/lib/livekit/token";
import { POST } from "@/app/api/livekit/token/route";

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/livekit/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.mocked(getSession).mockReset();
  vi.mocked(createLiveKitToken).mockReset();
  process.env.NEXT_PUBLIC_LIVEKIT_URL = "wss://example.livekit.cloud";
});

describe("POST /api/livekit/token", () => {
  it("rejects unauthenticated requests (401)", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await POST(postRequest({ roomName: "cs-de-rua" }));
    expect(res.status).toBe(401);
    expect(createLiveKitToken).not.toHaveBeenCalled();
  });

  it("rejects a room name outside the fixed voice-channel list (400)", async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: "u1", username: "Ruan" });
    const res = await POST(postRequest({ roomName: "sala-inventada" }));
    expect(res.status).toBe(400);
    expect(createLiveKitToken).not.toHaveBeenCalled();
  });

  it("rejects malformed bodies (400)", async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: "u1", username: "Ruan" });
    const res = await POST(postRequest({}));
    expect(res.status).toBe(400);
  });

  it("mints a token for an authenticated user joining an allowed room", async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: "u1", username: "Ruan" });
    vi.mocked(createLiveKitToken).mockResolvedValue("fake.jwt.token");

    const res = await POST(postRequest({ roomName: "cs-de-rua" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.token).toBe("fake.jwt.token");
    expect(body.url).toBe("wss://example.livekit.cloud");
    expect(createLiveKitToken).toHaveBeenCalledWith({
      identity: "u1",
      name: "Ruan",
      roomName: "cs-de-rua",
    });
  });

  it("returns 503 when LiveKit isn't configured on the server", async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: "u1", username: "Ruan" });
    delete process.env.NEXT_PUBLIC_LIVEKIT_URL;
    const res = await POST(postRequest({ roomName: "cs-de-rua" }));
    expect(res.status).toBe(503);
  });
});
