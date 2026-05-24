"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  triggerAgentCycle,
  triggerAgentRebootstrap,
} from "@/app/actions/agent";
import { useSystemMessage } from "@/app/components/SystemMessage";
import { formatResumeParseMessage } from "@/lib/ai/parseResume";
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
  const parseNote = formatResumeParseMessage(result.resumeParseMeta, result.parsed);
  return `Re-bootstrapped from RESUME_TEXT — ${result.searchParams.keywords.length} keyword${result.searchParams.keywords.length === 1 ? "" : "s"} (${keywords}${suffix}). ${parseNote}${epochNote}`;
}

export function AgentControls({ onDark = false }: { onDark?: boolean }) {
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

  const toolbarButtonClass =
    "inline-flex h-9 items-center rounded-md px-3.5 text-sm font-medium transition-colors disabled:opacity-50";

  const secondaryButtonClass = onDark
    ? `${toolbarButtonClass} border border-terminal-muted/30 bg-terminal-muted/5 text-terminal-foreground hover:bg-terminal-muted/15`
    : `${toolbarButtonClass} border border-border bg-surface text-foreground hover:bg-pill-neutral`;

  const primaryButtonClass = onDark
    ? `${toolbarButtonClass} border border-transparent bg-primary text-primary-foreground hover:bg-primary/90`
    : `${toolbarButtonClass} rounded-full bg-primary text-primary-foreground hover:opacity-90`;

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${onDark ? "justify-start" : "justify-end"}`}
    >
      <button
        type="button"
        disabled={busy}
        onClick={rebootstrap}
        className={secondaryButtonClass}
      >
        {rebootstrapLoading ? "Re-bootstrapping…" : "Re-bootstrap from env"}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={runCycle}
        className={primaryButtonClass}
      >
        {cycleLoading ? "Running cycle…" : "Run cycle now"}
      </button>
    </div>
  );
}
