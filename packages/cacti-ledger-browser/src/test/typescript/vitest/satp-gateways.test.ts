/**
 * Pure gateway-list helpers of the SATP inspector (`apps/satp/gateways.ts`).
 */
import { describe, expect, it } from "vitest";

import {
  COUNTERPARTY_CLEARED,
  buildPersistedGatewayOptions,
  gatewayStorageKeys,
  mergeGatewayLists,
  normalizeGatewayUrl,
  parseStoredGateways,
  resolveActiveGatewayUrl,
  resolveConfiguredGateways,
  resolveCounterpartyGatewayUrl,
  sameGatewayUrl,
  validateGatewayOptions,
} from "../../../main/typescript/apps/satp/gateways";
import type { SatpGatewayEndpoint } from "../../../main/typescript/apps/satp/types";

const gw = (
  url: string,
  source: "config" | "user" = "config",
): SatpGatewayEndpoint => ({
  id: url,
  name: url,
  url,
  source,
});

describe("normalizeGatewayUrl / sameGatewayUrl", () => {
  it("trims whitespace and trailing slashes", () => {
    expect(normalizeGatewayUrl("  http://a.test:1/// ")).toBe(
      "http://a.test:1",
    );
  });

  it("compares case-insensitively and ignores trailing slashes", () => {
    expect(sameGatewayUrl("http://A.test:1/", "http://a.test:1")).toBe(true);
    expect(sameGatewayUrl("http://a.test:1", "http://a.test:2")).toBe(false);
    expect(sameGatewayUrl(undefined, "http://a.test:1")).toBe(false);
  });
});

describe("validateGatewayOptions", () => {
  it("accepts a missing option and a list of valid entries", () => {
    expect(validateGatewayOptions(undefined)).toBeUndefined();
    expect(
      validateGatewayOptions([
        { url: "http://a.test:1" },
        { name: "B", url: "https://b.test" },
      ]),
    ).toBeUndefined();
  });

  it("rejects non-arrays, non-http URLs and wrongly typed fields", () => {
    expect(validateGatewayOptions("http://a.test")).toMatch(/must be an array/);
    expect(validateGatewayOptions([{ url: "javascript:alert(1)" }])).toMatch(
      /gateways\[0\]\.url/,
    );
    expect(validateGatewayOptions([{ url: "http://user:pw@a.test" }])).toMatch(
      /gateways\[0\]\.url/,
    );
    expect(validateGatewayOptions([{ url: "http://a.test", name: 5 }])).toMatch(
      /gateways\[0\]\.name/,
    );
    expect(validateGatewayOptions([null])).toMatch(
      /gateways\[0\] must be an object/,
    );
  });
});

describe("resolveConfiguredGateways", () => {
  it("orders primary, counterparty, then the gateways list, deduplicated", () => {
    const result = resolveConfiguredGateways({
      gatewayUrl: "http://a.test:1",
      counterpartyGatewayUrl: "http://b.test:2/",
      gateways: [
        { url: "http://A.test:1" },
        { name: "C", url: "http://c.test:3" },
        { url: "not-a-url" },
      ],
    });
    expect(result.map((entry) => [entry.name, entry.url])).toEqual([
      ["Primary gateway", "http://a.test:1"],
      ["Counterparty gateway", "http://b.test:2"],
      ["C", "http://c.test:3"],
    ]);
  });

  it("returns an empty list when the instance names nothing usable", () => {
    expect(resolveConfiguredGateways({ gatewayUrl: "" })).toEqual([]);
  });
});

describe("parseStoredGateways / mergeGatewayLists", () => {
  it("parses valid entries as viewer gateways and drops the rest", () => {
    const parsed = parseStoredGateways(
      JSON.stringify([
        { id: "1", name: "One", url: "http://one.test/" },
        { id: "2", name: "Two", url: "file:///etc/passwd" },
        { name: "no id", url: "http://x.test" },
      ]),
    );
    expect(parsed).toEqual([
      { id: "1", name: "One", url: "http://one.test", source: "user" },
    ]);
  });

  it("returns [] for corrupt storage", () => {
    expect(parseStoredGateways("{not json")).toEqual([]);
    expect(parseStoredGateways(JSON.stringify({ a: 1 }))).toEqual([]);
    expect(parseStoredGateways(null)).toEqual([]);
  });

  it("puts config gateways first and skips viewer duplicates", () => {
    const merged = mergeGatewayLists(
      [gw("http://a.test")],
      [gw("http://A.test/", "user"), gw("http://b.test", "user")],
    );
    expect(merged.map((entry) => [entry.url, entry.source])).toEqual([
      ["http://a.test", "config"],
      ["http://b.test", "user"],
    ]);
  });
});

describe("resolveActiveGatewayUrl", () => {
  const gateways = [gw("http://a.test"), gw("http://b.test")];

  it("prefers the viewer's stored choice when it is still listed", () => {
    expect(
      resolveActiveGatewayUrl({
        stored: "http://B.test/",
        gateways,
        configuredUrl: "http://a.test",
        fallbackUrl: "http://fallback.test",
      }),
    ).toBe("http://b.test");
  });

  it("falls back to the instance gatewayUrl, then the first gateway, then the fallback", () => {
    expect(
      resolveActiveGatewayUrl({
        stored: "http://gone.test",
        gateways,
        configuredUrl: "http://a.test",
        fallbackUrl: "http://fallback.test",
      }),
    ).toBe("http://a.test");
    expect(
      resolveActiveGatewayUrl({
        stored: null,
        gateways,
        configuredUrl: "",
        fallbackUrl: "http://fallback.test",
      }),
    ).toBe("http://a.test");
    expect(
      resolveActiveGatewayUrl({
        stored: null,
        gateways: [],
        configuredUrl: "",
        fallbackUrl: "http://fallback.test",
      }),
    ).toBe("http://fallback.test");
  });
});

describe("resolveCounterpartyGatewayUrl", () => {
  const gateways = [gw("http://a.test"), gw("http://b.test")];

  it("honours an explicit clear over the configured counterparty", () => {
    expect(
      resolveCounterpartyGatewayUrl({
        stored: COUNTERPARTY_CLEARED,
        gateways,
        configuredUrl: "http://b.test",
        activeGatewayUrl: "http://a.test",
      }),
    ).toBeUndefined();
  });

  it("uses the stored or configured counterparty, never the active gateway", () => {
    expect(
      resolveCounterpartyGatewayUrl({
        stored: null,
        gateways,
        configuredUrl: "http://b.test",
        activeGatewayUrl: "http://a.test",
      }),
    ).toBe("http://b.test");
    expect(
      resolveCounterpartyGatewayUrl({
        stored: null,
        gateways,
        configuredUrl: "http://b.test",
        activeGatewayUrl: "http://b.test",
      }),
    ).toBeUndefined();
  });
});

describe("gatewayStorageKeys", () => {
  it("scopes every key by app instance", () => {
    const a = gatewayStorageKeys("a");
    const b = gatewayStorageKeys("b");
    for (const key of Object.keys(a) as Array<keyof typeof a>) {
      expect(a[key]).not.toBe(b[key]);
      expect(a[key]).toContain(".a.");
    }
  });
});

describe("buildPersistedGatewayOptions", () => {
  it("keeps other options and the primary, lists every other gateway", () => {
    const result = buildPersistedGatewayOptions(
      { gatewayUrl: "http://a.test/", prometheusUrl: "http://prom.test" },
      [
        gw("http://a.test"),
        gw("http://b.test", "user"),
        { ...gw("http://c.test", "user"), name: "C", description: "third" },
      ],
      "http://b.test",
    );
    expect(result).toEqual({
      gatewayUrl: "http://a.test",
      prometheusUrl: "http://prom.test",
      counterpartyGatewayUrl: "http://b.test",
      gateways: [{ name: "C", url: "http://c.test", description: "third" }],
    });
    // The saved options resolve back to the same gateway list.
    expect(resolveConfiguredGateways(result).map((entry) => entry.url)).toEqual(
      ["http://a.test", "http://b.test", "http://c.test"],
    );
  });
});
