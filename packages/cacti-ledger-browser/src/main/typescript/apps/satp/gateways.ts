/**
 * Pure helpers for the SATP inspector gateway list: which gateways an app
 * instance knows, which one is selected, and how viewer choices are kept.
 *
 * Gateways come from two places:
 * - the app instance options in the config store (`gatewayUrl`,
 *   `counterpartyGatewayUrl`, `gateways`), shared by every viewer, and
 * - gateways a viewer added in their own browser (localStorage).
 *
 * Nothing here has a built-in host or port: an instance only ever talks to
 * gateways that its config or its viewer named.
 */
import { isHttpUrl } from "../../common/utils";
import type {
  SatpAppOptions,
  SatpGatewayEndpoint,
  SatpGatewayOption,
} from "./types";

/** Trims a gateway URL and drops trailing slashes (`http://h:1/` -> `http://h:1`). */
export function normalizeGatewayUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

/** True when both URLs point at the same gateway (case and trailing slash ignored). */
export function sameGatewayUrl(a?: string, b?: string): boolean {
  if (!a || !b) {
    return false;
  }
  return (
    normalizeGatewayUrl(a).toLowerCase() ===
    normalizeGatewayUrl(b).toLowerCase()
  );
}

/**
 * Validates the optional `gateways` app option. Returns an error message for
 * the first invalid entry, or `undefined` when the option is valid (or unset).
 */
export function validateGatewayOptions(gateways: unknown): string | undefined {
  if (gateways === undefined || gateways === null) {
    return undefined;
  }
  if (!Array.isArray(gateways)) {
    return "gateways must be an array of { name?, url, description? } objects";
  }
  for (const [index, entry] of gateways.entries()) {
    if (!entry || typeof entry !== "object") {
      return `gateways[${index}] must be an object`;
    }
    const { url, name, description } = entry as Record<string, unknown>;
    if (typeof url !== "string" || !isHttpUrl(normalizeGatewayUrl(url))) {
      return `gateways[${index}].url must be an absolute http(s) URL`;
    }
    if (name !== undefined && typeof name !== "string") {
      return `gateways[${index}].name must be a string`;
    }
    if (description !== undefined && typeof description !== "string") {
      return `gateways[${index}].description must be a string`;
    }
  }
  return undefined;
}

function configEndpoint(
  index: number,
  option: SatpGatewayOption,
  fallbackName: string,
): SatpGatewayEndpoint {
  const url = normalizeGatewayUrl(option.url);
  return {
    id: `config-${index}`,
    name: option.name?.trim() || fallbackName || url,
    url,
    ...(option.description ? { description: option.description } : {}),
    source: "config",
  };
}

/**
 * Gateways named by the app instance options, primary first, then the
 * counterparty, then the `gateways` list. Invalid URLs and duplicates are
 * dropped (the first occurrence wins).
 */
export function resolveConfiguredGateways(
  options: Pick<
    SatpAppOptions,
    "gatewayUrl" | "counterpartyGatewayUrl" | "gateways"
  >,
): SatpGatewayEndpoint[] {
  const candidates: Array<{ option: SatpGatewayOption; fallback: string }> = [];
  if (options.gatewayUrl) {
    candidates.push({
      option: { url: options.gatewayUrl },
      fallback: "Primary gateway",
    });
  }
  if (options.counterpartyGatewayUrl) {
    candidates.push({
      option: { url: options.counterpartyGatewayUrl },
      fallback: "Counterparty gateway",
    });
  }
  if (Array.isArray(options.gateways)) {
    for (const option of options.gateways) {
      if (option && typeof option.url === "string") {
        candidates.push({ option, fallback: "" });
      }
    }
  }

  const result: SatpGatewayEndpoint[] = [];
  candidates.forEach(({ option, fallback }, index) => {
    const url = normalizeGatewayUrl(option.url);
    if (!isHttpUrl(url) || result.some((gw) => sameGatewayUrl(gw.url, url))) {
      return;
    }
    result.push(configEndpoint(index, option, fallback));
  });
  return result;
}

/**
 * Parses the viewer-added gateways from localStorage. Anything that is not
 * a list of `{ id, name, url }` with an http(s) URL is dropped.
 */
export function parseStoredGateways(raw: string | null): SatpGatewayEndpoint[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter(
        (
          gw,
        ): gw is {
          id: string;
          name: string;
          url: string;
          description?: string;
        } =>
          Boolean(gw) &&
          typeof gw === "object" &&
          typeof gw.id === "string" &&
          typeof gw.name === "string" &&
          typeof gw.url === "string" &&
          isHttpUrl(normalizeGatewayUrl(gw.url)),
      )
      .map((gw) => ({
        id: gw.id,
        name: gw.name,
        url: normalizeGatewayUrl(gw.url),
        ...(typeof gw.description === "string"
          ? { description: gw.description }
          : {}),
        source: "user" as const,
      }));
  } catch {
    return [];
  }
}

/** Config gateways first, then viewer gateways whose URL is not already listed. */
export function mergeGatewayLists(
  configured: SatpGatewayEndpoint[],
  user: SatpGatewayEndpoint[],
): SatpGatewayEndpoint[] {
  const merged = [...configured];
  for (const gw of user) {
    if (!merged.some((existing) => sameGatewayUrl(existing.url, gw.url))) {
      merged.push(gw);
    }
  }
  return merged;
}

/**
 * localStorage keys of one app instance. Scoped by the instance ID so two
 * SATP inspector instances never share (or overwrite) a viewer's choices.
 */
export function gatewayStorageKeys(scope: string) {
  const prefix = `cacti.satp.${scope || "default"}`;
  return {
    userGateways: `${prefix}.gateways`,
    activeGateway: `${prefix}.activeGateway`,
    counterpartyGateway: `${prefix}.counterpartyGateway`,
    polling: `${prefix}.polling`,
  };
}

/**
 * The gateway the views read from. Order: the viewer's stored choice (when
 * still in the gateway list), then the instance's `gatewayUrl`, then the
 * first listed gateway, then `fallbackUrl` (runtime config / default).
 */
export function resolveActiveGatewayUrl(params: {
  stored: string | null | undefined;
  gateways: SatpGatewayEndpoint[];
  configuredUrl?: string;
  fallbackUrl: string;
}): string {
  const { stored, gateways, configuredUrl, fallbackUrl } = params;
  const listed = (url?: string | null) =>
    url ? gateways.find((gw) => sameGatewayUrl(gw.url, url))?.url : undefined;
  return (
    listed(stored) ??
    (configuredUrl && isHttpUrl(normalizeGatewayUrl(configuredUrl))
      ? normalizeGatewayUrl(configuredUrl)
      : undefined) ??
    gateways[0]?.url ??
    fallbackUrl
  );
}

/**
 * Marker stored when the viewer explicitly cleared the counterparty, so the
 * instance's configured counterparty does not come back on reload.
 */
export const COUNTERPARTY_CLEARED = "none";

/**
 * The counterparty gateway. Order: the viewer's stored choice (or their
 * explicit "none"), then the instance's `counterpartyGatewayUrl`. Never the
 * same as the active gateway.
 */
export function resolveCounterpartyGatewayUrl(params: {
  stored: string | null | undefined;
  gateways: SatpGatewayEndpoint[];
  configuredUrl?: string;
  activeGatewayUrl: string;
}): string | undefined {
  const { stored, gateways, configuredUrl, activeGatewayUrl } = params;
  if (stored === COUNTERPARTY_CLEARED) {
    return undefined;
  }
  const listed = (url?: string | null) =>
    url ? gateways.find((gw) => sameGatewayUrl(gw.url, url))?.url : undefined;
  const candidate = listed(stored) ?? listed(configuredUrl);
  return candidate && !sameGatewayUrl(candidate, activeGatewayUrl)
    ? candidate
    : undefined;
}

/**
 * Builds the `options` object to save back to the config store: keeps every
 * other option, keeps the primary `gatewayUrl`, and lists every other gateway
 * in `gateways` (so a reload, or another viewer, sees the same gateways).
 */
export function buildPersistedGatewayOptions(
  options: SatpAppOptions,
  gateways: SatpGatewayEndpoint[],
  counterpartyGatewayUrl?: string,
): SatpAppOptions {
  const primary = normalizeGatewayUrl(options.gatewayUrl);
  const others = gateways.filter(
    (gw) =>
      !sameGatewayUrl(gw.url, primary) &&
      !sameGatewayUrl(gw.url, counterpartyGatewayUrl),
  );
  const next: SatpAppOptions = {
    ...options,
    gatewayUrl: primary,
    counterpartyGatewayUrl: counterpartyGatewayUrl ?? "",
    gateways: others.map((gw) => ({
      name: gw.name,
      url: gw.url,
      ...(gw.description ? { description: gw.description } : {}),
    })),
  };
  return next;
}
