/**
 * Live polling controls of the SATP inspector: pause/resume and the base
 * refresh interval. Viewer preference, kept per app instance in
 * localStorage (falls back to in-memory state when storage is unavailable).
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import type { SatpPollingSettings } from "../types";

/** Refresh intervals offered in the toolbar. */
export const POLL_INTERVAL_CHOICES_MS = [3_000, 5_000, 10_000, 30_000] as const;

export const DEFAULT_POLLING: SatpPollingSettings = {
  paused: false,
  intervalMs: 10_000,
};

/** Parses stored polling settings; anything unexpected yields the default. */
export function parseStoredPolling(raw: string | null): SatpPollingSettings {
  if (!raw) {
    return DEFAULT_POLLING;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return DEFAULT_POLLING;
    }
    const { paused, intervalMs } = parsed as Record<string, unknown>;
    return {
      paused: paused === true,
      intervalMs: (POLL_INTERVAL_CHOICES_MS as readonly number[]).includes(
        intervalMs as number,
      )
        ? (intervalMs as number)
        : DEFAULT_POLLING.intervalMs,
    };
  } catch {
    return DEFAULT_POLLING;
  }
}

export interface SatpPollingContextValue extends SatpPollingSettings {
  setPaused: (paused: boolean) => void;
  setIntervalMs: (intervalMs: number) => void;
}

const SatpPollingContext = createContext<SatpPollingContextValue | null>(null);

export function SatpPollingProvider({
  storageKey,
  children,
}: {
  /** localStorage key; omit to keep the settings in memory only. */
  storageKey?: string;
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<SatpPollingSettings>(() => {
    if (!storageKey) {
      return DEFAULT_POLLING;
    }
    try {
      return parseStoredPolling(localStorage.getItem(storageKey));
    } catch {
      return DEFAULT_POLLING;
    }
  });

  const update = useCallback(
    (patch: Partial<SatpPollingSettings>) => {
      setSettings((previous) => {
        const next = { ...previous, ...patch };
        if (storageKey) {
          try {
            localStorage.setItem(storageKey, JSON.stringify(next));
          } catch {
            // Keep the in-memory setting only.
          }
        }
        return next;
      });
    },
    [storageKey],
  );

  const setPaused = useCallback(
    (paused: boolean) => update({ paused }),
    [update],
  );
  const setIntervalMs = useCallback(
    (intervalMs: number) => {
      if (
        (POLL_INTERVAL_CHOICES_MS as readonly number[]).includes(intervalMs)
      ) {
        update({ intervalMs });
      }
    },
    [update],
  );

  const value = useMemo(
    () => ({ ...settings, setPaused, setIntervalMs }),
    [settings, setPaused, setIntervalMs],
  );

  return (
    <SatpPollingContext.Provider value={value}>
      {children}
    </SatpPollingContext.Provider>
  );
}

/** Polling settings, or `undefined` outside a provider (built-in defaults apply). */
export function useSatpPolling(): SatpPollingContextValue | undefined {
  return useContext(SatpPollingContext) ?? undefined;
}
