export function AgentStatusBadge({ paused }: { paused: boolean }) {
  return (
    <div className="flex items-center">
      <span className="text-sm font-medium text-zinc-600">System status:</span>
      <span
        className={`ml-1.5 inline-flex rounded-full px-3 py-1 text-sm font-medium ${
          paused ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"
        }`}
        aria-label={paused ? "System status: paused" : "System status: active"}
      >
        {paused ? "Paused" : "Active"}
      </span>
    </div>
  );
}
