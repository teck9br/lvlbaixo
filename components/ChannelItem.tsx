"use client";

import { Hash, MicOff, Volume2 } from "lucide-react";
import { cn, colorFromString, initialOf } from "@/lib/utils";
import type { RoomRecord, VoicePresenceParticipant } from "@/types";

export function ChannelItem({
  room,
  active,
  connected,
  onClick,
  voiceMembers,
}: {
  room: RoomRecord;
  active: boolean;
  connected?: boolean;
  onClick: () => void;
  voiceMembers?: VoicePresenceParticipant[];
}) {
  const Icon = room.type === "text" ? Hash : Volume2;

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        aria-label={`${room.type === "text" ? "Canal de texto" : "Canal de voz"} ${room.name}${connected ? " (conectado)" : ""}`}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
          active
            ? "bg-bg-hover text-text-primary"
            : "text-text-secondary hover:bg-bg-hover/60 hover:text-text-primary",
        )}
      >
        <Icon
          size={18}
          className={cn("shrink-0", connected ? "text-success" : "text-text-muted")}
          aria-hidden="true"
        />
        <span className="truncate">{room.name}</span>
        {connected ? (
          <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-success" aria-hidden="true" />
        ) : null}
      </button>

      {voiceMembers && voiceMembers.length > 0 ? (
        <ul className="ml-6 mt-0.5 flex flex-col gap-0.5" aria-label={`Pessoas em ${room.name}`}>
          {voiceMembers.map((member) => (
            <li key={member.identity}>
              <button
                type="button"
                onClick={onClick}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-bg-hover/60"
              >
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                  style={{ backgroundColor: colorFromString(member.name) }}
                  aria-hidden="true"
                >
                  {initialOf(member.name)}
                </span>
                <span className="truncate text-xs text-text-secondary">{member.name}</span>
                {member.isMuted ? (
                  <MicOff
                    size={12}
                    className="ml-auto shrink-0 text-text-muted"
                    aria-label="Microfone mutado"
                  />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
