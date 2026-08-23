"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Volume2, X } from "lucide-react";
import { useVoiceRoom } from "@/hooks/useVoiceRoom";
import { ParticipantGrid } from "./ParticipantGrid";
import { ScreenShareView } from "./ScreenShareView";
import { ControlBar } from "./ControlBar";
import type { ConnectionStatusState, RoomRecord, SessionUser } from "@/types";

export function VoiceRoomView({
  room,
  user,
  onConnectionStatusChange,
  onLeave,
}: {
  room: RoomRecord;
  user: SessionUser;
  onConnectionStatusChange: (status: ConnectionStatusState) => void;
  onLeave: () => void;
}) {
  const {
    participants,
    localScreenShareTrack,
    remoteScreenShare,
    capturedResolution,
    isMuted,
    isSharingScreen,
    connectionStatus,
    needsAudioUnlock,
    enableAudio,
    error,
    dismissError,
    toggleMute,
    toggleScreenShare,
    leave,
  } = useVoiceRoom(room.slug, user);

  const [screenShareSupported, setScreenShareSupported] = useState(true);

  useEffect(() => {
    // Feature-detects a browser API on mount (avoids SSR/client mismatch).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScreenShareSupported(
      typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia,
    );
  }, []);

  useEffect(() => {
    onConnectionStatusChange(connectionStatus);
  }, [connectionStatus, onConnectionStatusChange]);

  const activeShare = isSharingScreen && localScreenShareTrack
    ? { track: localScreenShareTrack, name: `${user.username} (você)` }
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
