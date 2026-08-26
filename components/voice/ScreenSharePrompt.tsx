"use client";

import { MonitorPlay } from "lucide-react";

// Shown to everyone except the presenter while a screen share is live and
// they haven't chosen to watch it yet — like Discord, joining a call with
// an active share doesn't force the video on you. Picking "Assistir" is
// what starts actually rendering the video track.
export function ScreenSharePrompt({
  presenterName,
  onWatch,
}: {
  presenterName: string;
  onWatch: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-accent">
        <MonitorPlay size={26} aria-hidden="true" />
      </span>
      <div>
        <p className="font-medium text-text-primary">{presenterName} está compartilhando a tela</p>
        <p className="text-sm text-text-muted">Você decide se quer assistir agora.</p>
      </div>
      <button
        type="button"
        onClick={onWatch}
        className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent-hover"
      >
        Assistir transmissão
      </button>
    </div>
  );
}
