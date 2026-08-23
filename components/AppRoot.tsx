"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocalUser } from "@/hooks/useLocalUser";
import { NameGate } from "@/components/auth/NameGate";
import { ServerShell } from "@/components/ServerShell";
import type { SessionUser } from "@/types";

type Step = "loading" | "name" | "app";

export function AppRoot({
  appName,
  initialUser,
}: {
  appName: string;
  initialUser: SessionUser | null;
}) {
  const { user: localUser, save: saveLocalUser } = useLocalUser();
  const [step, setStep] = useState<Step>(initialUser ? "app" : "loading");
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(initialUser);
  // Guards the one-time silent auto-login below so it never re-fires after
  // an explicit logout (which also clears sessionUser).
  const didAutoLoginRef = useRef(false);

  useEffect(() => {
    if (didAutoLoginRef.current) return;
    if (sessionUser) {
      didAutoLoginRef.current = true;
      return; // already authenticated from the server (valid session cookie)
    }
    if (localUser === undefined) return; // local storage not read yet
    didAutoLoginRef.current = true;

    if (!localUser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep("name");
      return;
    }

    // Returning visitor with a saved local identity but no live session
    // (e.g. the cookie expired) — the server no longer requires a
    // password, so silently re-open a session instead of prompting again.
    let cancelled = false;
    setStep("loading");
    (async () => {
      try {
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: localUser.userId, username: localUser.username }),
        });
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setStep("name");
          return;
        }
        setSessionUser(body.user);
        setStep("app");
      } catch {
        if (!cancelled) setStep("name");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [localUser, sessionUser]);

  const handleName = useCallback(
    async (username: string): Promise<string | null> => {
      const userId = localUser?.userId ?? crypto.randomUUID();
      try {
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, username }),
        });
        const body = await res.json();
        if (!res.ok) {
          return body?.error || "Não foi possível entrar. Tente novamente.";
        }
        saveLocalUser(body.user.username, userId);
        setSessionUser(body.user);
        setStep("app");
        return null;
      } catch {
        return "Sem conexão com o servidor. Verifique sua internet.";
      }
    },
    [localUser, saveLocalUser],
  );

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth", { method: "DELETE" });
    } catch {
      // ignore network errors on logout
    }
    setSessionUser(null);
    setStep("name");
  }, []);

  const handleRename = useCallback(
    async (username: string): Promise<string | null> => {
      try {
        const res = await fetch("/api/auth", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });
        const body = await res.json();
        if (!res.ok) return body?.error || "Não foi possível alterar o nome.";
        setSessionUser(body.user);
        saveLocalUser(body.user.username);
        return null;
      } catch {
        return "Sem conexão com o servidor.";
      }
    },
    [saveLocalUser],
  );

  if (step === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center bg-bg-app">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-subtle border-t-accent" />
      </div>
    );
  }

  if (step === "name") {
    return <NameGate appName={appName} onSubmit={handleName} />;
  }

  if (step === "app" && sessionUser) {
    return (
      <ServerShell
        appName={appName}
        user={sessionUser}
        onLogout={handleLogout}
        onRename={handleRename}
      />
    );
  }

  return null;
}
