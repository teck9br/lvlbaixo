import { describe, expect, it } from "vitest";
import { sanitizeUsername, initialOf, colorFromString, formatTime } from "@/lib/utils";

describe("sanitizeUsername", () => {
  it("trims and collapses whitespace", () => {
    expect(sanitizeUsername("  Ruan   Felipe  ")).toBe("Ruan Felipe");
  });

  it("rejects empty or whitespace-only names", () => {
    expect(sanitizeUsername("")).toBeNull();
    expect(sanitizeUsername("   ")).toBeNull();
  });

  it("caps length at 32 characters", () => {
    const long = "a".repeat(100);
    expect(sanitizeUsername(long)?.length).toBe(32);
  });
});

describe("initialOf", () => {
  it("returns the uppercased first letter", () => {
    expect(initialOf("ruan")).toBe("R");
    expect(initialOf("  lucas")).toBe("L");
  });

  it("falls back to ? for empty input", () => {
    expect(initialOf("")).toBe("?");
    expect(initialOf("   ")).toBe("?");
  });
});

describe("colorFromString", () => {
  it("is deterministic for the same input", () => {
    expect(colorFromString("João")).toBe(colorFromString("João"));
  });

  it("returns a hex color", () => {
    expect(colorFromString("Pedro")).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe("formatTime", () => {
  it("formats a valid ISO date without throwing", () => {
    expect(formatTime(new Date().toISOString())).toMatch(/\d{1,2}:\d{2}/);
  });

  it("returns an empty string for invalid input", () => {
    expect(formatTime("not-a-date")).toBe("");
  });
});
