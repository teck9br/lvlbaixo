"use client";

import type { RoomRecord, VoicePresenceParticipant } from "@/types";
import { ChannelItem } from "./ChannelItem";

const CATEGORY_LABELS: Record<string, string> = {
  text: "CANAIS DE TEXTO",
  voice: "CANAIS DE VOZ",
  afk: "AFK",
};

export function ChannelList({
  rooms,
  activeRoomId,
  connectedRoomId,
  onSelect,
  voiceMembers,
}: {
  rooms: RoomRecord[];
  activeRoomId: string | null;
  connectedRoomId?: string | null;
  onSelect: (room: RoomRecord) => void;
  voiceMembers: Record<string, VoicePresenceParticipant[]>;
}) {
  const categories: Array<RoomRecord["category"]> = ["text", "voice", "afk"];

  return (
    <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-3" aria-label="Canais">
      {categories.map((category) => {
        const items = rooms
          .filter((r) => r.category === category)
          .sort((a, b) => a.position - b.position);
        if (items.length === 0) return null;
        return (
          <div key={category}>
            <h2 className="mb-1 px-2 text-xs font-semibold tracking-wide text-text-muted">
              {CATEGORY_LABELS[category]}
            </h2>
            <ul className="flex flex-col gap-0.5">
              {items.map((room) => (
                <li key={room.id}>
                  <ChannelItem
                    room={room}
                    active={room.id === activeRoomId}
                    connected={room.id === connectedRoomId}
                    onClick={() => onSelect(room)}
                    voiceMembers={voiceMembers[room.slug]}
                  />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
