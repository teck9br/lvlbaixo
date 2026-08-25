"use client";

import { AlertTriangle, Volume2, X } from "lucide-react";
import type { UseVoiceRoomResult } from "@/hooks/useVoiceRoom";
import { useScreenShareSupported } from "@/hooks/useScreenShareSupported";
import { ParticipantGrid } from "./ParticipantGrid";
import { ScreenShareView } from "./ScreenShareView";
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
    localScreenShareTrack,
    remoteScreenShare,
    capturedResolution,
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

  const localParticipant = participants.find((p) => p.isLocal);
  const activeShare = isSharingScreen && localScreenShareTrack
    ? { track: localScreenShareTrack, name: `${localParticipant?.name ?? "Você"} (você)` }
    : remoteScreenShare
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
        <ScreenShareView
          track={activeShare.track}
          presenterName={activeShare.name}
          resolution={isSharingScreen ? capturedResolution : null}
        />
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
