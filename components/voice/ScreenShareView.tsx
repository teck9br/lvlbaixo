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
    // Lets the browser float this video over other apps / the home screen
    // (mobile) or other windows (desktop) when the person leaves the tab —
    // switches app, locks the phone, minimizes the window — instead of the
    // screen share (and, since the tab stays alive while in PiP, the whole
    // voice connection with it) getting suspended in the background.
    try {
      // Set via the raw HTML attribute rather than the (newer, not yet in
      // every TS DOM lib) `autoPictureInPicture` IDL property — same effect.
      el.setAttribute("autopictureinpicture", "");
    } catch {
      // ignore — unsupported browsers just skip auto-PiP
    }
    return () => {
      track.detach(el);
    };
  }, [track]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    // Fallback for browsers that support Picture-in-Picture but don't
    // honor `autoPictureInPicture` on their own: ask for it ourselves as
    // soon as the tab is hidden, and hand it back when the person returns.
    // Some browsers reject requestPictureInPicture() outside a direct user
    // gesture — that's fine, it's just a best-effort backup for the
    // declarative attribute above, so failures are silently ignored.
    const onVisibilityChange = () => {
      if (document.hidden) {
        if (
          document.pictureInPictureEnabled &&
          !el.disablePictureInPicture &&
          document.pictureInPictureElement !== el &&
          el.readyState >= 2
        ) {
          el.requestPictureInPicture().catch(() => {});
        }
      } else if (document.pictureInPictureElement === el) {
        document.exitPictureInPicture().catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

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
