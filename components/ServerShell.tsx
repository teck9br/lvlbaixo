"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Chat } from "./chat/Chat";
import { VoiceRoomView } from "./voice/VoiceRoomView";
import { ConnectionStatus } from "./ConnectionStatus";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useVoicePresence } from "@/hooks/useVoicePresence";
import { useVoiceRoom } from "@/hooks/useVoiceRoom";
import type { RoomRecord, SessionUser } from "@/types";

export function ServerShell({
  appName,
  user,
  onLogout,
  onRename,
}: {
  appName: string;
  user: SessionUser;
  onLogout: () => void;
  onRename: (username: string) => Promise<string | null>;
}) {
  const [rooms, setRooms] = useState<RoomRecord[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  // The voice room actually connected via LiveKit — separate from
  // activeRoomId (which room's screen is being *viewed*). Clicking a text
  // channel only changes activeRoomId, so browsing text never drops the
  // call; only picking a different voice channel, or explicitly leaving,
  // changes this.
  const [connectedRoomId, setConnectedRoomId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const online = useOnlineStatus();
  const voiceMembers = useVoicePresence();

  const connectedRoom = useMemo(
    () => rooms?.find((r) => r.id === connectedRoomId) ?? null,
    [rooms, connectedRoomId],
  );
  const voice = useVoiceRoom(connectedRoom?.slug ?? null, user);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/rooms");
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setLoadError(body?.error || "Não foi possível carregar os canais.");
          return;
        }
        setRooms(body.rooms);
        const firstText = (body.rooms as RoomRecord[]).find((r) => r.type === "text");
        if (firstText) setActiveRoomId(firstText.id);
      } catch {
        if (!cancelled) setLoadError("Sem conexão com o servidor.");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeRoom = useMemo(
    () => rooms?.find((r) => r.id === activeRoomId) ?? null,
    [rooms, activeRoomId],
  );

  const handleSelect = useCallback((room: RoomRecord) => {
    if (room.type === "voice") {
      // Setting connectedRoomId to a new slug is what makes useVoiceRoom
      // leave the previous voice room (if any) and join this one — see the
      // effect dependency in hooks/useVoiceRoom.ts. Re-clicking the room
      // you're already connected to is a no-op here (same id).
      setConnectedRoomId(room.id);
    }
    setActiveRoomId(room.id);
  }, []);

  const handleLeaveVoice = useCallback(() => {
    // Clearing connectedRoomId (rather than calling voice.leave() directly)
    // is what makes the hook actually disconnect — its effect is keyed on
    // the room slug, and null short-circuits it after cleanup runs.
    setConnectedRoomId(null);
    setActiveRoomId((current) => {
      const stillVoice = rooms?.find((r) => r.id === current)?.type === "voice";
      if (!stillVoice) return current;
      const firstText = rooms?.find((r) => r.type === "text");
      return firstText ? firstText.id : current;
    });
  }, [rooms]);

  const goToConnectedVoiceRoom = useCallback(() => {
    if (connectedRoomId) setActiveRoomId(connectedRoomId);
  }, [connectedRoomId]);

  const overallStatus = connectedRoomId ? voice.connectionStatus : online ? "connected" : "disconnected";

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-bg-app">
      {rooms ? (
        <Sidebar
          appName={appName}
          rooms={rooms}
          activeRoomId={activeRoomId}
          connectedRoomId={connectedRoomId}
          onSelect={handleSelect}
          voiceMembers={voiceMembers}
          user={user}
          connectionStatus={overallStatus}
          onLogout={onLogout}
          onRename={onRename}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
          connectedRoomName={connectedRoom?.name ?? null}
          showVoiceStatusBar={!!connectedRoomId && connectedRoomId !== activeRoomId}
          voiceIsMuted={voice.isMuted}
          onToggleVoiceMute={voice.toggleMute}
          onGoToVoiceRoom={goToConnectedVoiceRoom}
          onLeaveVoice={handleLeaveVoice}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border-subtle bg-bg-app px-3 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu de canais"
            className="rounded-md p-1.5 text-text-secondary hover:bg-bg-hover"
          >
            <Menu size={20} />
          </button>
          <span className="truncate text-sm font-medium text-text-primary">
            {activeRoom?.name ?? appName}
          </span>
          <div className="ml-auto">
            <ConnectionStatus status={overallStatus} />
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col">
          {loadError ? (
            <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-text-muted">
              {loadError}
            </div>
          ) : !rooms || !activeRoom ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-subtle border-t-accent" />
            </div>
          ) : activeRoom.type === "text" ? (
            <Chat room={activeRoom} user={user} />
          ) : (
            <VoiceRoomView room={activeRoom} voice={voice} onLeave={handleLeaveVoice} />
          )}
        </main>
      </div>
    </div>
  );
}
