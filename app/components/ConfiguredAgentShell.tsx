"use client";

import { SystemConsole } from "@/app/components/SystemConsole";
import { SystemMessageProvider } from "@/app/components/SystemMessage";
import type { ReactNode } from "react";

export function ConfiguredAgentShell({
  headerDescription,
  paused,
  children,
}: {
  headerDescription: ReactNode;
  paused: boolean;
  children: ReactNode;
}) {
  return (
    <SystemMessageProvider>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-5xl px-6 py-8">
          {headerDescription}
        </div>
      </header>

      <SystemConsole paused={paused} />

      {children}
    </SystemMessageProvider>
  );
}
