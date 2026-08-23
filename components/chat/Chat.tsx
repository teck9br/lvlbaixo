"use client";

import { Hash, WifiOff } from "lucide-react";
import { useMessages } from "@/hooks/useMessages";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import type { RoomRecord, SessionUser } from "@/types";

const TOPICS: Record<string, string> = {
  "link-gc": "Link do grupo — fixe aqui.",
  regras: "Regras do servidor.",
  "bate-papo-do-uol": "Bate-papo geral do grupo.",
};

export function Chat({ room, user }: { room: RoomRecord; user: SessionUser }) {
  const { messages, loading, error, realtimeConnected, send } = useMessages(room.id);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border-subtle px-4 shadow-sm">
        <Hash size={18} className="text-text-muted" aria-hidden="true" />
        <span className="font-semibold text-text-primary">{room.name}</span>
        {room.topic || TOPICS[room.slug] ? (
          <>
            <span className="mx-1 h-4 w-px bg-border-subtle" aria-hidden="true" />
            <span className="truncate text-sm text-text-muted">
              {room.topic || TOPICS[room.slug]}
            </span>
          </>
        ) : null}
        {!loading && !realtimeConnected ? (
          <span
            className="ml-auto flex shrink-0 items-center gap-1 text-xs text-warning"
            title="Atualizações em tempo real indisponíveis. As mensagens enviadas por você ainda funcionam; pode ser necessário recarregar para ver mensagens de outras pessoas."
          >
            <WifiOff size={13} aria-hidden="true" />
            <span className="hidden sm:inline">tempo real offline</span>
          </span>
        ) : null}
      </header>

      {error ? (
        <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-text-muted">
          {error}
        </div>
      ) : loading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-subtle border-t-accent" />
        </div>
      ) : (
        <MessageList messages={messages} currentUserId={user.userId} />
      )}

      <MessageInput roomName={room.name} onSend={send} />
    </div>
  );
}
