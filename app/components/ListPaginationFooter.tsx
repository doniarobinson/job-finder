import type { ReactNode } from "react";

import { PaginationControl } from "@/app/components/PaginationControl";

export function ListPaginationFooter({
  ariaLabel,
  page,
  totalPages,
  previousHref,
  nextHref,
  pageSizeSelect,
  className,
}: {
  ariaLabel: string;
  page: number;
  totalPages: number;
  previousHref?: string;
  nextHref?: string;
  pageSizeSelect: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        className ?? "mt-6 space-y-3 border-t border-border-subtle pt-4"
      }
    >
      <div className="flex justify-end">{pageSizeSelect}</div>
      <nav aria-label={ariaLabel} className="flex items-center justify-center gap-3">
        <PaginationControl href={previousHref} disabled={page <= 1}>
          Previous
        </PaginationControl>
        <span className="min-w-[5.5rem] text-center text-xs tabular-nums text-muted">
          Page {page} of {totalPages}
        </span>
        <PaginationControl href={nextHref} disabled={page >= totalPages}>
          Next
        </PaginationControl>
      </nav>
    </div>
  );
}
