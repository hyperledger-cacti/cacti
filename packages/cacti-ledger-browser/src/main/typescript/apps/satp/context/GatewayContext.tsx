import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";
import { SatpGatewayEndpoint } from "../types";
import { isHttpUrl } from "../../../common/utils";

export const SATP_DEFAULT_PRESETS: SatpGatewayEndpoint[] = [
  {
    id: "default-local-4010",
    name: "Default Local Gateway",
    url: "http://localhost:4010",
    description: "Standard local SATP Hermes gateway OAPI server",
    isDefault: true,
  },
  {
    id: "example-gateway-1",
    name: "Hermes Gateway 1 (Origin)",
    url: "http://localhost:3013",
    description: "Bundled example SATP sender gateway",
  },
  {
    id: "example-gateway-2",
    name: "Hermes Gateway 2 (Destination)",
    url: "http://localhost:3014",
    description: "Bundled example SATP receiver gateway",
  },
  {
    id: "cbdc-besu-gateway",
    name: "CBDC Besu Gateway (Origin)",
    url: "http://localhost:4010",
    description: "Cacti CBDC Bridging demo Besu ledger gateway",
  },
  {
    id: "cbdc-fabric-gateway",
    name: "CBDC Fabric Gateway (Destination)",
    url: "http://localhost:4020",
    description: "Cacti CBDC Bridging demo Fabric ledger gateway",
  },
];

const STORAGE_KEY_CUSTOM_GATEWAYS = "cacti_satp_custom_gateways";
const STORAGE_KEY_ACTIVE_GATEWAY = "cacti_satp_active_gateway";
const STORAGE_KEY_COUNTERPARTY_GATEWAY = "cacti_satp_counterparty_gateway";

export interface SatpGatewayContextValue {
  activeGatewayUrl: string;
  counterpartyGatewayUrl: string | undefined;
  gateways: SatpGatewayEndpoint[];
  setActiveGatewayUrl: (url: string) => void;
  setCounterpartyGatewayUrl: (url: string | undefined) => void;
  addGateway: (gateway: {
    name: string;
    url: string;
    description?: string;
  }) => boolean;
  removeGateway: (id: string) => void;
  loadCbdcPresets: () => void;
  resetToDefaults: () => void;
}

const SatpGatewayContext = createContext<SatpGatewayContextValue | null>(null);

export interface SatpGatewayProviderProps {
  initialGatewayUrl?: string;
  initialCounterpartyGatewayUrl?: string;
  children: React.ReactNode;
}

export function SatpGatewayProvider({
  initialGatewayUrl,
  initialCounterpartyGatewayUrl,
  children,
}: SatpGatewayProviderProps) {
  // Load custom gateways from localStorage
  const [customGateways, setCustomGateways] = useState<SatpGatewayEndpoint[]>(
    () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_CUSTOM_GATEWAYS);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            return parsed.filter(
              (g) => g && typeof g.url === "string" && isHttpUrl(g.url),
            );
          }
        }
      } catch {
        // ignore storage error
      }
      return [];
    },
  );

  // Active gateway URL
  const [activeGatewayUrl, setActiveGatewayUrlState] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ACTIVE_GATEWAY);
      if (stored && isHttpUrl(stored)) {
        return stored;
      }
    } catch {
      // ignore storage error
    }
    return initialGatewayUrl || "http://localhost:4010";
  });

  // Counterparty gateway URL
  const [counterpartyGatewayUrl, setCounterpartyGatewayUrlState] = useState<
    string | undefined
  >(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_COUNTERPARTY_GATEWAY);
      if (stored && isHttpUrl(stored)) {
        return stored;
      }
    } catch {
      // ignore storage error
    }
    return initialCounterpartyGatewayUrl;
  });

  // Combine default presets and custom gateways
  const gateways = useMemo(() => {
    const customUrls = new Set(customGateways.map((g) => g.url.toLowerCase()));
    const nonDuplicatedPresets = SATP_DEFAULT_PRESETS.filter(
      (preset) => !customUrls.has(preset.url.toLowerCase()),
    );
    return [...nonDuplicatedPresets, ...customGateways];
  }, [customGateways]);

  const setActiveGatewayUrl = useCallback((url: string) => {
    if (!isHttpUrl(url)) {
      return;
    }
    setActiveGatewayUrlState(url);
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_GATEWAY, url);
    } catch {
      // ignore
    }
  }, []);

  const setCounterpartyGatewayUrl = useCallback((url: string | undefined) => {
    if (url && !isHttpUrl(url)) {
      return;
    }
    setCounterpartyGatewayUrlState(url);
    try {
      if (url) {
        localStorage.setItem(STORAGE_KEY_COUNTERPARTY_GATEWAY, url);
      } else {
        localStorage.removeItem(STORAGE_KEY_COUNTERPARTY_GATEWAY);
      }
    } catch {
      // ignore
    }
  }, []);

  const addGateway = useCallback(
    (gateway: { name: string; url: string; description?: string }): boolean => {
      const trimmedUrl = gateway.url.trim().replace(/\/+$/, "");
      if (!isHttpUrl(trimmedUrl)) {
        return false;
      }

      const newEndpoint: SatpGatewayEndpoint = {
        id: `custom-gateway-${Date.now()}`,
        name: gateway.name.trim() || trimmedUrl,
        url: trimmedUrl,
        description: gateway.description?.trim(),
      };

      setCustomGateways((prev) => {
        const next = [...prev.filter((g) => g.url !== trimmedUrl), newEndpoint];
        try {
          localStorage.setItem(
            STORAGE_KEY_CUSTOM_GATEWAYS,
            JSON.stringify(next),
          );
        } catch {
          // ignore
        }
        return next;
      });

      return true;
    },
    [],
  );

  const removeGateway = useCallback((id: string) => {
    setCustomGateways((prev) => {
      const next = prev.filter((g) => g.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY_CUSTOM_GATEWAYS, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const loadCbdcPresets = useCallback(() => {
    setActiveGatewayUrl("http://localhost:4010");
    setCounterpartyGatewayUrl("http://localhost:4020");
  }, [setActiveGatewayUrl, setCounterpartyGatewayUrl]);

  const resetToDefaults = useCallback(() => {
    setActiveGatewayUrl("http://localhost:4010");
    setCounterpartyGatewayUrl(undefined);
    setCustomGateways([]);
    try {
      localStorage.removeItem(STORAGE_KEY_CUSTOM_GATEWAYS);
      localStorage.removeItem(STORAGE_KEY_ACTIVE_GATEWAY);
      localStorage.removeItem(STORAGE_KEY_COUNTERPARTY_GATEWAY);
    } catch {
      // ignore
    }
  }, [setActiveGatewayUrl, setCounterpartyGatewayUrl]);

  const value = useMemo(
    () => ({
      activeGatewayUrl,
      counterpartyGatewayUrl,
      gateways,
      setActiveGatewayUrl,
      setCounterpartyGatewayUrl,
      addGateway,
      removeGateway,
      loadCbdcPresets,
      resetToDefaults,
    }),
    [
      activeGatewayUrl,
      counterpartyGatewayUrl,
      gateways,
      setActiveGatewayUrl,
      setCounterpartyGatewayUrl,
      addGateway,
      removeGateway,
      loadCbdcPresets,
      resetToDefaults,
    ],
  );

  return (
    <SatpGatewayContext.Provider value={value}>
      {children}
    </SatpGatewayContext.Provider>
  );
}

export const DEFAULT_GATEWAY_CONTEXT_VALUE: SatpGatewayContextValue = {
  activeGatewayUrl: "http://localhost:4010",
  counterpartyGatewayUrl: undefined,
  gateways: SATP_DEFAULT_PRESETS,
  setActiveGatewayUrl: () => {},
  setCounterpartyGatewayUrl: () => {},
  addGateway: () => false,
  removeGateway: () => {},
  loadCbdcPresets: () => {},
  resetToDefaults: () => {},
};

export function useSatpGatewayContext(): SatpGatewayContextValue {
  const context = useContext(SatpGatewayContext);
  return context ?? DEFAULT_GATEWAY_CONTEXT_VALUE;
}

export function useSatpGatewayContextSafe():
  | SatpGatewayContextValue
  | undefined {
  const context = useContext(SatpGatewayContext);
  return context ?? undefined;
}
