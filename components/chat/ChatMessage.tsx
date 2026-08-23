import { colorFromString, formatTime, initialOf } from "@/lib/utils";
import type { MessageRecord } from "@/types";

export function ChatMessage({
  message,
  showHeader,
  isOwn,
}: {
  message: MessageRecord;
  showHeader: boolean;
  isOwn: boolean;
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
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-text-secondary">
          {message.content}
        </p>
      </div>
    </div>
  );
}
