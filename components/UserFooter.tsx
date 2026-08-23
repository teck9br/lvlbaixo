"use client";

import { useState, type FormEvent } from "react";
import { LogOut, Pencil, X } from "lucide-react";
import type { SessionUser, ConnectionStatusState } from "@/types";
import { colorFromString, initialOf, sanitizeUsername } from "@/lib/utils";
import { ConnectionStatus } from "./ConnectionStatus";

export function UserFooter({
  user,
  connectionStatus,
  onLogout,
  onRename,
}: {
  user: SessionUser;
  connectionStatus: ConnectionStatusState;
  onLogout: () => void;
  onRename: (username: string) => Promise<string | null>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(user.username);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const clean = sanitizeUsername(value);
    if (!clean) {
      setError("Nome inválido.");
      return;
    }
    setSaving(true);
    const err = await onRename(clean);
    setSaving(false);
    if (err) {
      setError(err);
    } else {
      setEditing(false);
    }
  }

  return (
    <div className="border-t border-border-subtle p-3">
      <div className="mb-2 px-1">
        <ConnectionStatus status={connectionStatus} />
      </div>

      {editing ? (
        <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
          <input
            autoFocus
            value={value}
            maxLength={32}
            onChange={(e) => setValue(e.target.value)}
            aria-label="Novo nome"
            className="min-w-0 flex-1 rounded-md border border-border-subtle bg-bg-elevated-2 px-2 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-accent px-2 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-60"
          >
            Salvar
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setValue(user.username);
              setError(null);
            }}
            aria-label="Cancelar"
            className="rounded-md p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary"
          >
            <X size={16} />
          </button>
        </form>
      ) : (
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: colorFromString(user.username) }}
            aria-hidden="true"
          >
            {initialOf(user.username)}
          </div>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
            {user.username}
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Alterar nome"
            title="Alterar nome"
            className="rounded-md p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary"
          >
            <Pencil size={15} />
          </button>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Sair do servidor"
            title="Sair do servidor"
            className="rounded-md p-1.5 text-text-muted hover:bg-bg-hover hover:text-danger"
          >
            <LogOut size={15} />
          </button>
        </div>
      )}
      {error ? (
        <p role="alert" className="mt-1.5 px-1 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
