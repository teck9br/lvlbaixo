import { colorFromString, formatTime, initialOf } from "@/lib/utils";
import type { MessageRecord, PollRecord, PollVoteRecord } from "@/types";
import { PollCard } from "./PollCard";

export function ChatMessage({
  message,
  showHeader,
  isOwn,
  currentUserId,
  poll,
  votes,
  onVote,
  onRetractVote,
  onClosePoll,
}: {
  message: MessageRecord;
  showHeader: boolean;
  isOwn: boolean;
  currentUserId: string;
  // Only set (and only relevant) when message.poll_id is set.
  poll?: PollRecord;
  votes?: PollVoteRecord[];
  onVote?: (pollId: string, optionId: string) => void;
  onRetractVote?: (pollId: string) => void;
  onClosePoll?: (pollId: string) => void;
}) {
  return (
    <div className={`flex gap-3 px-4 ${showHeader ? "mt-3" : "mt-0.5"} hover:bg-bg-hover/40`}>
      <div className="w-9 shrink-0">
        {showHeader ? (
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: colorFromString(message.username) }}
            aria-hidden="true"
          >
            {initialOf(message.username)}
          </div>
        ) : null}
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        {showHeader ? (
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium text-text-primary">
              {message.username}
              {isOwn ? <span className="ml-1 font-normal text-text-muted">(você)</span> : null}
            </span>
            <span className="text-xs text-text-muted">{formatTime(message.created_at)}</span>
          </div>
        ) : null}
        {message.poll_id ? (
          poll ? (
            <PollCard
              poll={poll}
              votes={votes ?? []}
              currentUserId={currentUserId}
              onVote={(optionId) => onVote?.(message.poll_id!, optionId)}
              onRetractVote={() => onRetractVote?.(message.poll_id!)}
              onClose={() => onClosePoll?.(message.poll_id!)}
            />
          ) : (
            <p className="text-sm text-text-muted">Carregando enquete…</p>
          )
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-text-secondary">
            {message.content}
          </p>
        )}
      </div>
    </div>
  );
}
