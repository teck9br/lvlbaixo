"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { MessageRecord } from "@/types";

interface UseMessagesResult {
  messages: MessageRecord[];
  loading: boolean;
  error: string | null;
  realtimeConnected: boolean;
  send: (content: string) => Promise<string | null>; // returns error message, or null on success
}

export function useMessages(roomId: string | null): UseMessagesResult {
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    // Resets loading/error state as we start fetching history for the new
    // room — synchronizing with an external fetch, not derived state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    seenIds.current = new Set();

    async function loadHistory() {
      try {
        const res = await fetch(`/api/messages?roomId=${roomId}`);
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(body?.error || "Não foi possível carregar as mensagens.");
          setLoading(false);
          return;
        }
        const list: MessageRecord[] = body.messages ?? [];
        list.forEach((m) => seenIds.current.add(m.id));
        setMessages(list);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError("Sem conexão com o servidor.");
          setLoading(false);
        }
      }
    }
    loadHistory();

    let supabase: ReturnType<typeof getSupabaseBrowser>;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      supabase = getSupabaseBrowser();
      channel = supabase
        .channel(`messages:${roomId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
          (payload) => {
            const record = payload.new as MessageRecord;
            if (seenIds.current.has(record.id)) return;
            seenIds.current.add(record.id);
            setMessages((prev) => [...prev, record]);
          },
        )
        .subscribe((status) => {
          setRealtimeConnected(status === "SUBSCRIBED");
        });
    } catch {
      // Supabase realtime not configured — chat still works via polling-free
      // send/receive on this tab, just without cross-tab live updates.
      setRealtimeConnected(false);
    }

    return () => {
      cancelled = true;
      if (channel) {
        try {
          channel.unsubscribe();
        } catch {
          // ignore
        }
      }
    };
  }, [roomId]);

  const send = useCallback(
    async (content: string): Promise<string | null> => {
      if (!roomId) return "Canal inválido.";
      const trimmed = content.trim();
      if (!trimmed) return "Mensagem vazia.";
      try {
        const res = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, content: trimmed }),
        });
        const body = await res.json();
        if (!res.ok) return body?.error || "Não foi possível enviar a mensagem.";
        // Add optimistically in case the realtime event is slow/misses (same-tab).
        const record: MessageRecord = body.message;
        if (!seenIds.current.has(record.id)) {
          seenIds.current.add(record.id);
          setMessages((prev) => [...prev, record]);
        }
        return null;
      } catch {
        return "Sem conexão com o servidor.";
      }
    },
    [roomId],
  );

  return { messages, loading, error, realtimeConnected, send };
}
