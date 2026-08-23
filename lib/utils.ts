export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** Trims and caps a display name to something sane. Returns null if empty. */
export function sanitizeUsername(raw: string): string | null {
  const trimmed = raw.trim().replace(/\s+/g, " ").slice(0, 32);
  return trimmed.length > 0 ? trimmed : null;
}

export function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function formatTime(iso: string): string {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/**
 * Deterministic color from a string, used for avatar backgrounds so the
 * same name always gets the same color without a lookup table.
 */
export function colorFromString(input: string): string {
  const palette = [
    "#5865f2",
    "#57b18f",
    "#e0844b",
    "#d9534f",
    "#9b59b6",
    "#2f9e91",
    "#c2578e",
    "#4a90d9",
  ];
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return palette[Math.abs(hash) % palette.length];
}
