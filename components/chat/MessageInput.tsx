"use client";

import { Send } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";

export function MessageInput({
  roomName,
  onSend,
}: {
  roomName: string;
  onSend: (content: string) => Promise<string | null>;
}) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function submit() {
    const content = value.trim();
    if (!content || sending) return;
    setSending(true);
    const err = await onSend(content);
    setSending(false);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setValue("");
    textareaRef.current?.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="shrink-0 px-4 pb-4 pt-2">
      {error ? (
        <p role="alert" className="mb-1 text-xs text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex items-end gap-2 rounded-lg bg-bg-elevated-2 px-3 py-2">
        <label htmlFor="chat-input" className="sr-only">
          Mensagem para #{roomName}
        </label>
        <textarea
          id="chat-input"
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Conversar em #${roomName}`}
          maxLength={4000}
          className="max-h-32 min-h-[24px] flex-1 resize-none bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
        />
        <button
          type="button"
          onClick={submit}
          disabled={sending || value.trim().length === 0}
          aria-label="Enviar mensagem"
          className="mb-0.5 shrink-0 rounded-md p-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
