"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type SystemMessageEntry = {
  timestamp: Date;
  text: string;
};

type SystemMessageContextValue = {
  entry: SystemMessageEntry | null;
  publishSystemMessage: (text: string) => void;
  clearSystemMessage: () => void;
};

const SystemMessageContext = createContext<SystemMessageContextValue | null>(null);

function formatTimestamp(date: Date): string {
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function SystemMessageProvider({ children }: { children: ReactNode }) {
  const [entry, setEntry] = useState<SystemMessageEntry | null>(null);

  const publishSystemMessage = useCallback((text: string) => {
    setEntry({ timestamp: new Date(), text });
  }, []);

  const clearSystemMessage = useCallback(() => {
    setEntry(null);
  }, []);

  const value = useMemo(
    () => ({ entry, publishSystemMessage, clearSystemMessage }),
    [entry, publishSystemMessage, clearSystemMessage]
  );

  return (
    <SystemMessageContext.Provider value={value}>{children}</SystemMessageContext.Provider>
  );
}

export function useSystemMessage() {
  const context = useContext(SystemMessageContext);
  if (!context) {
    throw new Error("useSystemMessage must be used within SystemMessageProvider");
  }
  return context;
}

export function SystemMessagePanel({ embedded = false }: { embedded?: boolean }) {
  const { entry } = useSystemMessage();

  const content = embedded ? (
    <>
      <div className="flex items-baseline justify-between gap-4 border-b border-terminal-muted/15 px-4 py-2.5">
        <h3 className="font-mono text-[11px] font-medium uppercase tracking-wider text-terminal-muted">
          System message
        </h3>
        {entry ? (
          <time
            dateTime={entry.timestamp.toISOString()}
            className="shrink-0 font-mono text-[10px] text-terminal-muted/70"
          >
            {formatTimestamp(entry.timestamp)}
          </time>
        ) : null}
      </div>
      <div className="px-4 py-3">
        {entry ? (
          <p className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-terminal-foreground/95">
            {entry.text}
          </p>
        ) : (
          <p className="font-mono text-sm leading-relaxed text-terminal-muted/60">
            No agent messages yet.
          </p>
        )}
      </div>
    </>
  ) : (
    <>
      <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-terminal-muted">
        System Message
      </h2>
      {entry ? (
        <>
          <p className="mt-2 font-mono text-xs text-terminal-muted">
            {formatTimestamp(entry.timestamp)}
          </p>
          <p className="mt-2 whitespace-pre-wrap font-mono text-sm leading-relaxed text-terminal-foreground">
            {entry.text}
          </p>
        </>
      ) : (
        <p className="mt-2 font-mono text-sm leading-relaxed text-terminal-muted">
          No agent messages yet.
        </p>
      )}
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <section
      aria-label="System Message"
      className="border-b border-border bg-terminal text-terminal-foreground"
    >
      <div className="mx-auto max-w-5xl px-6 py-4">{content}</div>
    </section>
  );
}
