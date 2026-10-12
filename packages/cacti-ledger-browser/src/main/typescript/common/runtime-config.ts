/**
 * Runtime configuration for the Cacti Ledger Browser.
 *
 * Goal: **one build, many environments.** `VITE_*` variables are build-time
 * configuration - vite inlines them into the JavaScript bundle, so changing
 * an endpoint traditionally meant rebuilding the artifact. This module adds a
 * runtime tier on top: `index.html` loads `/config.js` (a tiny static file
 * served next to the bundle) *before* the application bundle, and that file
 * may assign
 *
 * ```js
 * window.__LEDGER_BROWSER_CONFIG__ = { supabaseUrl: "https://..." };
 * ```
 *
 * Resolution order per key (first hit wins):
 *
 * 1. **Runtime override** - `window.__LEDGER_BROWSER_CONFIG__`, validated
 *    per-key (see below); a malformed value is dropped with a single
 *    `console.warn` and the next tier applies.
 * 2. **Build-time env** - the `VITE_*` value inlined into the bundle when it
 *    was built (empty string counts as unset).
 * 3. **Built-in defaults** - local-first: the config store at
 *    `http://localhost:8000` (slim PostgREST profile or the Supabase
 *    all-in-one), a placeholder key (accepted by local profiles) and the
 *    `public` schema.
 *
 * Backward compatibility: when no `/config.js` is deployed (the file 404s,
 * which is harmless for a classic script) or it assigns nothing, resolution
 * is exactly `VITE_*` over defaults - the pre-runtime-config behavior.
 *
 * The runtime file is **operator-supplied untrusted input** (anyone who can
 * serve or replace `/config.js` controls where the app connects), so the
 * same strictness applies as for app-instance options: an allowlist of keys, per-key
 * value validation through the existing `isHttpUrl` boundary for endpoint
 * URLs, and whole-shape degradation to defaults - a malformed
 * `config.js` must degrade with a console warning, never crash the shell.
 */
import { isHttpUrl } from "./utils";

/** Fully resolved configuration consumed by the shell and the apps. */
export interface LedgerBrowserConfig {
  /** Config-store (Supabase) URL; required by the application shell. */
  supabaseUrl: string;
  /** Config-store (Supabase) anon key. */
  supabaseKey: string;
  /** Config-store (Supabase) schema holding `gui_app_config`. */
  supabaseSchema: string;
  /**
   * Optional SATP Inspector gateway fallback - used when an app instance
   * defines no `gatewayUrl` options (e.g. the home-page status card).
   */
  satpGatewayUrl?: string;
  /** Optional SATP Inspector Prometheus fallback. */
  satpPrometheusUrl?: string;
}

/**
 * Keys `/config.js` may override. Everything else in
 * `window.__LEDGER_BROWSER_CONFIG__` is rejected with a warning - this
 * allowlist is also the prototype-pollution guard (`__proto__`,
 * `constructor`, ... are simply not in it, and only own properties are
 * read).
 */
const OVERRIDABLE_KEYS = [
  "supabaseUrl",
  "supabaseKey",
  "supabaseSchema",
  "satpGatewayUrl",
  "satpPrometheusUrl",
] as const;

type OverridableKey = (typeof OVERRIDABLE_KEYS)[number];

/** Endpoint-URL keys: overrides must pass the strict `isHttpUrl` check. */
const URL_KEYS: readonly OverridableKey[] = [
  "supabaseUrl",
  "satpGatewayUrl",
  "satpPrometheusUrl",
];

/** Mapping to the build-time env var each key falls back to. */
const CONFIG_KEY_TO_ENV: Record<OverridableKey, string> = {
  supabaseUrl: "VITE_SUPABASE_URL",
  supabaseKey: "VITE_SUPABASE_KEY",
  supabaseSchema: "VITE_SUPABASE_SCHEMA",
  satpGatewayUrl: "VITE_SATP_GATEWAY_URL",
  satpPrometheusUrl: "VITE_SATP_PROMETHEUS_URL",
};

/**
 * Tier-3 defaults, local-first: with no `/config.js` and no env, a bundle
 * points at `http://localhost:8000` - the port shared by the slim
 * Postgres+PostgREST profile (`tools/docker/ledger-browser-config-postgrest`)
 * and the Supabase all-in-one container - so the documented local quickstart
 * works with zero configuration. Deployments override via `config.js` or
 * `VITE_*` env (the key stays a placeholder: local profiles accept any
 * value, real Supabase requires the real key, and a wrong key fails
 * visibly in the connection dialog instead of silently).
 */
const BUILT_IN_DEFAULTS: LedgerBrowserConfig = {
  supabaseUrl: "http://localhost:8000",
  supabaseKey: "__SUPABASE_KEY__",
  supabaseSchema: "public",
  satpGatewayUrl: undefined,
  satpPrometheusUrl: undefined,
};

/**
 * Supabase schema names are handed to the config-store client and end up in
 * query paths, so a runtime override must be a plain ASCII identifier.
 */
const SCHEMA_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Log prefix so operators can trace warnings back to `config.js`. */
const WARN_PREFIX = "[cacti-ledger-browser]";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Per-key validation of a runtime **string** override. Returns a rejection
 * reason, or `undefined` when the value may be applied.
 *
 * - endpoint keys (`supabaseUrl`, `satpGatewayUrl`, `satpPrometheusUrl`)
 *   must be strict absolute `http(s)` URLs - `isHttpUrl` rejects embedded
 *   credentials, non-hypertext schemes, control/whitespace characters and
 *   non-ASCII homoglyph hosts;
 * - `supabaseKey` must be non-empty and without surrounding whitespace
 *   (padding is a copy-paste error that would produce a key that silently
 *   never authenticates);
 * - `supabaseSchema` must match {@link SCHEMA_NAME_PATTERN}.
 */
function overrideRejectionReason(
  key: OverridableKey,
  value: string,
): string | undefined {
  if (URL_KEYS.includes(key)) {
    if (!isHttpUrl(value)) {
      return "must be a well-formed absolute http(s) URL without embedded credentials";
    }
    return undefined;
  }
  if (key === "supabaseKey") {
    if (value.trim() === "") {
      return "must not be empty";
    }
    if (value !== value.trim()) {
      return "must not have leading/trailing whitespace";
    }
    return undefined;
  }
  // key === "supabaseSchema"
  if (!SCHEMA_NAME_PATTERN.test(value)) {
    return "must be an ASCII identifier ([A-Za-z_][A-Za-z0-9_]*)";
  }
  return undefined;
}

/**
 * Resolve the effective configuration from the three tiers. Pure function
 * (both inputs explicit) so the precedence and validation rules are
 * directly testable; the app uses {@link getLedgerBrowserConfig}.
 *
 * @param runtimeRaw value of `window.__LEDGER_BROWSER_CONFIG__` (or
 *        `undefined` when no `/config.js` ran).
 * @param env build-time environment (`import.meta.env` in the bundle).
 * @param warn warning sink (defaults to `console.warn`; injected by tests).
 */
export function resolveLedgerBrowserConfig(
  runtimeRaw: unknown,
  env: Record<string, string | undefined>,
  warn: (message: string) => void = console.warn,
): LedgerBrowserConfig {
  const overrides: Partial<LedgerBrowserConfig> = {};

  if (runtimeRaw !== undefined) {
    if (!isPlainObject(runtimeRaw)) {
      warn(
        `${WARN_PREFIX} ignoring runtime configuration from /config.js: ` +
          `expected an object, got ${runtimeRaw === null ? "null" : typeof runtimeRaw}. ` +
          "Falling back to build-time values.",
      );
    } else {
      const knownKeys = new Set<string>(OVERRIDABLE_KEYS);
      // Only own properties are read, so a crafted prototype chain cannot
      // smuggle values in; keys outside the allowlist only earn a warning.
      for (const [key, value] of Object.entries(runtimeRaw)) {
        if (!knownKeys.has(key)) {
          warn(
            `${WARN_PREFIX} ignoring unknown runtime configuration key ` +
              `"${key}" in /config.js (known keys: ${OVERRIDABLE_KEYS.join(", ")}).`,
          );
          continue;
        }
        if (typeof value !== "string") {
          warn(
            `${WARN_PREFIX} ignoring runtime configuration key "${key}" ` +
              `in /config.js: must be a string (got ${JSON.stringify(value)}).`,
          );
          continue;
        }
        const rejection = overrideRejectionReason(key as OverridableKey, value);
        if (rejection !== undefined) {
          warn(
            `${WARN_PREFIX} ignoring runtime configuration key "${key}" ` +
              `in /config.js: ${rejection} (got ${JSON.stringify(value)}).`,
          );
          continue;
        }
        overrides[key as OverridableKey] = value;
      }
    }
  }

  const config: LedgerBrowserConfig = { ...BUILT_IN_DEFAULTS };
  for (const key of OVERRIDABLE_KEYS) {
    const override = overrides[key];
    const envValue = env[CONFIG_KEY_TO_ENV[key]];
    // Empty env strings count as unset (`""` would never be a meaningful
    // value for any of these keys). Endpoint keys get the same validation
    // as runtime overrides: a non-URL env value (e.g. a leftover
    // `.env.template` placeholder like `__SUPABSE_URL__`) is dropped with
    // a warning instead of being handed to the HTTP client as a URL.
    let tier: string | undefined;
    if (override !== undefined) {
      tier = override;
    } else if (envValue !== undefined && envValue !== "") {
      if (URL_KEYS.includes(key) && !isHttpUrl(envValue)) {
        warn(
          `${WARN_PREFIX} ignoring build-time environment variable ` +
            `"${CONFIG_KEY_TO_ENV[key]}": must be a well-formed absolute ` +
            `http(s) URL (got ${JSON.stringify(envValue)}). ` +
            "Using the built-in default instead.",
        );
      } else {
        tier = envValue;
      }
    }
    if (tier !== undefined) {
      config[key] = tier;
    }
  }
  return config;
}

/**
 * Global assigned by `/config.js` (loaded by `index.html` before the
 * bundle). Typed `unknown` on purpose: the file is untrusted input and
 * {@link resolveLedgerBrowserConfig} is what narrows it.
 */
declare global {
  interface Window {
    __LEDGER_BROWSER_CONFIG__?: unknown;
  }
}

let cachedConfig: LedgerBrowserConfig | undefined;

/**
 * Get the resolved configuration. The runtime tier cannot change after the
 * bundle started executing (`/config.js` runs before it), so the result is
 * computed once and cached.
 */
export function getLedgerBrowserConfig(): LedgerBrowserConfig {
  if (cachedConfig === undefined) {
    cachedConfig = resolveLedgerBrowserConfig(
      typeof window === "undefined"
        ? undefined
        : window.__LEDGER_BROWSER_CONFIG__,
      import.meta.env as unknown as Record<string, string | undefined>,
    );
  }
  return cachedConfig;
}

/**
 * Reset the {@link getLedgerBrowserConfig} cache. Test-only hook for
 * controlling `window.__LEDGER_BROWSER_CONFIG__` between cases.
 */
export function resetLedgerBrowserConfigCacheForTests(): void {
  cachedConfig = undefined;
}
