import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { isHttpUrl } from "../../../common/utils";
import {
  COUNTERPARTY_CLEARED,
  gatewayStorageKeys,
  mergeGatewayLists,
  normalizeGatewayUrl,
  parseStoredGateways,
  resolveActiveGatewayUrl,
  resolveConfiguredGateways,
  resolveCounterpartyGatewayUrl,
  sameGatewayUrl,
} from "../gateways";
import type { SatpAppOptions, SatpGatewayEndpoint } from "../types";

export interface SatpGatewayContextValue {
  /** ID of the app instance this gateway list belongs to. */
  appInstanceId?: string;
  /** The gateway the views read from. */
  activeGatewayUrl: string;
  /** The other side of the transfer, when one is selected. */
  counterpartyGatewayUrl: string | undefined;
  /** Every gateway known to this instance: config gateways first. */
  gateways: SatpGatewayEndpoint[];
  setActiveGatewayUrl: (url: string) => void;
  setCounterpartyGatewayUrl: (url: string | undefined) => void;
  /** Adds a viewer gateway (this browser only). False for an invalid URL. */
  addGateway: (gateway: {
    name: string;
    url: string;
    description?: string;
  }) => boolean;
  /** Removes a viewer gateway. Config gateways are edited in the app config. */
  removeGateway: (id: string) => void;
  /** Drops this browser's gateways and choices for this instance. */
  resetToDefaults: () => void;
}

const SatpGatewayContext = createContext<SatpGatewayContextValue | null>(null);

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
  } catch {
    // Storage can be unavailable (private mode, blocked site data). The
    // in-memory state still works for this visit.
  }
}

export interface SatpGatewayProviderProps {
  /**
   * App instance ID. Scopes the stored viewer choices, so two inspector
   * instances never overwrite each other's gateway selection.
   */
  appInstanceId?: string;
  /** Instance options from the config store (the configured gateways). */
  options?: Pick<
    SatpAppOptions,
    "gatewayUrl" | "counterpartyGatewayUrl" | "gateways"
  >;
  /** Used only when the instance names no gateway at all. */
  fallbackGatewayUrl?: string;
  children: React.ReactNode;
}

export function SatpGatewayProvider({
  appInstanceId,
  options,
  fallbackGatewayUrl = "",
  children,
}: SatpGatewayProviderProps) {
  const keys = useMemo(
    () => gatewayStorageKeys(appInstanceId ?? ""),
    [appInstanceId],
  );

  const configured = useMemo(
    () =>
      resolveConfiguredGateways({
        gatewayUrl: options?.gatewayUrl ?? "",
        counterpartyGatewayUrl: options?.counterpartyGatewayUrl,
        gateways: options?.gateways,
      }),
    [options?.gatewayUrl, options?.counterpartyGatewayUrl, options?.gateways],
  );

  const [userGateways, setUserGateways] = useState<SatpGatewayEndpoint[]>(() =>
    parseStoredGateways(readStorage(keys.userGateways)),
  );
  const [storedActive, setStoredActive] = useState<string | null>(() =>
    readStorage(keys.activeGateway),
  );
  const [storedCounterparty, setStoredCounterparty] = useState<string | null>(
    () => readStorage(keys.counterpartyGateway),
  );

  const gateways = useMemo(
    () => mergeGatewayLists(configured, userGateways),
    [configured, userGateways],
  );

  const activeGatewayUrl = resolveActiveGatewayUrl({
    stored: storedActive,
    gateways,
    configuredUrl: options?.gatewayUrl,
    fallbackUrl: fallbackGatewayUrl,
  });

  const counterpartyGatewayUrl = resolveCounterpartyGatewayUrl({
    stored: storedCounterparty,
    gateways,
    configuredUrl: options?.counterpartyGatewayUrl,
    activeGatewayUrl,
  });

  const setActiveGatewayUrl = useCallback(
    (url: string) => {
      const normalized = normalizeGatewayUrl(url);
      if (!isHttpUrl(normalized)) {
        return;
      }
      setStoredActive(normalized);
      writeStorage(keys.activeGateway, normalized);
    },
    [keys],
  );

  const setCounterpartyGatewayUrl = useCallback(
    (url: string | undefined) => {
      if (url === undefined || url === "") {
        setStoredCounterparty(COUNTERPARTY_CLEARED);
        writeStorage(keys.counterpartyGateway, COUNTERPARTY_CLEARED);
        return;
      }
      const normalized = normalizeGatewayUrl(url);
      if (!isHttpUrl(normalized)) {
        return;
      }
      setStoredCounterparty(normalized);
      writeStorage(keys.counterpartyGateway, normalized);
    },
    [keys],
  );

  const addGateway = useCallback(
    (gateway: { name: string; url: string; description?: string }) => {
      const url = normalizeGatewayUrl(gateway.url);
      if (!isHttpUrl(url)) {
        return false;
      }
      const endpoint: SatpGatewayEndpoint = {
        id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: gateway.name.trim() || url,
        url,
        ...(gateway.description?.trim()
          ? { description: gateway.description.trim() }
          : {}),
        source: "user",
      };
      setUserGateways((previous) => {
        const next = [
          ...previous.filter((gw) => !sameGatewayUrl(gw.url, url)),
          endpoint,
        ];
        writeStorage(keys.userGateways, JSON.stringify(next));
        return next;
      });
      return true;
    },
    [keys],
  );

  const removeGateway = useCallback(
    (id: string) => {
      setUserGateways((previous) => {
        const next = previous.filter((gw) => gw.id !== id);
        writeStorage(keys.userGateways, JSON.stringify(next));
        return next;
      });
    },
    [keys],
  );

  const resetToDefaults = useCallback(() => {
    setUserGateways([]);
    setStoredActive(null);
    setStoredCounterparty(null);
    writeStorage(keys.userGateways, null);
    writeStorage(keys.activeGateway, null);
    writeStorage(keys.counterpartyGateway, null);
  }, [keys]);

  const value = useMemo<SatpGatewayContextValue>(
    () => ({
      appInstanceId,
      activeGatewayUrl,
      counterpartyGatewayUrl,
      gateways,
      setActiveGatewayUrl,
      setCounterpartyGatewayUrl,
      addGateway,
      removeGateway,
      resetToDefaults,
    }),
    [
      appInstanceId,
      activeGatewayUrl,
      counterpartyGatewayUrl,
      gateways,
      setActiveGatewayUrl,
      setCounterpartyGatewayUrl,
      addGateway,
      removeGateway,
      resetToDefaults,
    ],
  );

  return (
    <SatpGatewayContext.Provider value={value}>
      {children}
    </SatpGatewayContext.Provider>
  );
}

/**
 * Gateway context of the enclosing SATP app instance. Outside a provider
 * (isolated component tests) it returns an empty, read-only list.
 */
export function useSatpGatewayContext(): SatpGatewayContextValue {
  return useContext(SatpGatewayContext) ?? EMPTY_GATEWAY_CONTEXT;
}

export function useSatpGatewayContextSafe():
  | SatpGatewayContextValue
  | undefined {
  return useContext(SatpGatewayContext) ?? undefined;
}

const EMPTY_GATEWAY_CONTEXT: SatpGatewayContextValue = {
  activeGatewayUrl: "",
  counterpartyGatewayUrl: undefined,
  gateways: [],
  setActiveGatewayUrl: () => undefined,
  setCounterpartyGatewayUrl: () => undefined,
  addGateway: () => false,
  removeGateway: () => undefined,
  resetToDefaults: () => undefined,
};
