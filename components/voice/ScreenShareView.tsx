"use client";

import { useEffect, useRef } from "react";
import type { LocalVideoTrack, RemoteTrack } from "livekit-client";

export function ScreenShareView({
  track,
  presenterName,
  resolution,
}: {
  track: LocalVideoTrack | RemoteTrack | null;
  presenterName: string;
  resolution: { width: number; height: number } | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !track) return;
    track.attach(el);
    return () => {
      track.detach(el);
    };
  }, [track]);

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={false}
        className="max-h-full max-w-full object-contain"
        aria-label={`Tela compartilhada por ${presenterName}`}
      />
      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
        <span className="h-2 w-2 rounded-full bg-danger" aria-hidden="true" />
        {presenterName} compartilhando
        {resolution ? ` · ${resolution.width}×${resolution.height}` : ""}
      </div>
    </div>
  );
}
