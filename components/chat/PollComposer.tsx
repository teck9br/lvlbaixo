"use client";

import { useRef, useState } from "react";
import { ListChecks, Plus, X } from "lucide-react";

interface OptionRow {
  key: string;
  value: string;
}

export function PollComposer({
  onSubmit,
  onClose,
}: {
  onSubmit: (question: string, options: string[]) => Promise<string | null>;
  onClose: () => void;
}) {
  const nextKey = useRef(2);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<OptionRow[]>([
    { key: "0", value: "" },
    { key: "1", value: "" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateOption(key: string, value: string) {
    setOptions((prev) => prev.map((o) => (o.key === key ? { ...o, value } : o)));
  }

  function addOption() {
    setOptions((prev) => (prev.length >= 8 ? prev : [...prev, { key: String(nextKey.current++), value: "" }]));
  }

  function removeOption(key: string) {
    setOptions((prev) => (prev.length <= 2 ? prev : prev.filter((o) => o.key !== key)));
  }

  async function submit() {
    const q = question.trim();
    const cleanOptions = options.map((o) => o.value.trim()).filter(Boolean);
    if (!q) {
      setError("Digite uma pergunta.");
      return;
    }
    if (cleanOptions.length < 2) {
      setError("Adicione pelo menos 2 opções.");
      return;
    }
    setSubmitting(true);
    const err = await onSubmit(q, cleanOptions);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="poll-composer-title"
        className="w-full max-w-sm rounded-lg border border-border-subtle bg-bg-elevated p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div
            id="poll-composer-title"
            className="flex items-center gap-2 text-sm font-semibold text-text-primary"
          >
            <ListChecks size={16} aria-hidden="true" />
            Nova enquete
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded p-1 text-text-muted hover:bg-bg-hover"
          >
            <X size={16} />
          </button>
        </div>

        {error ? (
          <p role="alert" className="mb-2 text-xs text-danger">
            {error}
          </p>
        ) : null}

        <label htmlFor="poll-question" className="mb-1 block text-xs font-medium text-text-muted">
          Pergunta
        </label>
        <input
          id="poll-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={300}
          placeholder="Joga hoje?"
          className="mb-3 w-full rounded-md bg-bg-elevated-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
        />

        <span className="mb-1 block text-xs font-medium text-text-muted">Opções</span>
        <div className="flex flex-col gap-1.5">
          {options.map((option, i) => (
            <div key={option.key} className="flex items-center gap-1.5">
              <input
                value={option.value}
                onChange={(e) => updateOption(option.key, e.target.value)}
                maxLength={80}
                placeholder={`Opção ${i + 1}`}
                aria-label={`Opção ${i + 1}`}
                className="min-w-0 flex-1 rounded-md bg-bg-elevated-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
              />
              {options.length > 2 ? (
                <button
                  type="button"
                  onClick={() => removeOption(option.key)}
                  aria-label="Remover opção"
                  className="shrink-0 rounded p-1.5 text-text-muted hover:bg-bg-hover hover:text-danger"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
          ))}
        </div>

        {options.length < 8 ? (
          <button
            type="button"
            onClick={addOption}
            className="mt-2 flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover"
          >
            <Plus size={14} aria-hidden="true" />
            Adicionar opção
          </button>
        ) : null}

        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="mt-4 w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Criando..." : "Criar enquete"}
        </button>
      </div>
    </div>
  );
}
