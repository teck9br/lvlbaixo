"use client";

// Tiny two-note chimes played when someone joins/leaves a voice room —
// synthesized with the Web Audio API instead of shipping/hosting audio
// files. Best-effort: any failure here (no AudioContext, autoplay still
// locked, etc.) is swallowed silently — a missing chime should never break
// the call itself.

let sharedContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedContext) sharedContext = new Ctor();
  return sharedContext;
}

function tone(
  context: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  peakGain: number,
) {
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.03);
}

/** kind "join" plays a rising two-note chime, "leave" a falling one. */
export function playChime(kind: "join" | "leave"): void {
  try {
    const context = getContext();
    if (!context) return;

    const run = () => {
      const now = context.currentTime;
      const [first, second] = kind === "join" ? [523.25, 783.99] : [659.25, 415.3];
      tone(context, first, now, 0.11, 0.08);
      tone(context, second, now + 0.09, 0.14, 0.08);
    };

    if (context.state === "suspended") {
      context.resume().then(run).catch(() => {});
    } else {
      run();
    }
  } catch {
    // non-fatal — silence is an acceptable fallback here
  }
}
