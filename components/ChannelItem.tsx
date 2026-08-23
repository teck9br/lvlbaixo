"use client";

import { Hash, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoomRecord } from "@/types";

export function ChannelItem({
  room,
  active,
  onClick,
  voiceMemberCount,
}: {
  room: RoomRecord;
  active: boolean;
  onClick: () => void;
  voiceMemberCount?: number;
}) {
  const Icon = room.type === "text" ? Hash : Volume2;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      aria-label={`${room.type === "text" ? "Canal de texto" : "Canal de voz"} ${room.name}`}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
        active
          ? "bg-bg-hover text-text-primary"
          : "text-text-secondary hover:bg-bg-hover/60 hover:text-text-primary",
      )}
    >
      <Icon size={18} className="shrink-0 text-text-muted" aria-hidden="true" />
      <span className="truncate">{room.name}</span>
      {typeof voiceMemberCount === "number" && voiceMemberCount > 0 ? (
        <span className="ml-auto shrink-0 rounded-full bg-bg-elevated-2 px-1.5 py-0.5 text-xs text-text-muted">
          {voiceMemberCount}
        </span>
      ) : null}
    </button>
  );
}
