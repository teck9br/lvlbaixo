"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "vr_local_user";

interface LocalUser {
  userId: string;
  username: string;
}

/**
 * The device-local identity: a random id generated once and a display
 * name the person chose. Persisted in localStorage per spec §14 ("o nome
 * deve ser salvo localmente"). This is NOT the security boundary — the
 * server password + signed session cookie are — it's just "who does this
 * browser say it is" so re-entering the app doesn't ask for a name again.
 */
export function useLocalUser() {
  const [user, setUser] = useState<LocalUser | null | undefined>(undefined); // undefined = not loaded yet

  useEffect(() => {
    // Reads an external system (localStorage) on mount to hydrate state —
    // intentional, not a derived-state antipattern.
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(raw ? (JSON.parse(raw) as LocalUser) : null);
    } catch {
      setUser(null);
    }
  }, []);

  const save = useCallback((username: string) => {
    setUser((prev) => {
      const userId = prev?.userId ?? crypto.randomUUID();
      const next: LocalUser = { userId, username };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // localStorage unavailable (private mode, quota) — keep in-memory only.
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setUser(null);
  }, []);

  return { user, save, clear };
}
