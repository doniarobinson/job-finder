"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  triggerAgentCycle,
  triggerAgentRebootstrap,
} from "@/app/actions/agent";
import { useSystemMessage } from "@/app/components/SystemMessage";
import type { AgentCycleResult, UpdateResumeResult } from "@/lib/types";

function formatCycleResult(result: AgentCycleResult): string {
  if (result.skippedReason === "paused") {
    return "Cycle skipped — agent is paused.";
  }
  const parts = [
    `Searched ${result.searched}`,
    `${result.newJobs} new job${result.newJobs === 1 ? "" : "s"}`,
  ];
  if (result.paramsUpdated) parts.push("search params updated");
  return `${parts.join(", ")}.`;
}

function formatRebootstrapResult(result: UpdateResumeResult): string {
  const keywords = result.searchParams.keywords.slice(0, 5).join(", ");
  const suffix = result.searchParams.keywords.length > 5 ? ", …" : "";
  const epochNote = result.epochStarted
    ? " New agent era started; prior jobs and history are archived."
    : "";
  return `Re-bootstrapped from RESUME_TEXT — ${result.searchParams.keywords.length} keyword${result.searchParams.keywords.length === 1 ? "" : "s"} (${keywords}${suffix}).${epochNote}`;
}

export function AgentControls() {
  const router = useRouter();
  const { publishSystemMessage } = useSystemMessage();
  const [cycleLoading, setCycleLoading] = useState(false);
  const [rebootstrapLoading, setRebootstrapLoading] = useState(false);
  const busy = cycleLoading || rebootstrapLoading;

  async function runCycle() {
    setCycleLoading(true);
    publishSystemMessage("Running search cycle…");
    try {
      const result = await triggerAgentCycle();
      publishSystemMessage(formatCycleResult(result));
      router.refresh();
    } catch (err) {
      publishSystemMessage(err instanceof Error ? err.message : "Cycle failed");
    } finally {
      setCycleLoading(false);
    }
  }

  async function rebootstrap() {
    if (
      !window.confirm(
        "Are you sure you want to re-bootstrap from the RESUME_TEXT environment variable? This starts a new agent era. Your resume and search params reset, but prior jobs and param history will stay in the database.",
      )
    ) {
      return;
    }

    setRebootstrapLoading(true);
    publishSystemMessage("Re-bootstrapping from RESUME_TEXT…");
    try {
      const result = await triggerAgentRebootstrap();
      publishSystemMessage(formatRebootstrapResult(result));
      router.refresh();
    } catch (err) {
      publishSystemMessage(
        err instanceof Error ? err.message : "Re-bootstrap failed",
      );
    } finally {
      setRebootstrapLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <button
        type="button"
        disabled={busy}
        onClick={rebootstrap}
        className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-pill-neutral disabled:opacity-50"
      >
        {rebootstrapLoading ? "Re-bootstrapping…" : "Re-bootstrap from env"}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={runCycle}
        className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {cycleLoading ? "Running cycle…" : "Run cycle now"}
      </button>
    </div>
  );
}
