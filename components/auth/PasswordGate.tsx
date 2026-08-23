"use client";

import { useState, type FormEvent } from "react";
import { GateShell } from "./GateShell";

export function PasswordGate({
  appName,
  username,
  onBack,
  onSubmit,
}: {
  appName: string;
  username: string;
  onBack: () => void;
  onSubmit: (password: string) => Promise<string | null>; // returns error message, or null on success
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password) {
      setError("Digite a senha do servidor.");
      return;
    }
    setLoading(true);
    setError(null);
    const errMsg = await onSubmit(password);
    setLoading(false);
    if (errMsg) setError(errMsg);
  }

  return (
    <GateShell appName={appName} title="Digite a senha para entrar" subtitle={`Olá, ${username} — este servidor é privado.`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div>
          <label htmlFor="password" className="sr-only">
            Senha do servidor
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoFocus
            autoComplete="current-password"
            placeholder="Senha do servidor"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? "password-error" : undefined}
            className="w-full rounded-md border border-border-subtle bg-bg-elevated-2 px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
          {error ? (
            <p id="password-error" role="alert" className="mt-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-accent px-4 py-2.5 font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Entrando..." : "ENTRAR"}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-text-muted transition-colors hover:text-text-secondary"
        >
          Não é você? Trocar de nome
        </button>
      </form>
    </GateShell>
  );
}
