export function AgentStatusBadge({
  paused,
  onDark = false,
}: {
  paused: boolean;
  onDark?: boolean;
}) {
  if (onDark) {
    return (
      <div
        className="inline-flex h-9 items-center gap-2.5 rounded-md border border-terminal-muted/20 bg-terminal-muted/5 px-3"
        aria-label={paused ? "System status: paused" : "System status: active"}
      >
        <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-terminal-muted">
          Status
        </span>
        <span
          className={`inline-flex items-center gap-1.5 text-sm font-medium ${
            paused ? "text-amber-300" : "text-terminal-foreground"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              paused ? "bg-amber-400" : "bg-emerald-400"
            }`}
            aria-hidden
          />
          {paused ? "Paused" : "Active"}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center">
      <span className="text-sm font-medium text-muted">System status:</span>
      <span
        className={`ml-1.5 inline-flex rounded-full px-3 py-1 text-sm font-medium ${
          paused ? "bg-amber-100 text-amber-900" : "bg-status text-status-foreground"
        }`}
        aria-label={paused ? "System status: paused" : "System status: active"}
      >
        {paused ? "Paused" : "Active"}
      </span>
    </div>
  );
}
