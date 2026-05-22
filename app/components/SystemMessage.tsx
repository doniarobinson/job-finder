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

export function SystemMessagePanel() {
  const { entry } = useSystemMessage();

  return (
    <section
      aria-label="System Message"
      className="border-b border-zinc-700 bg-zinc-900 text-zinc-50"
    >
      <div className="mx-auto max-w-5xl px-6 py-4">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-200">
          System Message
        </h2>
        {entry ? (
          <>
            <p className="mt-2 font-mono text-xs text-zinc-300">
              {formatTimestamp(entry.timestamp)}
            </p>
            <p className="mt-2 whitespace-pre-wrap font-mono text-sm leading-relaxed text-white">
              {entry.text}
            </p>
          </>
        ) : (
          <p className="mt-2 font-mono text-sm leading-relaxed text-zinc-300">No agent messages yet.</p>
        )}
      </div>
    </section>
  );
}
