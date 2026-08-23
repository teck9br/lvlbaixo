"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Chat } from "./chat/Chat";
import { VoiceRoomView } from "./voice/VoiceRoomView";
import { ConnectionStatus } from "./ConnectionStatus";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useVoicePresence } from "@/hooks/useVoicePresence";
import type { ConnectionStatusState, RoomRecord, SessionUser } from "@/types";

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<ConnectionStatusState | null>(null);
  const online = useOnlineStatus();
  const voiceMembers = useVoicePresence();

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

  const handleSelect = useCallback(
    (room: RoomRecord) => {
      if (activeRoom?.type === "voice" && room.id !== activeRoom.id) {
        setVoiceStatus(null);
      }
      setActiveRoomId(room.id);
    },
    [activeRoom],
  );

  const overallStatus: ConnectionStatusState = voiceStatus ?? (online ? "connected" : "disconnected");

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-bg-app">
      {rooms ? (
        <Sidebar
          appName={appName}
          rooms={rooms}
          activeRoomId={activeRoomId}
          onSelect={handleSelect}
          voiceMembers={voiceMembers}
          user={user}
          connectionStatus={overallStatus}
          onLogout={onLogout}
          onRename={onRename}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
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
            <VoiceRoomView
              room={activeRoom}
              user={user}
              onConnectionStatusChange={setVoiceStatus}
              onLeave={() => {
                setVoiceStatus(null);
                const firstText = rooms?.find((r) => r.type === "text");
                if (firstText) setActiveRoomId(firstText.id);
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
