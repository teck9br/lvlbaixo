"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import type { MessageRecord, PollRecord, PollVoteRecord } from "@/types";
import { ChatMessage } from "./ChatMessage";

const GROUP_WINDOW_MS = 5 * 60 * 1000;

export function MessageList({
  messages,
  currentUserId,
  polls,
  votesByPoll,
  onVote,
  onRetractVote,
  onClosePoll,
}: {
  messages: MessageRecord[];
  currentUserId: string;
  polls: Record<string, PollRecord>;
  votesByPoll: Record<string, PollVoteRecord[]>;
  onVote: (pollId: string, optionId: string) => void;
  onRetractVote: (pollId: string) => void;
  onClosePoll: (pollId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [newCount, setNewCount] = useState(0);
  const prevLength = useRef(messages.length);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const added = messages.length - prevLength.current;
    prevLength.current = messages.length;
    if (added <= 0) return;

    if (autoScroll) {
      el.scrollTop = el.scrollHeight;
    } else {
      setNewCount((c) => c + added);
    }
  }, [messages, autoScroll]);

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom < 48;
    setAutoScroll(atBottom);
    if (atBottom) setNewCount(0);
  }

  function scrollToBottom() {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setAutoScroll(true);
    setNewCount(0);
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto py-3"
        role="log"
        aria-live="polite"
        aria-label="Mensagens do canal"
      >
        {messages.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-text-muted">
            Nenhuma mensagem ainda. Diga oi! 👋
          </p>
        ) : (
          messages.map((message, i) => {
            const prev = messages[i - 1];
            const showHeader =
              !prev ||
              prev.username !== message.username ||
              new Date(message.created_at).getTime() - new Date(prev.created_at).getTime() >
                GROUP_WINDOW_MS;
            return (
              <ChatMessage
                key={message.id}
                message={message}
                showHeader={showHeader}
                isOwn={message.user_id === currentUserId}
                currentUserId={currentUserId}
                poll={message.poll_id ? polls[message.poll_id] : undefined}
                votes={message.poll_id ? votesByPoll[message.poll_id] : undefined}
                onVote={onVote}
                onRetractVote={onRetractVote}
                onClosePoll={onClosePoll}
              />
            );
          })
        )}
      </div>

      {!autoScroll && newCount > 0 ? (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-white shadow-lg transition-colors hover:bg-accent-hover"
        >
          <ArrowDown size={14} />
          {newCount === 1 ? "1 nova mensagem" : `${newCount} novas mensagens`}
        </button>
      ) : null}
    </div>
  );
}
