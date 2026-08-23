"use client";

import { useEffect, useRef, useState } from "react";
import type { VoicePresenceParticipant } from "@/types";

const POLL_INTERVAL_MS = 6000;

/**
 * Polls GET /api/livekit/presence so the sidebar can show who's in each
 * voice channel, including channels the viewer hasn't joined. Skips
 * fetches while the tab is hidden and catches up immediately when it
 * becomes visible again, so it doesn't burn requests in background tabs.
 */
export function useVoicePresence(): Record<string, VoicePresenceParticipant[]> {
  const [presence, setPresence] = useState<Record<string, VoicePresenceParticipant[]>>({});
  const fetchingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchPresence() {
      if (fetchingRef.current || document.visibilityState !== "visible") return;
      fetchingRef.current = true;
      try {
        const res = await fetch("/api/livekit/presence");
        if (res.ok) {
          const body = await res.json();
          if (!cancelled) setPresence(body.presence ?? {});
        }
      } catch {
        // ignore — keep showing the last known presence until it recovers
      } finally {
        fetchingRef.current = false;
      }
    }

    fetchPresence();
    const interval = setInterval(fetchPresence, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", fetchPresence);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", fetchPresence);
    };
  }, []);

  return presence;
}
