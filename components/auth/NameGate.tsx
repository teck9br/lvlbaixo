"use client";

import { useState, type FormEvent } from "react";
import { GateShell } from "./GateShell";
import { sanitizeUsername } from "@/lib/utils";

export function NameGate({
  appName,
  onSubmit,
}: {
  appName: string;
  onSubmit: (username: string) => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const clean = sanitizeUsername(value);
    if (!clean) {
      setError("Digite um nome válido.");
      return;
    }
    onSubmit(clean);
  }

  return (
    <GateShell appName={appName} title="Qual é o seu nome?" subtitle={`Bem-vindo(a) ao ${appName}`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div>
          <label htmlFor="username" className="sr-only">
            Nome
          </label>
          <input
            id="username"
            name="username"
            autoFocus
            autoComplete="nickname"
            placeholder="Digite seu nome"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            maxLength={32}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? "username-error" : undefined}
            className="w-full rounded-md border border-border-subtle bg-bg-elevated-2 px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
          {error ? (
            <p id="username-error" role="alert" className="mt-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-accent px-4 py-2.5 font-medium text-white transition-colors hover:bg-accent-hover"
        >
          ENTRAR
        </button>
      </form>
    </GateShell>
  );
}
