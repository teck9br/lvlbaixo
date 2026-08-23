"use client";

import { X } from "lucide-react";
import type {
  ConnectionStatusState,
  RoomRecord,
  SessionUser,
  VoicePresenceParticipant,
} from "@/types";
import { ChannelList } from "./ChannelList";
import { UserFooter } from "./UserFooter";
import { VoiceStatusBar } from "./VoiceStatusBar";
import { cn } from "@/lib/utils";

export function Sidebar({
  appName,
  rooms,
  activeRoomId,
  connectedRoomId,
  onSelect,
  voiceMembers,
  user,
  connectionStatus,
  onLogout,
  onRename,
  mobileOpen,
  onCloseMobile,
  connectedRoomName,
  showVoiceStatusBar,
  voiceIsMuted,
  onToggleVoiceMute,
  onGoToVoiceRoom,
  onLeaveVoice,
}: {
  appName: string;
  rooms: RoomRecord[];
  activeRoomId: string | null;
  connectedRoomId: string | null;
  onSelect: (room: RoomRecord) => void;
  voiceMembers: Record<string, VoicePresenceParticipant[]>;
  user: SessionUser;
  connectionStatus: ConnectionStatusState;
  onLogout: () => void;
  onRename: (username: string) => Promise<string | null>;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  connectedRoomName: string | null;
  showVoiceStatusBar: boolean;
  voiceIsMuted: boolean;
  onToggleVoiceMute: () => void;
  onGoToVoiceRoom: () => void;
  onLeaveVoice: () => void;
}) {
  return (
    <>
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      ) : null}
      <aside
        className={cn(
          "z-40 flex h-full w-64 shrink-0 flex-col bg-bg-sidebar transition-transform duration-200 md:static md:translate-x-0",
          "fixed inset-y-0 left-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Barra lateral de canais"
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border-subtle px-4 shadow-sm">
          <span className="truncate font-semibold text-text-primary">{appName}</span>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Fechar menu"
            className="rounded-md p-1 text-text-muted hover:bg-bg-hover md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <ChannelList
          rooms={rooms}
          activeRoomId={activeRoomId}
          connectedRoomId={connectedRoomId}
          onSelect={(room) => {
            onSelect(room);
            onCloseMobile();
          }}
          voiceMembers={voiceMembers}
        />

        {showVoiceStatusBar && connectedRoomName ? (
          <VoiceStatusBar
            roomName={connectedRoomName}
            isMuted={voiceIsMuted}
            onToggleMute={onToggleVoiceMute}
            onOpen={onGoToVoiceRoom}
            onLeave={onLeaveVoice}
          />
        ) : null}

        <UserFooter
          user={user}
          connectionStatus={connectionStatus}
          onLogout={onLogout}
          onRename={onRename}
        />
      </aside>
    </>
  );
}
