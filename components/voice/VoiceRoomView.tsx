"use client";

import { useState } from "react";
import { AlertTriangle, Volume2, X } from "lucide-react";
import type { UseVoiceRoomResult } from "@/hooks/useVoiceRoom";
import { useScreenShareSupported } from "@/hooks/useScreenShareSupported";
import { ParticipantGrid } from "./ParticipantGrid";
import { ScreenShareView } from "./ScreenShareView";
import { ScreenSharePrompt } from "./ScreenSharePrompt";
import { ControlBar } from "./ControlBar";
import type { RoomRecord } from "@/types";

// Presentational only — the LiveKit connection itself is owned by
// ServerShell (via useVoiceRoom) so it survives switching to a text
// channel. This component just renders whatever `voice` currently holds.
export function VoiceRoomView({
  room,
  voice,
  onLeave,
}: {
  room: RoomRecord;
  voice: UseVoiceRoomResult;
  onLeave: () => void;
}) {
  const {
    participants,
    remoteScreenShare,
    isMuted,
    isSharingScreen,
    needsAudioUnlock,
    enableAudio,
    error,
    dismissError,
    toggleMute,
    toggleScreenShare,
    leave,
  } = voice;

  const screenShareSupported = useScreenShareSupported();

  // Watching a share is opt-in, like Discord: joining a room (or being in
  // one when someone starts sharing) shows a prompt, not the video itself.
  // Resets whenever the presenter identity changes — a new person starting
  // to share, the same person stopping and starting again, or the share
  // ending — so the prompt reliably reappears for the next one instead of
  // silently carrying a stale "watching" choice into a different share.
  // Adjusted during render (React's documented pattern for this) rather
  // than in an effect, so there's no extra render pass after each change.
  const currentPresenterIdentity = remoteScreenShare?.participantIdentity ?? null;
  const [isWatching, setIsWatching] = useState(false);
  const [watchedPresenterIdentity, setWatchedPresenterIdentity] = useState(currentPresenterIdentity);
  if (currentPresenterIdentity !== watchedPresenterIdentity) {
    setWatchedPresenterIdentity(currentPresenterIdentity);
    setIsWatching(false);
  }

  // Whoever is sharing sees the normal participant grid, not their own
  // outgoing feed — the screen-share panel here is only for watching
  // someone else's share. (Their card in the grid still gets the little
  // "sharing" icon from ParticipantCard, so it's clear the share is live.)
  const activeShare = remoteScreenShare
    ? { track: remoteScreenShare.track, name: remoteScreenShare.participantName }
    : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border-subtle px-4 shadow-sm">
        <Volume2 size={18} className="text-text-muted" aria-hidden="true" />
        <span className="font-semibold text-text-primary">{room.name}</span>
      </header>

      {needsAudioUnlock ? (
        <div
          role="alert"
          className="flex items-center gap-2 bg-warning/15 px-4 py-2 text-sm text-warning"
        >
          <Volume2 size={16} className="shrink-0" />
          <span className="flex-1">
            O navegador bloqueou o áudio automático. Clique para ouvir as outras pessoas.
          </span>
          <button
            type="button"
            onClick={enableAudio}
            className="shrink-0 rounded bg-warning/20 px-2 py-1 font-medium hover:bg-warning/30"
          >
            Ativar áudio
          </button>
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="flex items-center gap-2 bg-danger/15 px-4 py-2 text-sm text-danger"
        >
          <AlertTriangle size={16} className="shrink-0" />
          <span className="flex-1">{error.message}</span>
          <button
            type="button"
            onClick={dismissError}
            aria-label="Fechar aviso"
            className="rounded p-1 hover:bg-danger/20"
          >
            <X size={14} />
          </button>
        </div>
      ) : null}

      {activeShare ? (
        isWatching ? (
          <ScreenShareView
            track={activeShare.track}
            presenterName={activeShare.name}
            resolution={null}
            onStopWatching={() => setIsWatching(false)}
          />
        ) : (
          <ScreenSharePrompt presenterName={activeShare.name} onWatch={() => setIsWatching(true)} />
        )
      ) : (
        <ParticipantGrid participants={participants} />
      )}

      <ControlBar
        isMuted={isMuted}
        isSharingScreen={isSharingScreen}
        screenShareSupported={screenShareSupported}
        onToggleMute={toggleMute}
        onToggleScreenShare={toggleScreenShare}
        onLeave={() => {
          leave();
          onLeave();
        }}
      />
    </div>
  );
}
