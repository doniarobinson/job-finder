import type { ReactNode } from "react";

export function PaginationControl({
  href,
  onClick,
  disabled,
  children,
}: {
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  const className =
    "inline-flex min-w-[4.75rem] items-center justify-center rounded-md border px-2.5 py-1 text-xs font-medium";

  if (disabled || (!href && !onClick)) {
    return (
      <span
        aria-disabled="true"
        className={`${className} cursor-not-allowed border-border-subtle bg-pill-neutral text-muted/60`}
      >
        {children}
      </span>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${className} border-border bg-surface text-foreground hover:bg-pill-neutral`}>
        {children}
      </button>
    );
  }

  return (
    <a
      href={href}
      className={`${className} border-border bg-surface text-foreground hover:bg-pill-neutral`}
    >
      {children}
    </a>
  );
}
