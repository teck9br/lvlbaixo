"use client";

import { MonitorUp, MonitorX } from "lucide-react";
import { cn } from "@/lib/utils";

export function ScreenShareButton({
  isSharing,
  onClick,
}: {
  isSharing: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSharing}
      aria-label={isSharing ? "Parar compartilhamento de tela" : "Compartilhar tela"}
      className={cn(
        "flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors",
        isSharing
          ? "bg-danger text-white hover:bg-danger-hover"
          : "bg-bg-elevated-2 text-text-primary hover:bg-bg-hover",
      )}
    >
      {isSharing ? <MonitorX size={18} /> : <MonitorUp size={18} />}
      {isSharing ? "Parar compartilhamento" : "Compartilhar tela"}
    </button>
  );
}
