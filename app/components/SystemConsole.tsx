"use client";

import { AgentControls } from "@/app/components/AgentControls";
import { AgentStatusBadge } from "@/app/components/AgentStatusBadge";
import { SystemMessagePanel } from "@/app/components/SystemMessage";
import { formatScheduledCycleIdleMessage } from "@/lib/agent/cronSchedule";

export function SystemConsole({
  paused,
  nextScheduledRunAt,
}: {
  paused: boolean;
  nextScheduledRunAt?: string | null;
}) {
  const idleMessage =
    nextScheduledRunAt != null
      ? formatScheduledCycleIdleMessage(new Date(nextScheduledRunAt))
      : "No agent messages yet.";

  return (
    <section
      aria-label="Agent System Information and Overrides"
      className="border-b border-border bg-terminal text-terminal-foreground"
    >
      <div className="mx-auto max-w-5xl space-y-4 px-6 py-5">
        <h2 className="text-base font-semibold tracking-tight text-terminal-foreground">
          Agent System Information and Overrides
        </h2>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <AgentControls onDark />
          <div className="self-end sm:self-auto">
            <AgentStatusBadge paused={paused} onDark />
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-terminal-muted/20 bg-black/20">
          <SystemMessagePanel embedded idleMessage={idleMessage} />
        </div>
      </div>
    </section>
  );
}
