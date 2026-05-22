"use client";

import { AgentControls } from "@/app/components/AgentControls";
import { SystemMessagePanel, SystemMessageProvider } from "@/app/components/SystemMessage";
import type { ReactNode } from "react";

export function ConfiguredAgentShell({
  headerDescription,
  footer,
  children,
}: {
  headerDescription: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <SystemMessageProvider>
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">{headerDescription}</div>
          <AgentControls />
        </div>
      </header>

      <SystemMessagePanel />

      {children}

      {footer}
    </SystemMessageProvider>
  );
}
