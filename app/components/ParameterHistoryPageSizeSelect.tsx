import {
  PARAMETER_HISTORY_PAGE_SIZE_OPTIONS,
  type ParameterHistoryPageSize,
} from "@/lib/parameterHistoryPagination";

export function ParameterHistoryPageSizeSelect({
  pageSize,
  onPageSizeChange,
  disabled = false,
}: {
  pageSize: ParameterHistoryPageSize;
  onPageSizeChange: (pageSize: ParameterHistoryPageSize) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-muted">
      Versions per page
      <select
        value={pageSize}
        aria-label="Parameter history page size"
        disabled={disabled}
        className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground disabled:opacity-50"
        onChange={(event) => {
          const nextSize = Number(event.target.value) as ParameterHistoryPageSize;
          onPageSizeChange(nextSize);
        }}
      >
        {PARAMETER_HISTORY_PAGE_SIZE_OPTIONS.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </label>
  );
}
