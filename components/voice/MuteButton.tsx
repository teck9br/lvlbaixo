"use client";

import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function MuteButton({ isMuted, onClick }: { isMuted: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isMuted}
      aria-label={isMuted ? "Ativar microfone" : "Desativar microfone"}
      className={cn(
        "flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors",
        isMuted
          ? "bg-danger text-white hover:bg-danger-hover"
          : "bg-bg-elevated-2 text-text-primary hover:bg-bg-hover",
      )}
    >
      {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
      {isMuted ? "Mutado" : "Microfone"}
    </button>
  );
}
