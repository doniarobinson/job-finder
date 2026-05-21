"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { triggerAgentCycle } from "@/app/actions/agent";
import type { AgentCycleResult } from "@/lib/types";

function formatCycleResult(result: AgentCycleResult): string {
  if (result.skippedReason === "paused") {
    return "Cycle skipped — agent is paused.";
  }
  const parts = [
    `Searched ${result.searched}`,
    `${result.newJobs} new job${result.newJobs === 1 ? "" : "s"}`,
  ];
  if (result.paramsUpdated) parts.push("params updated");
  return `${parts.join(", ")}.`;
}

export function AgentControls({ initialPaused }: { initialPaused: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [cycleLoading, setCycleLoading] = useState(false);

  async function runCycle() {
    setCycleLoading(true);
    setStatus(null);
    try {
      const result = await triggerAgentCycle();
      setStatus(formatCycleResult(result));
      router.refresh();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Cycle failed");
    } finally {
      setCycleLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-3">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
            initialPaused ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"
          }`}
        >
          {initialPaused ? "Paused" : "Active"}
        </span>
        <button
          type="button"
          disabled={cycleLoading}
          onClick={runCycle}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {cycleLoading ? "Running cycle…" : "Run cycle now"}
        </button>
      </div>
      {status && <p className="max-w-md text-right text-sm text-zinc-600">{status}</p>}
    </div>
  );
}
