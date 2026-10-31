/**
 * Tests for the runtime configuration tier (`common/runtime-config.ts`):
 * one production build serving many environments via `/config.js`.
 *
 * Invariants (see the module doc comment):
 *
 * - precedence per key: runtime override > build-time `VITE_*` env >
 *   built-in defaults;
 * - `/config.js` is operator-supplied untrusted input: an allowlist of
 *   keys, per-key validation (strict `isHttpUrl` for endpoints) and
 *   whole-shape degradation - a malformed config must degrade to the
 *   build-time values with a console warning, never crash the shell;
 * - backward compatibility: no `window.__LEDGER_BROWSER_CONFIG__` (no
 *   `/config.js` deployed) behaves exactly as the pre-runtime-config app.
 *
 * No network access happens in this suite.
 */
import { readFileSync } from "node:fs";
import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getLedgerBrowserConfig,
  resetLedgerBrowserConfigCacheForTests,
  resolveLedgerBrowserConfig,
} from "../../../main/typescript/common/runtime-config";
import { useSatpOptions } from "../../../main/typescript/apps/satp/hooks";
import { DEFAULT_SATP_GATEWAY_URL } from "../../../main/typescript/apps/satp/hooks";

/** Build-time env as found in a bundle built from `.env.template`. */
const TEMPLATE_ENV = {
  VITE_SUPABASE_URL: "http://env-store:8000",
  VITE_SUPABASE_KEY: "__SUPABASE_KEY__",
  VITE_SUPABASE_SCHEMA: "public",
};

/** Warnings sink: every resolved-config warning must be accounted for. */
const makeWarn = () => vi.fn<(message: string) => void>();

/**
 * A developer's local `.env` may itself contain non-URL values (e.g. a
 * leftover template placeholder), which the resolver legitimately warns
 * about at the build-time tier. Assertions about *runtime-tier* warning
 * behavior must therefore filter for their own message pattern instead of
 * counting all warnings.
 */
function runtimeWarnCalls(warnSpy: ReturnType<typeof vi.spyOn>) {
  return warnSpy.mock.calls.filter((call: unknown[]) =>
    /ignoring runtime configuration/.test(String(call[0])),
  );
}

describe("resolveLedgerBrowserConfig - precedence", () => {
  it("runtime config overrides build-time env for every key", () => {
    const config = resolveLedgerBrowserConfig(
      {
        supabaseUrl: "https://runtime-supabase.example.co",
        supabaseKey: "runtime-anon-key",
        supabaseSchema: "runtime_schema",
        satpGatewayUrl: "http://runtime-gateway:4010",
        satpPrometheusUrl: "http://runtime-prometheus:9090",
      },
      {
        ...TEMPLATE_ENV,
        VITE_SATP_GATEWAY_URL: "http://env-gateway:4010",
        VITE_SATP_PROMETHEUS_URL: "http://env-prometheus:9090",
      },
      makeWarn(),
    );

    expect(config).toEqual({
      supabaseUrl: "https://runtime-supabase.example.co",
      supabaseKey: "runtime-anon-key",
      supabaseSchema: "runtime_schema",
      satpGatewayUrl: "http://runtime-gateway:4010",
      satpPrometheusUrl: "http://runtime-prometheus:9090",
    });
  });

  it("build-time env beats built-in defaults; unset env falls to defaults", () => {
    const config = resolveLedgerBrowserConfig(
      undefined,
      {
        VITE_SUPABASE_URL: "https://env-supabase.example.co",
        VITE_SATP_GATEWAY_URL: "http://env-gateway:4010",
      },
      makeWarn(),
    );

    expect(config.supabaseUrl).toBe("https://env-supabase.example.co");
    expect(config.satpGatewayUrl).toBe("http://env-gateway:4010");
    // Env did not set these: template placeholders / absent optional keys.
    expect(config.supabaseKey).toBe("__SUPABASE_KEY__");
    expect(config.supabaseSchema).toBe("public");
    expect(config.satpPrometheusUrl).toBeUndefined();
  });

  it("no runtime config and no env resolves to local-first defaults", () => {
    const config = resolveLedgerBrowserConfig(undefined, {}, makeWarn());

    expect(config).toEqual({
      supabaseUrl: "http://localhost:8000",
      supabaseKey: "__SUPABASE_KEY__",
      supabaseSchema: "public",
      satpGatewayUrl: undefined,
      satpPrometheusUrl: undefined,
    });
  });

  it("partial runtime overrides leave other keys on their env/default tiers", () => {
    const config = resolveLedgerBrowserConfig(
      { satpGatewayUrl: "http://runtime-gateway:4010" },
      {
        ...TEMPLATE_ENV,
        VITE_SATP_PROMETHEUS_URL: "http://env-prometheus:9090",
      },
      makeWarn(),
    );

    expect(config.supabaseUrl).toBe("http://env-store:8000");
    expect(config.supabaseSchema).toBe("public");
    expect(config.satpGatewayUrl).toBe("http://runtime-gateway:4010");
    expect(config.satpPrometheusUrl).toBe("http://env-prometheus:9090");
  });

  it("empty-string env values count as unset", () => {
    const config = resolveLedgerBrowserConfig(
      undefined,
      { VITE_SUPABASE_URL: "", VITE_SUPABASE_SCHEMA: "" },
      makeWarn(),
    );

    expect(config.supabaseUrl).toBe("http://localhost:8000");
    expect(config.supabaseSchema).toBe("public");
  });

  it("a non-URL build-time env value counts as unset and warns", () => {
    // A stale .env created from an old template (or any garbage in
    // VITE_SUPABASE_URL) must degrade to the built-in default instead of
    // being handed to supabase-js as a URL.
    const warn = makeWarn();
    const config = resolveLedgerBrowserConfig(
      undefined,
      {
        VITE_SUPABASE_URL: "__SUPABSE_URL__",
        VITE_SATP_GATEWAY_URL: "not a url at all",
        VITE_SUPABASE_KEY: "real-key",
      },
      warn,
    );

    expect(config.supabaseUrl).toBe("http://localhost:8000");
    expect(config.satpGatewayUrl).toBeUndefined();
    expect(config.supabaseKey).toBe("real-key");
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[0][0]).toMatch(/VITE_SUPABASE_URL/);
    expect(warn.mock.calls[1][0]).toMatch(/VITE_SATP_GATEWAY_URL/);
  });

  it("an empty runtime config object overrides nothing and does not warn", () => {
    const warn = makeWarn();
    const config = resolveLedgerBrowserConfig({}, TEMPLATE_ENV, warn);

    expect(config.supabaseUrl).toBe("http://env-store:8000");
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("resolveLedgerBrowserConfig - untrusted input handling", () => {
  it("degrades to build-time values for non-object runtime configs", () => {
    for (const malformed of [
      null,
      "http://runtime-gateway:4010",
      42,
      true,
      ["http://runtime-gateway:4010"],
      () => undefined,
    ]) {
      const warn = makeWarn();
      const config = resolveLedgerBrowserConfig(
        malformed,
        { ...TEMPLATE_ENV, VITE_SATP_GATEWAY_URL: "http://env-gateway:4010" },
        warn,
      );

      // Never a throw, never a partial application: everything falls back.
      expect(config.supabaseUrl).toBe("http://env-store:8000");
      expect(config.satpGatewayUrl).toBe("http://env-gateway:4010");
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toMatch(
        /ignoring runtime configuration.*expected an object/,
      );
    }
  });

  it("ignores unknown keys with a warning (allowlist)", () => {
    const warn = makeWarn();
    const config = resolveLedgerBrowserConfig(
      {
        satpGatewayUrl: "http://runtime-gateway:4010",
        evilEndpoint: "http://attacker.example",
      },
      TEMPLATE_ENV,
      warn,
    );

    expect(config.satpGatewayUrl).toBe("http://runtime-gateway:4010");
    expect(
      (config as unknown as Record<string, unknown>)["evilEndpoint"],
    ).toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(
      /unknown runtime configuration key "evilEndpoint"/,
    );
  });

  it("ignores prototype-pollution keys without inheriting anything", () => {
    // What a hostile config.js (or a naive JSON pipeline) could send.
    const hostile = JSON.parse(
      `{"__proto__": {"polluted": "yes"}, "constructor": {"prototype": {"polluted": "yes"}}, "satpGatewayUrl": "http://ok-gateway:4010"}`,
    );
    const warn = makeWarn();
    const config = resolveLedgerBrowserConfig(hostile, TEMPLATE_ENV, warn);

    expect(config.satpGatewayUrl).toBe("http://ok-gateway:4010");
    expect(
      (config as unknown as Record<string, unknown>).polluted,
    ).toBeUndefined();
    // The resolved config stays a plain object.
    expect(Object.getPrototypeOf(config)).toBe(Object.prototype);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("drops invalid endpoint URLs but keeps valid sibling overrides", () => {
    const warn = makeWarn();
    const config = resolveLedgerBrowserConfig(
      {
        supabaseUrl: "https://good-supabase.example.co",
        satpGatewayUrl: "javascript:alert(1)",
        satpPrometheusUrl: "https://user:pass@prometheus.example.co",
      },
      { ...TEMPLATE_ENV, VITE_SATP_GATEWAY_URL: "http://env-gateway:4010" },
      warn,
    );

    expect(config.supabaseUrl).toBe("https://good-supabase.example.co");
    // Dropped override -> build-time tier applies for the gateway.
    expect(config.satpGatewayUrl).toBe("http://env-gateway:4010");
    expect(config.satpPrometheusUrl).toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("rejects endpoint URLs the WHATWG parser would launder", () => {
    const badUrls = [
      " http://padded-gateway:4010 ", // whitespace the parser trims
      "http://gateway\t.example.co", // embedded tab
      "localhost:4010", // scheme-less
      "//gateway.example.co", // protocol-relative
      "ftp://gateway.example.co", // non-hypertext scheme
      "https://gаteway.example.co", // Cyrillic homoglyph host
      "https://gateway.example.co:\\4010", // backslash
    ];
    for (const bad of badUrls) {
      const warn = makeWarn();
      const config = resolveLedgerBrowserConfig(
        { satpGatewayUrl: bad },
        TEMPLATE_ENV,
        warn,
      );

      expect(config.satpGatewayUrl).toBeUndefined();
      expect(warn).toHaveBeenCalledTimes(1);
    }
  });

  it("rejects non-string override values", () => {
    const warn = makeWarn();
    const config = resolveLedgerBrowserConfig(
      {
        supabaseUrl: 123,
        supabaseKey: null,
        satpGatewayUrl: { href: "http://x" },
      },
      TEMPLATE_ENV,
      warn,
    );

    expect(config.supabaseUrl).toBe("http://env-store:8000");
    expect(config.supabaseKey).toBe("__SUPABASE_KEY__");
    expect(config.satpGatewayUrl).toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(3);
    for (const call of warn.mock.calls) {
      expect(call[0]).toMatch(/must be a string/);
    }
  });

  it("validates the supabase key (non-empty, unpadded)", () => {
    const warn = makeWarn();
    const config = resolveLedgerBrowserConfig(
      { supabaseKey: " padded-key ", satpPrometheusUrl: "" },
      TEMPLATE_ENV,
      warn,
    );

    expect(config.supabaseKey).toBe("__SUPABASE_KEY__");
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("validates the supabase schema as an ASCII identifier", () => {
    const warn = makeWarn();
    const ok = resolveLedgerBrowserConfig(
      { supabaseSchema: "tenant_prod" },
      TEMPLATE_ENV,
      warn,
    );
    expect(ok.supabaseSchema).toBe("tenant_prod");

    for (const bad of [
      "1abc",
      "has space",
      "drop;--",
      'public"',
      "sch\u00e9ma",
    ]) {
      const config = resolveLedgerBrowserConfig(
        { supabaseSchema: bad },
        TEMPLATE_ENV,
        makeWarn(),
      );
      expect(config.supabaseSchema).toBe("public");
    }
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("getLedgerBrowserConfig - accessor", () => {
  beforeEach(() => {
    resetLedgerBrowserConfigCacheForTests();
  });

  afterEach(() => {
    delete (window as { __LEDGER_BROWSER_CONFIG__?: unknown })
      .__LEDGER_BROWSER_CONFIG__;
    resetLedgerBrowserConfigCacheForTests();
  });

  /**
   * The accessor resolves whatever `import.meta.env` this test bundle was
   * loaded with (a developer's local `.env` may define `VITE_*` values), so
   * these tests assert against the same env snapshot instead of fixed
   * literals - what must hold everywhere is the no-override equivalence
   * and the warning behavior, not particular values.
   */
  const testEnv = import.meta.env as unknown as Record<
    string,
    string | undefined
  >;

  it("without a runtime global it resolves the build-time tier without runtime warnings", () => {
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    try {
      expect(getLedgerBrowserConfig()).toEqual(
        resolveLedgerBrowserConfig(undefined, testEnv),
      );
      // No runtime overrides -> no runtime-tier warnings. (A developer's
      // local .env may legitimately earn build-time-tier warnings; see the
      // runtimeWarnCalls helper.)
      expect(runtimeWarnCalls(warnSpy)).toHaveLength(0);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("reads window.__LEDGER_BROWSER_CONFIG__ once and caches the result", () => {
    window.__LEDGER_BROWSER_CONFIG__ = {
      satpGatewayUrl: "http://first-gateway:4010",
    };
    expect(getLedgerBrowserConfig().satpGatewayUrl).toBe(
      "http://first-gateway:4010",
    );

    // Late mutation must not leak into the cached resolution (config.js
    // runs before the bundle; anything mutating later is not configuration).
    window.__LEDGER_BROWSER_CONFIG__ = { satpGatewayUrl: "http://late:6666" };
    expect(getLedgerBrowserConfig().satpGatewayUrl).toBe(
      "http://first-gateway:4010",
    );

    resetLedgerBrowserConfigCacheForTests();
    expect(getLedgerBrowserConfig().satpGatewayUrl).toBe("http://late:6666");
  });

  it("a malformed runtime global degrades to the build-time tier with a console warning, never throws", () => {
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    try {
      window.__LEDGER_BROWSER_CONFIG__ = "not-an-object";
      const config = getLedgerBrowserConfig();

      expect(config).toEqual(resolveLedgerBrowserConfig(undefined, testEnv));
      expect(runtimeWarnCalls(warnSpy)).toHaveLength(1);
      expect(runtimeWarnCalls(warnSpy)[0][0]).toMatch(
        /ignoring runtime configuration/,
      );
    } finally {
      warnSpy.mockRestore();
    }
  });
});

describe("runtime config consumption (SATP fallback options)", () => {
  beforeEach(() => {
    resetLedgerBrowserConfigCacheForTests();
  });

  afterEach(() => {
    delete (window as { __LEDGER_BROWSER_CONFIG__?: unknown })
      .__LEDGER_BROWSER_CONFIG__;
    resetLedgerBrowserConfigCacheForTests();
  });

  function renderSatpOptions() {
    const { result } = renderHook(() => useSatpOptions(), {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    });
    return result.current;
  }

  it("falls back to the runtime-configured gateway URL", () => {
    window.__LEDGER_BROWSER_CONFIG__ = {
      satpGatewayUrl: "http://runtime-gateway:4010",
      satpPrometheusUrl: "http://runtime-prometheus:9090",
    };

    expect(renderSatpOptions()).toEqual({
      gatewayUrl: "http://runtime-gateway:4010",
      prometheusUrl: "http://runtime-prometheus:9090",
    });
  });

  it("falls back to the build-time tier or hard-coded default when nothing is runtime-configured", () => {
    // Tier 2 for the gateway is whatever `VITE_SATP_GATEWAY_URL` this test
    // bundle carries (a local `.env` may set one), tier 3 the default.
    const buildTimeGateway =
      (import.meta.env as unknown as Record<string, string | undefined>)
        .VITE_SATP_GATEWAY_URL || DEFAULT_SATP_GATEWAY_URL;

    expect(renderSatpOptions()).toEqual({
      gatewayUrl: buildTimeGateway,
      prometheusUrl: (
        import.meta.env as unknown as Record<string, string | undefined>
      ).VITE_SATP_PROMETHEUS_URL,
    });
  });

  it("an invalid runtime gateway URL degrades to the build-time tier with a warning", () => {
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    try {
      window.__LEDGER_BROWSER_CONFIG__ = {
        satpGatewayUrl: "javascript:alert(1)",
      };
      const buildTimeGateway =
        (import.meta.env as unknown as Record<string, string | undefined>)
          .VITE_SATP_GATEWAY_URL || DEFAULT_SATP_GATEWAY_URL;

      expect(renderSatpOptions().gatewayUrl).toBe(buildTimeGateway);
      expect(runtimeWarnCalls(warnSpy)).toHaveLength(1);
    } finally {
      warnSpy.mockRestore();
    }
  });
});

describe("runtime config delivery (index.html / config.example.js)", () => {
  // vitest runs with the package root as cwd.
  const packageRoot = process.cwd();

  it("index.html loads /config.js before the application bundle", () => {
    const html = readFileSync(`${packageRoot}/index.html`, "utf8");
    const configScript = html.match(/<script src="\/config\.js"><\/script>/);
    const bundleScript = html.match(
      /<script[^>]*src="\/src\/main\/typescript\/main\.tsx"[^>]*>/,
    );

    expect(configScript).not.toBeNull();
    expect(bundleScript).not.toBeNull();
    expect(configScript!.index as number).toBeLessThan(
      bundleScript!.index as number,
    );
    // Must be a classic script (no defer/async): it has to execute before
    // the deferred module bundle.
    expect(configScript![0]).not.toMatch(/defer|async/);
  });

  it("the shipped example assigns the documented global with commented-out keys", () => {
    const example = readFileSync(
      `${packageRoot}/public/config.example.js`,
      "utf8",
    );

    // Documents every overridable key...
    for (const key of [
      "supabaseUrl",
      "supabaseKey",
      "supabaseSchema",
      "satpGatewayUrl",
      "satpPrometheusUrl",
    ]) {
      expect(example).toContain(`// ${key}:`);
    }
    // ...but ships them commented out: stripped of block and line comments
    // the executable code is a bare empty-object assignment - copying the
    // file verbatim to config.js overrides nothing.
    const codeOnly = example
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "")
      .replace(/\s+/g, "");
    expect(codeOnly).toBe("window.__LEDGER_BROWSER_CONFIG__={};");
  });
});
