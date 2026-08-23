"use client";

import { Mic, MicOff, PhoneOff, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Persistent "still connected" indicator shown in the sidebar whenever the
// user is in a voice call but currently viewing a different (text) channel
// — otherwise leaving voice would mean either dropping the call just to
// read a text channel, or having no way to see/leave the call at all while
// browsing. Mirrors the little always-visible voice bar apps like Discord
// show for the same reason.
export function VoiceStatusBar({
  roomName,
  isMuted,
  onToggleMute,
  onOpen,
  onLeave,
}: {
  roomName: string;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpen: () => void;
  onLeave: () => void;
}) {
  return (
    <div className="border-t border-border-subtle bg-bg-elevated px-3 py-2">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left hover:bg-bg-hover"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
          <Volume2 size={15} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-medium text-success">Conectado por voz</span>
          <span className="block truncate text-xs text-text-secondary">{roomName}</span>
        </span>
      </button>
      <div className="mt-1.5 flex items-center gap-1.5">
        <button
          type="button"
          onClick={onToggleMute}
          aria-pressed={isMuted}
          aria-label={isMuted ? "Ativar microfone" : "Desativar microfone"}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors",
            isMuted
              ? "bg-danger/15 text-danger hover:bg-danger/25"
              : "bg-bg-elevated-2 text-text-primary hover:bg-bg-hover",
          )}
        >
          {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
          {isMuted ? "Mutado" : "Microfone"}
        </button>
        <button
          type="button"
          onClick={onLeave}
          aria-label="Sair da sala de voz"
          title="Sair da sala de voz"
          className="flex items-center justify-center rounded-md bg-bg-elevated-2 p-1.5 text-danger transition-colors hover:bg-danger hover:text-white"
        >
          <PhoneOff size={14} />
        </button>
      </div>
    </div>
  );
}
