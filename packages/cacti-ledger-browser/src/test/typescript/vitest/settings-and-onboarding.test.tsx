/**
 * Review follow-ups: the Settings dialog (config-store connection set by the
 * viewer, reset of saved preferences), the header settings button, and the
 * SATP inspector's "no automatic connection" behavior (no gateway is probed
 * until the user adds one).
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, renderHook, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("../../../main/typescript/apps/satp/api", () => ({
  createSatpAdminApi: vi.fn(() => ({})),
  fetchSessionIds: vi.fn().mockResolvedValue([]),
  fetchSessionStatus: vi.fn(),
  fetchAuditEntries: vi.fn().mockResolvedValue([]),
  fetchSupportedLedgers: vi.fn().mockResolvedValue([]),
  fetchGatewayHealth: vi.fn().mockResolvedValue("AVAILABLE"),
  fetchSessionProofs: vi.fn().mockResolvedValue([]),
  fetchPromInstant: vi.fn(),
  fetchPromRange: vi.fn(),
}));

import {
  fetchAuditEntries,
  fetchGatewayHealth,
  fetchSessionIds,
} from "../../../main/typescript/apps/satp/api";
import {
  CONNECTION_OVERRIDE_STORAGE_KEY,
  getLedgerBrowserConfig,
  getLedgerBrowserConfigSources,
  parseConnectionOverride,
  resetLedgerBrowserConfigCacheForTests,
  saveConnectionOverride,
} from "../../../main/typescript/common/runtime-config";
import SettingsDialog from "../../../main/typescript/components/Settings/SettingsDialog";
import HeaderBar from "../../../main/typescript/components/Layout/HeaderBar";
import satpAppDefinition from "../../../main/typescript/apps/satp";
import { useSatpAppStatus } from "../../../main/typescript/apps/satp/hooks";
import type { GuiAppConfig } from "../../../main/typescript/common/supabase-types";

function newQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
}

describe("viewer connection override", () => {
  beforeEach(() => {
    localStorage.clear();
    resetLedgerBrowserConfigCacheForTests();
  });
  afterEach(() => {
    localStorage.clear();
    resetLedgerBrowserConfigCacheForTests();
  });

  it("is applied over the deployment value and reported as set in this browser", () => {
    expect(getLedgerBrowserConfigSources().supabaseUrl).not.toBe("browser");
    expect(
      saveConnectionOverride({
        supabaseUrl: "https://store.example.test",
        supabaseSchema: "ledger",
      }),
    ).toBeUndefined();
    expect(getLedgerBrowserConfig()).toMatchObject({
      supabaseUrl: "https://store.example.test",
      supabaseSchema: "ledger",
    });
    expect(getLedgerBrowserConfigSources().supabaseUrl).toBe("browser");

    saveConnectionOverride(null);
    expect(localStorage.getItem(CONNECTION_OVERRIDE_STORAGE_KEY)).toBeNull();
    expect(getLedgerBrowserConfigSources().supabaseUrl).not.toBe("browser");
  });

  it("rejects invalid values with the runtime-tier rules", () => {
    expect(
      saveConnectionOverride({ supabaseUrl: "javascript:alert(1)" }),
    ).toMatch(/supabaseUrl must be a well-formed absolute http\(s\) URL/);
    expect(
      saveConnectionOverride({ supabaseUrl: "http://u:p@store.test" }),
    ).toMatch(/supabaseUrl/);
    expect(saveConnectionOverride({ supabaseSchema: "drop table;" })).toMatch(
      /supabaseSchema/,
    );
    expect(localStorage.getItem(CONNECTION_OVERRIDE_STORAGE_KEY)).toBeNull();
  });

  it("drops tampered stored values instead of applying them", () => {
    const warn = vi.fn();
    expect(
      parseConnectionOverride(
        JSON.stringify({
          supabaseUrl: "javascript:alert(1)",
          supabaseSchema: "public",
          other: "x",
        }),
        warn,
      ),
    ).toEqual({ supabaseSchema: "public" });
    expect(parseConnectionOverride("{broken", warn)).toEqual({});
    expect(warn).toHaveBeenCalled();
  });
});

describe("SettingsDialog", () => {
  beforeEach(() => {
    localStorage.clear();
    resetLedgerBrowserConfigCacheForTests();
  });
  afterEach(() => {
    localStorage.clear();
    resetLedgerBrowserConfigCacheForTests();
  });

  it("shows the current store and where it came from, never the key", () => {
    render(<SettingsDialog open onClose={() => undefined} />);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("Store URL")).toHaveValue(
      "http://localhost:8000",
    );
    expect(within(dialog).getByText("built-in default")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("API key (optional)")).toHaveValue("");
    expect(within(dialog).queryByText(/__SUPABASE_KEY__/)).toBeNull();
  });

  it("validates, saves and reconnects", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(
      <SettingsDialog
        open
        onClose={() => undefined}
        onConnectionSaved={onSaved}
      />,
    );
    const url = screen.getByLabelText("Store URL");

    await user.clear(url);
    await user.type(url, "not a url");
    await user.click(
      screen.getByRole("button", { name: "Save and reconnect" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/supabaseUrl/);
    expect(onSaved).not.toHaveBeenCalled();

    await user.clear(url);
    await user.type(url, "https://store.example.test");
    await user.click(
      screen.getByRole("button", { name: "Save and reconnect" }),
    );
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(
      JSON.parse(localStorage.getItem(CONNECTION_OVERRIDE_STORAGE_KEY) ?? "{}"),
    ).toMatchObject({
      supabaseUrl: "https://store.example.test",
    });
  });

  it("resets this browser's saved preferences only", async () => {
    const user = userEvent.setup();
    localStorage.setItem("cacti.satp.instance-1.gateways", "[]");
    localStorage.setItem("cacti.satp.instance-1.polling", "{}");
    localStorage.setItem("unrelated", "keep");
    render(<SettingsDialog open onClose={() => undefined} />);

    await user.click(
      screen.getByRole("button", { name: "Reset saved preferences" }),
    );
    expect(screen.getByText(/Removed 2 saved preferences/)).toBeInTheDocument();
    expect(localStorage.getItem("cacti.satp.instance-1.gateways")).toBeNull();
    expect(localStorage.getItem("unrelated")).toBe("keep");
  });

  it("closes with the close button", async () => {
    const onClose = vi.fn();
    render(<SettingsDialog open onClose={onClose} />);
    await userEvent.click(
      screen.getByRole("button", { name: "close settings" }),
    );
    expect(onClose).toHaveBeenCalled();
  });
});

describe("HeaderBar settings button", () => {
  it("opens the Settings dialog", async () => {
    render(
      <MemoryRouter>
        <HeaderBar appName="Overview" />
      </MemoryRouter>,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "settings-button" }),
    );
    expect(await screen.findByRole("dialog")).toHaveTextContent(
      "Configuration store",
    );
  });
});

describe("SATP inspector without a gateway", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    resetLedgerBrowserConfigCacheForTests();
  });

  function makeApp(options: unknown): GuiAppConfig {
    return {
      id: "satp-empty",
      app_id: "satpInspector",
      instance_name: "Empty inspector",
      description: "",
      path: "/satp",
      options: options as Record<string, unknown>,
      created_at: "",
      updated_at: "",
    };
  }

  it("shows the onboarding card and sends no gateway request", async () => {
    const instance = satpAppDefinition.createAppInstance(
      makeApp({ gatewayUrl: "" }),
    );
    const layout = instance.routes[0];
    render(
      <QueryClientProvider client={newQueryClient()}>
        <MemoryRouter initialEntries={["/satp"]}>
          <Routes>
            <Route path="/satp" element={layout.element}>
              <Route index element={<div>sessions page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText("Add your first SATP gateway"),
    ).toBeInTheDocument();
    expect(screen.queryByText("sessions page")).toBeNull();
    // Give any (unwanted) polling a chance to fire.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fetchGatewayHealth).not.toHaveBeenCalled();
    expect(fetchSessionIds).not.toHaveBeenCalled();
    expect(fetchAuditEntries).not.toHaveBeenCalled();

    // Adding a gateway leaves onboarding and starts the views.
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Add a gateway" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(
      within(dialog).getByLabelText("Gateway OAPI (REST) URL"),
      "http://gw.test:4010",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Add gateway" }),
    );
    await user.click(within(dialog).getByRole("button", { name: "Done" }));
    expect(await screen.findByText("sessions page")).toBeInTheDocument();
  });

  it("reports 'no gateway yet' on the home-page card without probing", () => {
    const { result } = renderHook(() => useSatpAppStatus({ gatewayUrl: "" }), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={newQueryClient()}>
          <MemoryRouter>{children}</MemoryRouter>
        </QueryClientProvider>
      ),
    });
    expect(result.current.isPending).toBe(false);
    expect(result.current.status.message).toMatch(/No SATP gateway added yet/);
    expect(fetchGatewayHealth).not.toHaveBeenCalled();
  });
});
