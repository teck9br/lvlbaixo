import type { ConnectedParticipant } from "@/types";
import { ParticipantCard } from "./ParticipantCard";

export function ParticipantGrid({ participants }: { participants: ConnectedParticipant[] }) {
  return (
    <div
      className="grid flex-1 auto-rows-min grid-cols-2 place-content-center gap-2 overflow-y-auto p-6 sm:grid-cols-3 md:grid-cols-4"
      role="list"
      aria-label="Participantes na sala de voz"
    >
      {participants.map((p) => (
        <div key={p.identity} role="listitem">
          <ParticipantCard participant={p} />
        </div>
      ))}
    </div>
  );
}
