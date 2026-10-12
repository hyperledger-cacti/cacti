/**
 * Tests for the SATP inspector app definition's instance creation boundary
 * and the Add-Application wizard happy path.
 *
 * `createAppInstance` receives user-provided instance options from the
 * `gui_app_config` table. The browser sends requests to these URLs, so only
 * well-formed absolute http(s) URLs may be accepted. The wizard's app
 * selection view must keep offering the SATP inspector with its setup guide.
 *
 * No network access happens in this suite.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach, afterEach, Mock } from "vitest";

import { isHttpUrl } from "../../../main/typescript/common/utils";
import satpAppDefinition from "../../../main/typescript/apps/satp";
import SelectAppView from "../../../main/typescript/pages/add-new-app/SelectAppView";
import { AppCategory } from "../../../main/typescript/common/app-category";
import { GuiAppConfig } from "../../../main/typescript/common/supabase-types";
import {
  DEFAULT_SATP_GATEWAY_URL,
  SATP_APP_SETUP_GUIDE_URL,
} from "../../../main/typescript/apps/satp/hooks";
import type { SatpAppOptions } from "../../../main/typescript/apps/satp/types";

function makeGuiAppConfig(options: unknown): GuiAppConfig {
  return {
    id: "app-instance-1",
    app_id: "satpInspector",
    instance_name: "My SATP Inspector",
    description: "test instance",
    path: "/satp",
    options: options as Record<string, unknown>,
    created_at: "2026-09-18T00:00:00Z",
    updated_at: "2026-09-18T00:00:00Z",
  };
}

describe("isHttpUrl", () => {
  it("accepts absolute http(s) URLs", () => {
    expect(isHttpUrl("http://localhost:4010")).toBe(true);
    expect(isHttpUrl("https://gateway.example.com/api")).toBe(true);
    expect(isHttpUrl("https://gateway.example.com/api#setup")).toBe(true);
  });

  it("rejects missing, relative and non-hypertext URLs", () => {
    expect(isHttpUrl(undefined)).toBe(false);
    expect(isHttpUrl("")).toBe(false);
    expect(isHttpUrl("localhost:4010")).toBe(false);
    expect(isHttpUrl("/api/v1")).toBe(false);
    expect(isHttpUrl("ftp://gateway:4010")).toBe(false);
    expect(isHttpUrl("file:///etc/passwd")).toBe(false);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("data:text/html,hello")).toBe(false);
  });
});

/**
 * Adversarial URL cases.
 *
 * Policy decisions (documented on `isHttpUrl`):
 *
 * - **Credentials** (`https://user:pass@host`): REJECT - basic auth in a URL
 *   leaks secrets into logs/history/error messages; auth belongs in
 *   out-of-band configuration, not the endpoint URL.
 * - **Whitespace/control characters**: REJECT even where the WHATWG parser
 *   would silently trim/strip them (leading/trailing spaces, embedded
 *   tab/newline) - the raw string must not differ from what is fetched.
 * - **Unicode/IDN homoglyphs**: REJECT non-ASCII (the parser punycodes them,
 *   so `gаteway.example.com` with a Cyrillic `а` silently resolves to a
 *   different xn-- host). ASCII punycode (`xn--...`) forms stay accepted.
 * - **Ports**: out-of-range (`:65536`, `:99999`) fail URL parsing → REJECT;
 *   leading zeros (`:04010`) parse and are ACCEPTED (normalized to `:4010`
 *   by the parser - harmless).
 * - **Protocol-relative** (`//host`) and **backslashes** (`https:\host`,
 *   path `\admin`): REJECT (no scheme / WHATWG `\\`-means-`/` quirk).
 *
 * Invariant: every case is either accepted (a well-formed http(s) URL) or
 * rejected with a controlled error - never a crash, never a silently
 * rewritten endpoint.
 */
describe("isHttpUrl adversarial cases", () => {
  it("rejects URLs with embedded credentials", () => {
    expect(isHttpUrl("https://user:pass@gateway.example.com")).toBe(false);
    expect(isHttpUrl("https://user:pass@gateway.example.com:4010/api")).toBe(
      false,
    );
    expect(isHttpUrl("https://token@gateway.example.com")).toBe(false);
    // Percent-encoded userinfo counts as credentials too:
    expect(isHttpUrl("https://user%40corp:p%40ss@gateway.example.com")).toBe(
      false,
    );
  });

  it("rejects whitespace and control characters the URL parser would trim", () => {
    // Leading/trailing spaces are silently trimmed by the parser:
    expect(isHttpUrl(" https://gateway.example.com ")).toBe(false);
    // Tabs and newlines are stripped anywhere by the parser:
    expect(isHttpUrl("https://gateway.example.com\t:4010")).toBe(false);
    expect(isHttpUrl("https://gateway.example.com\n")).toBe(false);
    expect(isHttpUrl("https://gate way.example.com")).toBe(false);
    // NUL and other C0 controls:
    expect(isHttpUrl("https://gateway.example.com\u0000/")).toBe(false);
    expect(isHttpUrl("https://gateway.example.com\u001f")).toBe(false);
    expect(isHttpUrl("https://gateway.example.com/\u007f")).toBe(false);
  });

  it("rejects unicode/IDN homoglyphs but accepts ASCII punycode", () => {
    // 'а' below is Cyrillic U+0430, not Latin 'a' - the parser would
    // punycode the host to xn--gteway-3nf.example.com:
    expect(isHttpUrl("https://gаteway.example.com")).toBe(false);
    expect(isHttpUrl("https://münchen.example.com")).toBe(false);
    // Fullwidth characters:
    expect(isHttpUrl("http://ＥＸＡＭＰＬＥ.example.com")).toBe(false);
    // The operator-entered punycode form of a legit IDN stays valid:
    expect(isHttpUrl("http://xn--bcher-kva.example.com:4010")).toBe(true);
  });

  it("rejects port shenanigans that fail parsing; accepts leading-zero ports", () => {
    // Out-of-range ports are parse errors:
    expect(isHttpUrl("http://gateway.example.com:65536")).toBe(false);
    expect(isHttpUrl("http://gateway.example.com:99999")).toBe(false);
    // Leading zeros parse and normalize (04010 -> 4010) - accepted:
    expect(isHttpUrl("https://gateway.example.com:04010")).toBe(true);
    expect(new URL("https://gateway.example.com:04010").port).toBe("4010");
    // Boundary ports are valid:
    expect(isHttpUrl("https://gateway.example.com:65535")).toBe(true);
  });

  it("rejects protocol-relative and backslash URLs", () => {
    // No scheme -> parse error without a base URL:
    expect(isHttpUrl("//gateway.example.com")).toBe(false);
    expect(isHttpUrl("//gateway.example.com:4010")).toBe(false);
    // WHATWG treats backslashes as "/" in special schemes - rejected so the
    // raw string can never hide a different host/path than what is fetched:
    expect(isHttpUrl("https:\\\\gateway.example.com")).toBe(false);
    expect(isHttpUrl("https://gateway.example.com\\\\admin")).toBe(false);
  });

  it("still accepts ordinary http(s) endpoints after the tightening", () => {
    expect(isHttpUrl("http://localhost:4010")).toBe(true);
    expect(isHttpUrl("https://gateway.example.com/api/v1/audit")).toBe(true);
    expect(isHttpUrl("http://prometheus:9090/metrics")).toBe(true);
  });
});

describe("satpAppDefinition.createAppInstance", () => {
  it("creates an instance for valid options, exposing the resolved gateway URL", () => {
    const options: SatpAppOptions = {
      gatewayUrl: "https://gateway.example.com:4010",
      prometheusUrl: "http://prometheus:9090",
    };

    const instance = satpAppDefinition.createAppInstance(
      makeGuiAppConfig(options),
    );

    expect(instance.appName).toBe("SATP Inspector");
    const createdOptions = instance.options as SatpAppOptions;
    expect(createdOptions.gatewayUrl).toBe("https://gateway.example.com:4010");
    expect(instance.menuEntries.map((entry) => entry.title)).toEqual([
      "Sessions",
      "Gateways",
      "Messages",
      "Overview",
      "Guide",
    ]);
  });

  it("accepts a missing or empty prometheusUrl (optional option)", () => {
    const instance = satpAppDefinition.createAppInstance(
      makeGuiAppConfig({ gatewayUrl: DEFAULT_SATP_GATEWAY_URL }),
    );
    const instanceOptions = instance.options as SatpAppOptions;
    expect(instanceOptions.gatewayUrl).toBe(DEFAULT_SATP_GATEWAY_URL);

    const instanceEmptyProm = satpAppDefinition.createAppInstance(
      makeGuiAppConfig({
        gatewayUrl: DEFAULT_SATP_GATEWAY_URL,
        prometheusUrl: "",
      }),
    );
    const emptyPromOptions = instanceEmptyProm.options as SatpAppOptions;
    expect(emptyPromOptions.gatewayUrl).toBe(DEFAULT_SATP_GATEWAY_URL);
  });

  it("rejects a missing gatewayUrl", () => {
    expect(() =>
      satpAppDefinition.createAppInstance(makeGuiAppConfig({})),
    ).toThrow(/Invalid SATP inspector app specific options/);
    expect(() =>
      satpAppDefinition.createAppInstance(makeGuiAppConfig(null)),
    ).toThrow(/Invalid SATP inspector app specific options/);
  });

  it("rejects a gatewayUrl that is not an absolute http(s) URL", () => {
    for (const bad of [
      "localhost:4010",
      "/api/v1",
      "ftp://gateway:4010",
      "file:///etc/passwd",
      "javascript:alert(1)",
    ]) {
      expect(() =>
        satpAppDefinition.createAppInstance(
          makeGuiAppConfig({ gatewayUrl: bad }),
        ),
      ).toThrow(/Invalid SATP inspector gatewayUrl/);
    }
  });

  it("rejects a prometheusUrl that is not an absolute http(s) URL", () => {
    expect(() =>
      satpAppDefinition.createAppInstance(
        makeGuiAppConfig({
          gatewayUrl: DEFAULT_SATP_GATEWAY_URL,
          prometheusUrl: "prometheus:9090",
        }),
      ),
    ).toThrow(/Invalid SATP inspector prometheusUrl/);
  });

  it("rejects adversarial gatewayUrls with a controlled error, never a crash", () => {
    for (const bad of [
      "https://user:pass@gateway.example.com", // credentials policy
      " https://gateway.example.com ", // parser-trimmed whitespace
      "https://gateway.example.com\t:4010", // stripped tab
      "https://gаteway.example.com", // IDN homoglyph (Cyrillic 'а')
      "http://gateway.example.com:99999", // port out of range
      "//gateway.example.com:4010", // protocol-relative
      "https:\\\\gateway.example.com", // WHATWG backslash quirk
    ]) {
      expect(() =>
        satpAppDefinition.createAppInstance(
          makeGuiAppConfig({ gatewayUrl: bad }),
        ),
      ).toThrow(/Invalid SATP inspector gatewayUrl/);
    }
  });

  it("rejects a prometheusUrl with embedded credentials", () => {
    expect(() =>
      satpAppDefinition.createAppInstance(
        makeGuiAppConfig({
          gatewayUrl: DEFAULT_SATP_GATEWAY_URL,
          prometheusUrl: "https://admin:s3cret@prometheus.example.com",
        }),
      ),
    ).toThrow(/Invalid SATP inspector prometheusUrl/);
  });

  it("accepts a leading-zero port (documented parser normalization)", () => {
    const instance = satpAppDefinition.createAppInstance(
      makeGuiAppConfig({ gatewayUrl: "http://gateway.example.com:04010" }),
    );
    expect(instance.appName).toBe("SATP Inspector");
  });

  it("publishes the setup guide URL on the app definition", () => {
    expect(satpAppDefinition.appSetupGuideURL).toBe(SATP_APP_SETUP_GUIDE_URL);
    expect(isHttpUrl(satpAppDefinition.appSetupGuideURL)).toBe(true);
  });
});

describe("Add-Application wizard: SelectAppView happy path", () => {
  let windowOpen: Mock;

  beforeEach(() => {
    windowOpen = vi
      .spyOn(window, "open")
      .mockImplementation(() => null) as unknown as Mock;
  });

  afterEach(() => {
    windowOpen.mockRestore();
  });

  it("lists the SATP inspector with a working setup guide button", async () => {
    const handleAppSelected = vi.fn();
    render(
      <SelectAppView
        appCategory={AppCategory.LedgerBrowser}
        handleAppSelected={handleAppSelected}
        handleBack={() => undefined}
      />,
    );

    expect(screen.getByText("SATP Inspector")).toBeInTheDocument();

    // Every listed app has an enabled setup guide button (valid URLs).
    const guideButtons = screen.getAllByRole("button", {
      name: /setup guide/i,
    });
    expect(guideButtons.length).toBeGreaterThan(0);

    // The SATP setup guide button opens the SATP inspector guide page.
    const satpGuide = guideButtons[2];
    await userEvent.click(satpGuide);
    expect(windowOpen).toHaveBeenCalledWith(SATP_APP_SETUP_GUIDE_URL, "_blank");
  });

  it("selects an app on click", async () => {
    const handleAppSelected = vi.fn();
    render(
      <SelectAppView
        appCategory={AppCategory.LedgerBrowser}
        handleAppSelected={handleAppSelected}
        handleBack={() => undefined}
      />,
    );

    await userEvent.click(screen.getByText("SATP Inspector"));
    expect(handleAppSelected).toHaveBeenCalledWith("satpInspector");
  });
});
