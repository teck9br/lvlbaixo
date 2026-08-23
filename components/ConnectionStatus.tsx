"use client";

import type { ConnectionStatusState } from "@/types";
import { cn } from "@/lib/utils";

const CONFIG: Record<ConnectionStatusState, { label: string; dot: string }> = {
  connected: { label: "Conectado", dot: "bg-success" },
  reconnecting: { label: "Reconectando...", dot: "bg-warning" },
  disconnected: { label: "Desconectado", dot: "bg-danger" },
};

export function ConnectionStatus({ status }: { status: ConnectionStatusState }) {
  const { label, dot } = CONFIG[status];
  return (
    <div
      className="flex items-center gap-1.5 text-xs text-text-muted"
      role="status"
      aria-live="polite"
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          dot,
          status === "reconnecting" && "pulse-dot",
        )}
        aria-hidden="true"
      />
      <span>{label}</span>
    </div>
  );
}
