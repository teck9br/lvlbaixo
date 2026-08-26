"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { MessageRecord, PollRecord, PollVoteRecord } from "@/types";

interface UseMessagesResult {
  messages: MessageRecord[];
  polls: Record<string, PollRecord>;
  votesByPoll: Record<string, PollVoteRecord[]>;
  loading: boolean;
  error: string | null;
  realtimeConnected: boolean;
  send: (content: string) => Promise<string | null>; // returns error message, or null on success
  createPoll: (question: string, options: string[]) => Promise<string | null>;
  vote: (pollId: string, optionId: string) => Promise<string | null>;
  retractVote: (pollId: string) => Promise<string | null>;
  closePoll: (pollId: string) => Promise<string | null>;
}

function upsertVote(list: PollVoteRecord[], vote: PollVoteRecord): PollVoteRecord[] {
  const idx = list.findIndex((v) => v.id === vote.id);
  if (idx === -1) return [...list, vote];
  const next = list.slice();
  next[idx] = vote;
  return next;
}

export function useMessages(roomId: string | null): UseMessagesResult {
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [polls, setPolls] = useState<Record<string, PollRecord>>({});
  const [votesByPoll, setVotesByPoll] = useState<Record<string, PollVoteRecord[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const seenIds = useRef<Set<string>>(new Set());
  // Mirrors `polls` in a ref too — the realtime message handler needs to
  // check "do we already know this poll?" synchronously, and state set in
  // the same tick isn't visible to a closure captured at subscribe time.
  const knownPollIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    // Resets loading/error state as we start fetching history for the new
    // room — synchronizing with an external fetch, not derived state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    setPolls({});
    setVotesByPoll({});
    seenIds.current = new Set();
    knownPollIds.current = new Set();

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

        const pollList: PollRecord[] = body.polls ?? [];
        const voteList: PollVoteRecord[] = body.votes ?? [];
        const pollMap: Record<string, PollRecord> = {};
        for (const p of pollList) {
          pollMap[p.id] = p;
          knownPollIds.current.add(p.id);
        }
        const voteMap: Record<string, PollVoteRecord[]> = {};
        for (const v of voteList) {
          (voteMap[v.poll_id] ??= []).push(v);
        }
        setPolls(pollMap);
        setVotesByPoll(voteMap);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError("Sem conexão com o servidor.");
          setLoading(false);
        }
      }
    }
    loadHistory();

    // A poll message's realtime INSERT only carries the `messages` row —
    // the question/options live in `polls`, fetched separately here so a
    // tab that didn't create the poll still gets to render it.
    async function fetchPoll(pollId: string) {
      if (knownPollIds.current.has(pollId)) return;
      knownPollIds.current.add(pollId);
      try {
        const res = await fetch(`/api/polls/${pollId}`);
        const body = await res.json();
        if (cancelled || !res.ok) return;
        const poll: PollRecord = body.poll;
        const votes: PollVoteRecord[] = body.votes ?? [];
        setPolls((prev) => ({ ...prev, [poll.id]: poll }));
        setVotesByPoll((prev) => ({ ...prev, [poll.id]: votes }));
      } catch {
        // best-effort — the poll just won't render for this tab until a
        // manual refresh; nothing else depends on it succeeding
      }
    }

    let supabase: ReturnType<typeof getSupabaseBrowser>;
    let messagesChannel: ReturnType<typeof supabase.channel> | null = null;
    let votesChannel: ReturnType<typeof supabase.channel> | null = null;
    try {
      supabase = getSupabaseBrowser();
      messagesChannel = supabase
        .channel(`messages:${roomId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
          (payload) => {
            const record = payload.new as MessageRecord;
            if (seenIds.current.has(record.id)) return;
            seenIds.current.add(record.id);
            setMessages((prev) => [...prev, record]);
            if (record.poll_id) fetchPoll(record.poll_id);
          },
        )
        .subscribe((status) => {
          setRealtimeConnected(status === "SUBSCRIBED");
        });

      // Unfiltered on purpose — poll_votes has no room_id column to filter
      // on, and at this app's scale (a handful of people, a handful of
      // polls) subscribing to the whole table is cheap. Events for polls
      // this tab doesn't know about yet are just ignored below.
      votesChannel = supabase
        .channel("poll_votes:all")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "poll_votes" },
          (payload) => {
            const vote = payload.new as PollVoteRecord;
            if (!knownPollIds.current.has(vote.poll_id)) return;
            setVotesByPoll((prev) => ({
              ...prev,
              [vote.poll_id]: upsertVote(prev[vote.poll_id] ?? [], vote),
            }));
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "poll_votes" },
          (payload) => {
            const vote = payload.new as PollVoteRecord;
            if (!knownPollIds.current.has(vote.poll_id)) return;
            setVotesByPoll((prev) => ({
              ...prev,
              [vote.poll_id]: upsertVote(prev[vote.poll_id] ?? [], vote),
            }));
          },
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "poll_votes" },
          (payload) => {
            // Requires REPLICA IDENTITY FULL on poll_votes (see
            // 0003_polls.sql) — otherwise `old` only carries the id, not
            // poll_id, and we wouldn't know which list to remove it from.
            const old = payload.old as Partial<PollVoteRecord>;
            if (!old.poll_id || !knownPollIds.current.has(old.poll_id)) return;
            setVotesByPoll((prev) => ({
              ...prev,
              [old.poll_id!]: (prev[old.poll_id!] ?? []).filter((v) => v.id !== old.id),
            }));
          },
        )
        .subscribe();
    } catch {
      // Supabase realtime not configured — chat still works via polling-free
      // send/receive on this tab, just without cross-tab live updates.
      setRealtimeConnected(false);
    }

    return () => {
      cancelled = true;
      for (const channel of [messagesChannel, votesChannel]) {
        if (!channel) continue;
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

  const createPoll = useCallback(
    async (question: string, options: string[]): Promise<string | null> => {
      if (!roomId) return "Canal inválido.";
      try {
        const res = await fetch("/api/polls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, question, options }),
        });
        const body = await res.json();
        if (!res.ok) return body?.error || "Não foi possível criar a enquete.";

        const message: MessageRecord = body.message;
        const poll: PollRecord = body.poll;
        if (!seenIds.current.has(message.id)) {
          seenIds.current.add(message.id);
          setMessages((prev) => [...prev, message]);
        }
        knownPollIds.current.add(poll.id);
        setPolls((prev) => ({ ...prev, [poll.id]: poll }));
        setVotesByPoll((prev) => ({ ...prev, [poll.id]: [] }));
        return null;
      } catch {
        return "Sem conexão com o servidor.";
      }
    },
    [roomId],
  );

  const vote = useCallback(async (pollId: string, optionId: string): Promise<string | null> => {
    try {
      const res = await fetch(`/api/polls/${pollId}/votes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId }),
      });
      const body = await res.json();
      if (!res.ok) return body?.error || "Não foi possível votar.";
      const castVote: PollVoteRecord = body.vote;
      setVotesByPoll((prev) => ({ ...prev, [pollId]: upsertVote(prev[pollId] ?? [], castVote) }));
      return null;
    } catch {
      return "Sem conexão com o servidor.";
    }
  }, []);

  const retractVote = useCallback(async (pollId: string): Promise<string | null> => {
    try {
      const res = await fetch(`/api/polls/${pollId}/votes`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        return body?.error || "Não foi possível remover o voto.";
      }
      return null;
    } catch {
      return "Sem conexão com o servidor.";
    }
  }, []);

  const closePoll = useCallback(async (pollId: string): Promise<string | null> => {
    try {
      const res = await fetch(`/api/polls/${pollId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closed: true }),
      });
      const body = await res.json();
      if (!res.ok) return body?.error || "Não foi possível encerrar a enquete.";
      const poll: PollRecord = body.poll;
      setPolls((prev) => ({ ...prev, [poll.id]: poll }));
      return null;
    } catch {
      return "Sem conexão com o servidor.";
    }
  }, []);

  return {
    messages,
    polls,
    votesByPoll,
    loading,
    error,
    realtimeConnected,
    send,
    createPoll,
    vote,
    retractVote,
    closePoll,
  };
}
