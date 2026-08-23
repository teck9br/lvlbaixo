"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocalUser } from "@/hooks/useLocalUser";
import { NameGate } from "@/components/auth/NameGate";
import { PasswordGate } from "@/components/auth/PasswordGate";
import { ServerShell } from "@/components/ServerShell";
import type { SessionUser } from "@/types";

type Step = "loading" | "name" | "password" | "app";

export function AppRoot({
  appName,
  initialUser,
}: {
  appName: string;
  initialUser: SessionUser | null;
}) {
  const { user: localUser, save: saveLocalUser, clear: clearLocalUser } = useLocalUser();
  const [step, setStep] = useState<Step>(initialUser ? "app" : "loading");
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(initialUser);

  useEffect(() => {
    if (sessionUser) return; // already authenticated from the server
    if (localUser === undefined) return; // local storage not read yet
    // Derives the gate step from the localStorage-backed hook once it
    // resolves — an external-system sync, not derived render state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStep(localUser ? "password" : "name");
  }, [localUser, sessionUser]);

  const handleName = useCallback(
    (username: string) => {
      saveLocalUser(username);
      setStep("password");
    },
    [saveLocalUser],
  );

  const handlePassword = useCallback(
    async (password: string): Promise<string | null> => {
      if (!localUser) return "Digite seu nome novamente.";
      try {
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: localUser.userId,
            username: localUser.username,
            password,
          }),
        });
        const body = await res.json();
        if (!res.ok) {
          return body?.error || "Não foi possível entrar. Tente novamente.";
        }
        setSessionUser(body.user);
        setStep("app");
        return null;
      } catch {
        return "Sem conexão com o servidor. Verifique sua internet.";
      }
    },
    [localUser],
  );

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth", { method: "DELETE" });
    } catch {
      // ignore network errors on logout
    }
    setSessionUser(null);
    setStep("password");
  }, []);

  const handleSwitchName = useCallback(() => {
    clearLocalUser();
    setSessionUser(null);
    setStep("name");
  }, [clearLocalUser]);

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

  if (step === "password" && localUser) {
    return (
      <PasswordGate
        appName={appName}
        username={localUser.username}
        onBack={handleSwitchName}
        onSubmit={handlePassword}
      />
    );
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
