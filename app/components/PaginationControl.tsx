import Link from "next/link";
import type { ReactNode } from "react";

export function PaginationControl({
  href,
  disabled,
  children,
}: {
  href?: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  const className =
    "inline-flex min-w-[4.75rem] items-center justify-center rounded-md border px-2.5 py-1 text-xs font-medium";

  if (disabled || !href) {
    return (
      <span
        aria-disabled="true"
        className={`${className} cursor-not-allowed border-border-subtle bg-pill-neutral text-muted/60`}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={`${className} border-border bg-surface text-foreground hover:bg-pill-neutral`}
    >
      {children}
    </Link>
  );
}
