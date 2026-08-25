"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { Mic, MicOff, MonitorUp, MonitorX, PhoneOff, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

const MARGIN = 12;
// Below this many pixels of pointer travel, a press-and-release counts as a
// tap (opens the voice room) rather than a drag.
const DRAG_THRESHOLD = 6;

/**
 * A small draggable floating control bubble for voice calls — mute, share
 * screen, leave — shown whenever the person is connected to a voice room
 * but currently looking at something else (a text channel). It exists
 * mainly for mobile: the sidebar (and its VoiceStatusBar) is hidden behind
 * the hamburger menu there, so without this the only way back to the call
 * controls would be opening that drawer first.
 */
export function VoiceCallFloater({
  roomName,
  isMuted,
  isSharingScreen,
  screenShareSupported,
  onToggleMute,
  onToggleScreenShare,
  onLeave,
  onOpen,
}: {
  roomName: string;
  isMuted: boolean;
  isSharingScreen: boolean;
  screenShareSupported: boolean;
  onToggleMute: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
  onOpen: () => void;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);

  const clamp = useCallback((x: number, y: number) => {
    const el = elRef.current;
    const w = el?.offsetWidth ?? 0;
    const h = el?.offsetHeight ?? 0;
    const maxX = Math.max(window.innerWidth - w - MARGIN, MARGIN);
    const maxY = Math.max(window.innerHeight - h - MARGIN, MARGIN);
    return { x: Math.min(Math.max(x, MARGIN), maxX), y: Math.min(Math.max(y, MARGIN), maxY) };
  }, []);

  // Default position: bottom-right, clear of the mobile bottom UI.
  useEffect(() => {
    if (pos) return;
    const el = elRef.current;
    if (!el) return;
    setPos(
      clamp(window.innerWidth - el.offsetWidth - MARGIN, window.innerHeight - el.offsetHeight - 96),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keeps the bubble on-screen across rotation / the on-screen keyboard
  // opening (which resizes the viewport on mobile).
  useEffect(() => {
    const onResize = () => setPos((p) => (p ? clamp(p.x, p.y) : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clamp]);

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (!pos) return;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: pos.x,
      originY: pos.y,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) drag.moved = true;
    if (drag.moved) setPos(clamp(drag.originX + dx, drag.originY + dy));
  };

  const onPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    dragRef.current = null;
  };

  const handleOpen = () => {
    // A press that turned into a drag shouldn't also jump back to the room.
    if (dragRef.current?.moved) return;
    onOpen();
  };

  return (
    <div
      ref={elRef}
      style={pos ? { left: pos.x, top: pos.y } : undefined}
      className={cn(
        "fixed z-40 flex items-center gap-1 rounded-full border border-border-subtle bg-bg-elevated px-2 py-1.5 shadow-lg",
        !pos && "bottom-24 right-4",
      )}
    >
      <button
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={handleOpen}
        className="flex touch-none items-center gap-2 rounded-full py-1 pl-1 pr-2 text-left"
        aria-label={`Voltar para a chamada de voz — ${roomName}. Arraste para mover.`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
          <Volume2 size={16} aria-hidden="true" />
        </span>
        <span className="max-w-[7rem] truncate text-xs font-medium text-text-primary">
          {roomName}
        </span>
      </button>

      <button
        type="button"
        onClick={onToggleMute}
        aria-pressed={isMuted}
        aria-label={isMuted ? "Ativar microfone" : "Desativar microfone"}
        title={isMuted ? "Ativar microfone" : "Desativar microfone"}
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
          isMuted
            ? "bg-danger/15 text-danger hover:bg-danger/25"
            : "bg-bg-elevated-2 text-text-primary hover:bg-bg-hover",
        )}
      >
        {isMuted ? <MicOff size={15} /> : <Mic size={15} />}
      </button>

      {screenShareSupported ? (
        <button
          type="button"
          onClick={onToggleScreenShare}
          aria-pressed={isSharingScreen}
          aria-label={isSharingScreen ? "Parar compartilhamento de tela" : "Compartilhar tela"}
          title={isSharingScreen ? "Parar compartilhamento de tela" : "Compartilhar tela"}
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
            isSharingScreen
              ? "bg-danger text-white hover:bg-danger-hover"
              : "bg-bg-elevated-2 text-text-primary hover:bg-bg-hover",
          )}
        >
          {isSharingScreen ? <MonitorX size={15} /> : <MonitorUp size={15} />}
        </button>
      ) : null}

      <button
        type="button"
        onClick={onLeave}
        aria-label="Sair da chamada de voz"
        title="Sair da chamada de voz"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-elevated-2 text-danger transition-colors hover:bg-danger hover:text-white"
      >
        <PhoneOff size={15} />
      </button>
    </div>
  );
}
