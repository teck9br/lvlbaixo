import { MonitorUp, MicOff } from "lucide-react";
import { colorFromString, cn, initialOf } from "@/lib/utils";
import type { ConnectedParticipant } from "@/types";

export function ParticipantCard({ participant }: { participant: ConnectedParticipant }) {
  const statusDot = participant.isMuted ? "🔇" : participant.isSpeaking ? "🟢" : "⚪";

  return (
    <div className="flex flex-col items-center gap-2 rounded-lg p-4">
      <div
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-full text-xl font-semibold text-white transition-shadow",
          participant.isSpeaking && !participant.isMuted && "speaking-ring",
        )}
        style={{ backgroundColor: colorFromString(participant.name) }}
        aria-hidden="true"
      >
        {initialOf(participant.name)}
      </div>
      <div className="flex items-center gap-1.5 text-sm">
        <span aria-hidden="true">{statusDot}</span>
        <span className="max-w-[9rem] truncate font-medium text-text-primary">
          {participant.name}
          {participant.isLocal ? " (você)" : ""}
        </span>
      </div>
      <div className="flex items-center gap-2 text-text-muted" aria-hidden="true">
        {participant.isMuted ? <MicOff size={14} /> : null}
        {participant.isSharingScreen ? <MonitorUp size={14} /> : null}
      </div>
      <span className="sr-only">
        {participant.name} está {participant.isMuted ? "mutado" : participant.isSpeaking ? "falando" : "em silêncio"}
        {participant.isSharingScreen ? ", compartilhando tela" : ""}.
      </span>
    </div>
  );
}
