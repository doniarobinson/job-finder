"use client";

import { useState } from "react";

export function AgentControls({ initialPaused }: { initialPaused: boolean }) {
  const [paused, setPaused] = useState(initialPaused);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function toggle(nextPaused: boolean) {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/agent/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paused: nextPaused }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { paused: boolean };
      setPaused(data.paused);
      setStatus(data.paused ? "Agent paused" : "Agent running");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span
        className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
          paused ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"
        }`}
      >
        {paused ? "Paused" : "Active"}
      </span>
      {paused ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => toggle(false)}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Resume agent
        </button>
      ) : (
        <button
          type="button"
          disabled={loading}
          onClick={() => toggle(true)}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          Pause agent
        </button>
      )}
      {status && <p className="text-sm text-zinc-600">{status}</p>}
    </div>
  );
}
