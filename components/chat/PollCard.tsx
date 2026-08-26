"use client";

import { BarChart3, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PollRecord, PollVoteRecord } from "@/types";

export function PollCard({
  poll,
  votes,
  currentUserId,
  onVote,
  onRetractVote,
  onClose,
}: {
  poll: PollRecord;
  votes: PollVoteRecord[];
  currentUserId: string;
  onVote: (optionId: string) => void;
  onRetractVote: () => void;
  onClose: () => void;
}) {
  const total = votes.length;
  const myVote = votes.find((v) => v.user_id === currentUserId);
  const isCreator = poll.created_by_user_id === currentUserId;
  const isClosed = !!poll.closed_at;

  return (
    <div className="mt-1 max-w-md rounded-lg border border-border-subtle bg-bg-elevated-2 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-text-muted">
        <BarChart3 size={14} aria-hidden="true" />
        Enquete
        {isClosed ? <span className="text-warning">· encerrada</span> : null}
      </div>
      <p className="mb-3 text-sm font-medium text-text-primary">{poll.question}</p>
      <div className="flex flex-col gap-1.5">
        {poll.options.map((option) => {
          const count = votes.filter((v) => v.option_id === option.id).length;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const mine = myVote?.option_id === option.id;
          return (
            <button
              key={option.id}
              type="button"
              disabled={isClosed}
              onClick={() => (mine ? onRetractVote() : onVote(option.id))}
              aria-pressed={mine}
              className={cn(
                "relative overflow-hidden rounded-md border px-3 py-2 text-left text-sm transition-colors",
                "disabled:cursor-not-allowed disabled:opacity-80",
                mine
                  ? "border-accent text-text-primary"
                  : "border-border-subtle text-text-secondary hover:border-accent/50",
              )}
            >
              <span
                className="absolute inset-y-0 left-0 bg-accent/15"
                style={{ width: `${pct}%` }}
                aria-hidden="true"
              />
              <span className="relative flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  {mine ? <Check size={14} className="shrink-0 text-accent" aria-hidden="true" /> : null}
                  <span className="truncate">{option.label}</span>
                </span>
                <span className="shrink-0 text-xs text-text-muted">
                  {count} · {pct}%
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
        <span>{total === 0 ? "Ninguém votou ainda" : total === 1 ? "1 voto" : `${total} votos`}</span>
        {isCreator && !isClosed ? (
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted transition-colors hover:text-danger"
          >
            Encerrar enquete
          </button>
        ) : null}
      </div>
    </div>
  );
}
