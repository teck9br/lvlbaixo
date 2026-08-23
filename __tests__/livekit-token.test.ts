import { describe, expect, it, beforeAll } from "vitest";

function decodeJwtPayload(jwt: string): Record<string, unknown> {
  const [, payload] = jwt.split(".");
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
}

beforeAll(() => {
  process.env.LIVEKIT_API_KEY = "test-key";
  process.env.LIVEKIT_API_SECRET = "test-secret-at-least-32-characters-long";
});

describe("lib/livekit/token — createLiveKitToken", () => {
  it("mints a JWT with the right identity, name and room grant", async () => {
    const { createLiveKitToken } = await import("@/lib/livekit/token");
    const jwt = await createLiveKitToken({
      identity: "user-123",
      name: "Ruan",
      roomName: "cs-de-rua",
    });

    expect(jwt.split(".")).toHaveLength(3);
    const payload = decodeJwtPayload(jwt);
    expect(payload.sub).toBe("user-123");
    expect(payload.name).toBe("Ruan");
    expect(payload.video).toMatchObject({
      room: "cs-de-rua",
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });
  });

  it("throws a clear error when LiveKit credentials are missing", async () => {
    delete process.env.LIVEKIT_API_KEY;
    delete process.env.LIVEKIT_API_SECRET;
    const { createLiveKitToken } = await import("@/lib/livekit/token");
    await expect(
      createLiveKitToken({ identity: "u", name: "n", roomName: "cs-de-rua" }),
    ).rejects.toThrow(/LiveKit não está configurado/);
    process.env.LIVEKIT_API_KEY = "test-key";
    process.env.LIVEKIT_API_SECRET = "test-secret-at-least-32-characters-long";
  });
});
