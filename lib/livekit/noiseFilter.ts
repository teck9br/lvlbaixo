"use client";

import type { LocalAudioTrack } from "livekit-client";

/**
 * Applies LiveKit's Krisp-based noise filter on top of the microphone
 * track. This is a real (AI) noise suppressor, well beyond what the
 * browser's own echoCancellation/noiseSuppression constraints do — those
 * stay on too (set in useVoiceRoom's capture options) as a fallback.
 *
 * Included at no extra cost on LiveKit Cloud. Best-effort: on a browser
 * without WASM/SIMD support, or if the module fails to load for any
 * reason, we just skip it and keep the browser-level suppression instead
 * of breaking the call.
 */
export async function applyNoiseFilter(track: LocalAudioTrack): Promise<boolean> {
  try {
    const { KrispNoiseFilter, isKrispNoiseFilterSupported } = await import(
      "@livekit/krisp-noise-filter"
    );
    if (!isKrispNoiseFilterSupported()) return false;
    await track.setProcessor(KrispNoiseFilter());
    return true;
  } catch {
    return false;
  }
}
