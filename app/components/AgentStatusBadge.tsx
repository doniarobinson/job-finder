export function AgentStatusBadge({ paused }: { paused: boolean }) {
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
