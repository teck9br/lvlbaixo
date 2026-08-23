"use client";

import { MuteButton } from "./MuteButton";
import { ScreenShareButton } from "./ScreenShareButton";
import { LeaveButton } from "./LeaveButton";

export function ControlBar({
  isMuted,
  isSharingScreen,
  screenShareSupported,
  onToggleMute,
  onToggleScreenShare,
  onLeave,
}: {
  isMuted: boolean;
  isSharingScreen: boolean;
  screenShareSupported: boolean;
  onToggleMute: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-center gap-3 border-t border-border-subtle px-4 py-3">
      <MuteButton isMuted={isMuted} onClick={onToggleMute} />
      {screenShareSupported ? (
        <ScreenShareButton isSharing={isSharingScreen} onClick={onToggleScreenShare} />
      ) : (
        <span
          className="rounded-md bg-bg-elevated-2 px-4 py-2.5 text-sm text-text-muted"
          title="Compartilhamento de tela não é suportado neste navegador/dispositivo"
        >
          Compartilhamento indisponível aqui
        </span>
      )}
      <LeaveButton onClick={onLeave} />
    </div>
  );
}
