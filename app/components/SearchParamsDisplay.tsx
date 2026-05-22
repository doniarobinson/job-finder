import type { ReactNode } from "react";

import type { SearchParams } from "@/lib/types";

const NEGATIVE_KEYWORDS_DESCRIPTION = "Terms to deprioritize or exclude over time";

function CellTags({
  items,
  emptyLabel = "—",
}: {
  items: string[];
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return <span className="text-zinc-500">{emptyLabel}</span>;
  }

  return (
    <ul className="flex flex-wrap gap-1">
      {items.map((item) => (
        <li
          key={item}
          className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-800"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function CellPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-800">
      {children}
    </span>
  );
}

type SearchParamRow = {
  label: string;
  footnote?: boolean;
  value: ReactNode;
};

function buildSearchParamRows(params: SearchParams, detailed: boolean): SearchParamRow[] {
  return [
    { label: "Keywords", value: <CellTags items={params.keywords} emptyLabel="None" /> },
    {
      label: "Title variants",
      value: <CellTags items={params.titleVariants} emptyLabel="None" />,
    },
    {
      label: "Locations",
      value: <CellTags items={params.locations} emptyLabel="None" />,
    },
    {
      label: "Remote",
      value: <CellPill>{params.remote ? "Yes" : "No"}</CellPill>,
    },
    ...(params.seniority
      ? [{ label: "Seniority", value: <span>{params.seniority}</span> }]
      : []),
    {
      label: "Negative keywords",
      footnote: detailed,
      value: <CellTags items={params.negativeKeywords} emptyLabel="None" />,
    },
    ...(detailed
      ? [
          {
            label: "Results per cycle",
            value: <CellPill>{params.maxResultsPerCycle}</CellPill>,
          },
        ]
      : []),
  ];
}

export function SearchParamsTable({
  params,
  detailed = false,
  className,
}: {
  params: SearchParams;
  /** Current-params view: results per cycle + negative keywords subtitle */
  detailed?: boolean;
  className?: string;
}) {
  const rows = buildSearchParamRows(params, detailed);

  return (
    <div className={className}>
      <table className="w-full text-sm">
        <tbody>
          {rows.map(({ label, footnote, value }) => (
            <tr key={label} className="border-t border-zinc-100 first:border-t-0">
              <th
                scope="row"
                className="w-36 py-1.5 pr-4 align-top text-left text-xs font-medium text-zinc-500"
              >
                {label}
                {footnote && <span aria-hidden="true">*</span>}
              </th>
              <td className="py-1.5 align-top text-zinc-800">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {detailed && (
        <p className="mt-5 text-xs text-zinc-400">
          * {NEGATIVE_KEYWORDS_DESCRIPTION}
        </p>
      )}
    </div>
  );
}
