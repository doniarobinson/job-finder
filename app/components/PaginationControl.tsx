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
        className={`${className} cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-400`}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={`${className} border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50`}
    >
      {children}
    </Link>
  );
}
