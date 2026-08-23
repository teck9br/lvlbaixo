import type { ReactNode } from "react";

export function GateShell({
  title,
  subtitle,
  children,
  appName,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  appName: string;
}) {
  return (
    <div className="flex flex-1 items-center justify-center bg-bg-app px-4">
      <div className="w-full max-w-sm rounded-lg bg-bg-elevated p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-lg font-bold text-white">
            {appName.slice(0, 2).toUpperCase()}
          </div>
          <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-text-muted">{subtitle}</p>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}
