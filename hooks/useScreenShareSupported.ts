"use client";

import { useEffect, useState } from "react";

/**
 * Feature-detects getDisplayMedia support on mount (deferred to an effect
 * to avoid an SSR/client render mismatch — `navigator` doesn't exist
 * server-side). Shared by anything that needs to know whether to offer a
 * "compartilhar tela" control at all.
 */
export function useScreenShareSupported(): boolean {
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia);
  }, []);

  return supported;
}
