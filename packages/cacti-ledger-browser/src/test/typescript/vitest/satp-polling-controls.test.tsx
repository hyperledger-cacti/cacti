/**
 * Live polling controls: viewer pause/resume and refresh interval, kept per
 * app instance, and their effect on every live query's `refetchInterval`.
 */
import { describe, expect, it, beforeEach, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  DEFAULT_POLLING,
  SatpPollingProvider,
  parseStoredPolling,
  useSatpPolling,
} from "../../../main/typescript/apps/satp/context/PollingContext";
import { PollingControls } from "../../../main/typescript/apps/satp/components/SatpGatewayToolbar";
import {
  HEALTH_REFETCH_INTERVAL_MS,
  SESSIONS_REFETCH_INTERVAL_MS,
  satpHealthQuery,
  satpLiveRefetchInterval,
  satpSessionProofsQuery,
  satpSessionsQuery,
} from "../../../main/typescript/apps/satp/queries";

/** A query that has just completed a successful polling cycle. */
const healthyQuery = () => ({
  state: { fetchStatus: "idle", status: "success" },
});

describe("parseStoredPolling", () => {
  it("accepts stored settings with an offered interval", () => {
    expect(
      parseStoredPolling(JSON.stringify({ paused: true, intervalMs: 3000 })),
    ).toEqual({
      paused: true,
      intervalMs: 3000,
    });
  });

  it("falls back to defaults for unknown intervals or corrupt data", () => {
    expect(
      parseStoredPolling(JSON.stringify({ paused: "yes", intervalMs: 1 })),
    ).toEqual(DEFAULT_POLLING);
    expect(parseStoredPolling("{oops")).toEqual(DEFAULT_POLLING);
    expect(parseStoredPolling(null)).toEqual(DEFAULT_POLLING);
  });
});

describe("satpLiveRefetchInterval", () => {
  it("uses the viewer's interval for live views", () => {
    const interval = satpLiveRefetchInterval(
      {
        gatewayUrl: "http://a.test",
        polling: { paused: false, intervalMs: 3000 },
      },
      SESSIONS_REFETCH_INTERVAL_MS,
    );
    expect(interval(healthyQuery())).toBe(3000);
  });

  it("returns false while paused", () => {
    const interval = satpLiveRefetchInterval(
      {
        gatewayUrl: "http://a.test",
        polling: { paused: true, intervalMs: 3000 },
      },
      SESSIONS_REFETCH_INTERVAL_MS,
    );
    expect(interval(healthyQuery())).toBe(false);
  });

  it("keeps the default without viewer settings", () => {
    const interval = satpLiveRefetchInterval(
      { gatewayUrl: "http://a.test" },
      SESSIONS_REFETCH_INTERVAL_MS,
    );
    expect(interval(healthyQuery())).toBe(SESSIONS_REFETCH_INTERVAL_MS);
  });

  it("is wired into the live queries (health keeps its own cadence but pauses)", () => {
    const fast = {
      gatewayUrl: "http://a.test",
      polling: { paused: false, intervalMs: 5000 },
    };
    const paused = {
      gatewayUrl: "http://a.test",
      polling: { paused: true, intervalMs: 5000 },
    };
    const call = (fn: unknown) =>
      (fn as (query: ReturnType<typeof healthyQuery>) => number | false)(
        healthyQuery(),
      );

    expect(call(satpSessionsQuery(fast).refetchInterval)).toBe(5000);
    expect(call(satpSessionProofsQuery(fast, "s").refetchInterval)).toBe(5000);
    expect(call(satpHealthQuery(fast).refetchInterval)).toBe(
      HEALTH_REFETCH_INTERVAL_MS,
    );
    expect(call(satpSessionsQuery(paused).refetchInterval)).toBe(false);
    expect(call(satpHealthQuery(paused).refetchInterval)).toBe(false);
  });
});

describe("PollingControls", () => {
  beforeEach(() => localStorage.clear());

  function Probe() {
    const polling = useSatpPolling();
    return (
      <span data-testid="state">
        {polling?.paused ? "paused" : "live"}:{polling?.intervalMs}
      </span>
    );
  }

  function renderControls(storageKey = "test.polling") {
    return render(
      <QueryClientProvider client={new QueryClient()}>
        <SatpPollingProvider storageKey={storageKey}>
          <PollingControls />
          <Probe />
        </SatpPollingProvider>
      </QueryClientProvider>,
    );
  }

  it("pauses/resumes and changes the interval, persisting the choice", async () => {
    const user = userEvent.setup();
    const { unmount } = renderControls();
    expect(screen.getByTestId("state")).toHaveTextContent("live:10000");

    await user.click(
      screen.getByRole("button", { name: "pause live updates" }),
    );
    expect(screen.getByTestId("state")).toHaveTextContent("paused:10000");
    expect(screen.getByText("Paused")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "resume live updates" }),
    );
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "every 3s" }));
    expect(screen.getByTestId("state")).toHaveTextContent("live:3000");
    expect(JSON.parse(localStorage.getItem("test.polling") ?? "{}")).toEqual({
      paused: false,
      intervalMs: 3000,
    });
    unmount();

    renderControls();
    expect(screen.getByTestId("state")).toHaveTextContent("live:3000");
  });

  it("keeps working when storage is unavailable", async () => {
    const spy = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    const setSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    renderControls();
    expect(screen.getByTestId("state")).toHaveTextContent("live:10000");
    await act(async () => {
      screen.getByRole("button", { name: "pause live updates" }).click();
    });
    expect(screen.getByTestId("state")).toHaveTextContent("paused:10000");
    spy.mockRestore();
    setSpy.mockRestore();
  });
});
