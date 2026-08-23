import { describe, expect, it, beforeAll } from "vitest";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-do-not-use-in-prod";
});

describe("lib/auth/session — signed session token", () => {
  it("round-trips a valid token", async () => {
    const { createSessionToken, verifySessionToken } = await import("@/lib/auth/session");
    const token = createSessionToken({ userId: "11111111-1111-1111-1111-111111111111", username: "Ruan" });
    const decoded = verifySessionToken(token);
    expect(decoded).toEqual({ userId: "11111111-1111-1111-1111-111111111111", username: "Ruan" });
  });

  it("rejects a tampered payload", async () => {
    const { createSessionToken, verifySessionToken } = await import("@/lib/auth/session");
    const token = createSessionToken({ userId: "abc", username: "Ruan" });
    const [payload, signature] = token.split(".");
    const tamperedPayload = Buffer.from(
      JSON.stringify({ userId: "abc", username: "Attacker", iat: Date.now() }),
      "utf8",
    ).toString("base64url");
    const tampered = `${tamperedPayload}.${signature}`;
    expect(verifySessionToken(tampered)).toBeNull();
    // sanity: original still valid
    expect(verifySessionToken(`${payload}.${signature}`)).not.toBeNull();
  });

  it("rejects a malformed token", async () => {
    const { verifySessionToken } = await import("@/lib/auth/session");
    expect(verifySessionToken(undefined)).toBeNull();
    expect(verifySessionToken(null)).toBeNull();
    expect(verifySessionToken("")).toBeNull();
    expect(verifySessionToken("not-a-valid-token")).toBeNull();
    expect(verifySessionToken("a.b.c")).toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    const { createSessionToken, verifySessionToken } = await import("@/lib/auth/session");
    const token = createSessionToken({ userId: "abc", username: "Ruan" });
    process.env.SESSION_SECRET = "a-different-secret";
    expect(verifySessionToken(token)).toBeNull();
    process.env.SESSION_SECRET = "test-secret-do-not-use-in-prod";
  });
});
