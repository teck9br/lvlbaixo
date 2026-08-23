"use client";

import { PhoneOff } from "lucide-react";

export function LeaveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Sair da sala de voz"
      className="flex items-center gap-2 rounded-md bg-bg-elevated-2 px-4 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-danger hover:text-white"
    >
      <PhoneOff size={18} />
      Sair
    </button>
  );
}
