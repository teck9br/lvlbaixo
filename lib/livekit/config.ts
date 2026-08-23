/**
 * Centralized screen-share / audio configuration.
 *
 * Screen share is the app's most important feature (see project spec §6-9,
 * §28-29), so every knob that controls its resolution, frame rate and
 * bitrate lives here instead of being scattered across components.
 *
 * Camera is intentionally NOT configured — this app is audio + screen
 * share only (spec §30).
 */

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const SCREEN_SHARE_WIDTH = envInt(
  "NEXT_PUBLIC_SCREEN_SHARE_WIDTH",
  1920,
);
export const SCREEN_SHARE_HEIGHT = envInt(
  "NEXT_PUBLIC_SCREEN_SHARE_HEIGHT",
  1080,
);
export const SCREEN_SHARE_FPS = envInt("NEXT_PUBLIC_SCREEN_SHARE_FPS", 30);
export const SCREEN_SHARE_FPS_FALLBACK = envInt(
  "NEXT_PUBLIC_SCREEN_SHARE_FPS_FALLBACK",
  15,
);

/**
 * Target bitrate for the screen share track, in bits per second.
 * LiveKit's own ScreenSharePresets.h1080fps30 uses 3_000_000 (3 Mbps),
 * a reasonable, bandwidth-conscious default for a small private room.
 * Override via env if your group has more headroom (e.g. everyone on
 * fiber) or less (e.g. someone on 4G).
 */
export const SCREEN_SHARE_MAX_BITRATE = envInt(
  "NEXT_PUBLIC_SCREEN_SHARE_MAX_BITRATE",
  3_000_000,
);

/** Max bitrate used when we fall back to 15fps for a shaky connection. */
export const SCREEN_SHARE_MAX_BITRATE_FALLBACK = envInt(
  "NEXT_PUBLIC_SCREEN_SHARE_MAX_BITRATE_FALLBACK",
  1_500_000,
);

/** Mirrors LiveKit's server-recommended default for the microphone track. */
export const MIC_MAX_BITRATE = envInt("NEXT_PUBLIC_MIC_MAX_BITRATE", 32_000);

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "lvlbaixo";

export const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || "";

/**
 * The fixed set of voice-channel LiveKit room names (see
 * supabase/seed.sql). Shared by the token route (to reject arbitrary room
 * names) and the presence route (to know which rooms to poll) so the two
 * never drift apart.
 */
export const VOICE_ROOM_SLUGS = ["cs-de-cadeira", "cs-de-rua", "gay-por"] as const;
