/**
 * Tests for the SATP app's polling backoff.
 *
 * Originally, every SATP query polled with a fixed
 * `refetchInterval`, so an unreachable (or rate-limiting) gateway was
 * hammered at a constant rate forever - the app's own threat-model doc
 * warns about gateway rate limits. The queries now wire their
 * `refetchInterval` through `satpRefetchIntervalWithBackoff`: the interval
 * doubles for every base interval that has elapsed since the endpoint last
 * answered successfully (capped at `POLL_BACKOFF_MAX_INTERVAL_MS`) and
 * returns to the base cadence as soon as a fetch succeeds.
 *
 * Note on react-query v5 semantics (discovered while writing these tests):
 * `query.state` has no `failureCount`, and `state.fetchFailureCount` is
 * reset at the start of every fetch cycle - so an attempt-count-based
 * backoff can never compound across failed polling cycles. That is why the
 * backoff is expressed as elapsed-time-since-last-success
 * (`dataUpdatedAt`/`errorUpdatedAt`), which keeps stretching until the
 * endpoint actually recovers.
 *
 * The behavioral test uses vitest fake timers against the real
 * `satpHealthQuery` options (retry: 1, so a failed polling cycle makes 2
 * fetch attempts, the first retry happening after react-query's default
 * 1000 ms retry delay). All gateway traffic is module-mocked - no network.
 */
import { render } from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  HEALTH_REFETCH_INTERVAL_MS,
  POLL_BACKOFF_MAX_INTERVAL_MS,
  SESSIONS_REFETCH_INTERVAL_MS,
  satpAnalyticsQuery,
  satpHealthQuery,
  satpMessageLogQuery,
  satpPollIntervalMs,
  satpPromInstantQuery,
  satpPromRangeQuery,
  satpRefetchIntervalWithBackoff,
  satpSessionDetailQuery,
  satpSessionsQuery,
} from "../../../main/typescript/apps/satp/queries";
import { fetchGatewayHealth } from "../../../main/typescript/apps/satp/api";
import type { SatpAppOptions } from "../../../main/typescript/apps/satp/types";

vi.mock("../../../main/typescript/apps/satp/api", () => ({
  createSatpAdminApi: vi.fn(() => undefined),
  fetchGatewayHealth: vi.fn(),
  fetchSupportedLedgers: vi.fn(),
  fetchSessionIds: vi.fn(),
  fetchSessionStatus: vi.fn(),
  fetchAuditEntries: vi.fn(),
  fetchPromInstant: vi.fn(),
  fetchPromRange: vi.fn(),
}));

const fetchHealth = vi.mocked(fetchGatewayHealth);

const OPTIONS: SatpAppOptions = { gatewayUrl: "http://gateway.test:4010" };

/** react-query's default first retry delay (attemptIndex 0). */
const FIRST_RETRY_DELAY_MS = 1000;

describe("satpPollIntervalMs (pure backoff math)", () => {
  const BASE = SESSIONS_REFETCH_INTERVAL_MS;

  it("returns the base interval with no failed cycles", () => {
    expect(satpPollIntervalMs(BASE, 0)).toBe(BASE);
    expect(satpPollIntervalMs(BASE, -3)).toBe(BASE);
  });

  it("doubles with every consecutive failed cycle", () => {
    expect(satpPollIntervalMs(BASE, 1)).toBe(2 * BASE);
    expect(satpPollIntervalMs(BASE, 2)).toBe(4 * BASE);
    // Fractional cycle counts are floored:
    expect(satpPollIntervalMs(BASE, 1.9)).toBe(2 * BASE);
    // 1000 ms base, 5 failed cycles -> 32x (below the cap, to show growth):
    expect(satpPollIntervalMs(1000, 5)).toBe(32_000);
  });

  it("caps the interval at POLL_BACKOFF_MAX_INTERVAL_MS", () => {
    // 30s base: 2^5 = 32x > 5min, so 5 failed cycles reach the cap:
    expect(satpPollIntervalMs(HEALTH_REFETCH_INTERVAL_MS, 5)).toBe(
      POLL_BACKOFF_MAX_INTERVAL_MS,
    );
    // Even absurd cycle counts stay bounded (no overflow to Infinity):
    expect(satpPollIntervalMs(HEALTH_REFETCH_INTERVAL_MS, 100)).toBe(
      POLL_BACKOFF_MAX_INTERVAL_MS,
    );
  });
});

describe("satpRefetchIntervalWithBackoff wiring", () => {
  it("is wired into every polling SATP query", () => {
    const pollingQueries = [
      satpHealthQuery(OPTIONS),
      satpSessionsQuery(OPTIONS),
      satpSessionDetailQuery(OPTIONS, "session-1"),
      satpAnalyticsQuery(OPTIONS),
      satpMessageLogQuery(OPTIONS),
      satpPromInstantQuery(OPTIONS, "up"),
      satpPromRangeQuery(OPTIONS, "up", {
        startMs: 0,
        endMs: 1,
        stepSeconds: 1,
      }),
    ];

    for (const query of pollingQueries) {
      expect(typeof query.refetchInterval, query.queryKey.join("/")).toBe(
        "function",
      );
    }
  });

  it("counts completed failed cycles and resets on success", () => {
    const intervalFn = satpRefetchIntervalWithBackoff(
      HEALTH_REFETCH_INTERVAL_MS,
    );
    // Cycle counting is keyed on the query object identity:
    const query = {
      state: { fetchStatus: "idle", status: "pending" },
    };

    // Before the first cycle completes: base interval.
    expect(intervalFn(query)).toBe(HEALTH_REFETCH_INTERVAL_MS);

    // Cycle 1 in flight, then fails:
    query.state = { fetchStatus: "fetching", status: "pending" };
    expect(intervalFn(query)).toBe(HEALTH_REFETCH_INTERVAL_MS);
    query.state = { fetchStatus: "idle", status: "error" };
    expect(intervalFn(query)).toBe(2 * HEALTH_REFETCH_INTERVAL_MS);

    // Cycle 2 fails as well:
    query.state = { fetchStatus: "fetching", status: "error" };
    expect(intervalFn(query)).toBe(2 * HEALTH_REFETCH_INTERVAL_MS);
    query.state = { fetchStatus: "idle", status: "error" };
    expect(intervalFn(query)).toBe(4 * HEALTH_REFETCH_INTERVAL_MS);

    // A successful cycle resets the count to the base interval:
    query.state = { fetchStatus: "fetching", status: "error" };
    expect(intervalFn(query)).toBe(4 * HEALTH_REFETCH_INTERVAL_MS);
    query.state = { fetchStatus: "idle", status: "success" };
    expect(intervalFn(query)).toBe(HEALTH_REFETCH_INTERVAL_MS);
  });
});

describe("satpHealthQuery polling behavior (fake timers)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fetchHealth.mockRejectedValue(new Error("gateway unreachable"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  /** Mount a probe that runs the production satpHealthQuery options. */
  function mountHealthProbe(): void {
    const queryClient = new QueryClient();
    function HealthProbe() {
      useQuery(satpHealthQuery(OPTIONS));
      return <div>satp-health-probe</div>;
    }
    render(
      <QueryClientProvider client={queryClient}>
        <HealthProbe />
      </QueryClientProvider>,
    );
  }

  async function step(ms: number): Promise<void> {
    await vi.advanceTimersByTimeAsync(ms);
  }

  it("stretches the polling interval while the gateway keeps failing", async () => {
    mountHealthProbe();

    // Initial fetch cycle: attempt 1 fails, retry after 1s fails too.
    await step(FIRST_RETRY_DELAY_MS + 500);
    expect(fetchHealth).toHaveBeenCalledTimes(2);

    // A fixed 30s interval would have re-fetched by t~31s - the 2x backoff
    // does not (next poll is due only at t~61s):
    await step(HEALTH_REFETCH_INTERVAL_MS);
    expect(fetchHealth).toHaveBeenCalledTimes(2);
    await step(HEALTH_REFETCH_INTERVAL_MS - 1000);
    expect(fetchHealth).toHaveBeenCalledTimes(2);

    // ... but the (doubled) interval does eventually re-fetch (cycle 2):
    await step(2000);
    expect(fetchHealth).toHaveBeenCalledTimes(4);

    // Cycle 2 failed at t~62s -> 2 failed cycles -> 4x interval (120s).
    // A fixed 30s cadence would have fetched 3 more times by now:
    await step(3 * HEALTH_REFETCH_INTERVAL_MS + 29_000);
    expect(fetchHealth).toHaveBeenCalledTimes(4);

    // ... and the 4x interval does fire (cycle 3):
    await step(HEALTH_REFETCH_INTERVAL_MS + 3000);
    expect(fetchHealth).toHaveBeenCalledTimes(6);
  });

  it("backs off at most to POLL_BACKOFF_MAX_INTERVAL_MS", async () => {
    mountHealthProbe();

    // Cycle 1 (2 attempts), cycle 2 (2 attempts) at 2x, cycle 3 (2
    // attempts) at 4x:
    await step(FIRST_RETRY_DELAY_MS + 500);
    await step(HEALTH_REFETCH_INTERVAL_MS + 31_000);
    await step(4 * HEALTH_REFETCH_INTERVAL_MS + 2000);
    expect(fetchHealth).toHaveBeenCalledTimes(6);

    // Cycle 4 fires 240s after cycle 3 (4 failed cycles -> 8x=480s would
    // overshoot the cap, so the interval is the 5-minute cap):
    await step(8 * HEALTH_REFETCH_INTERVAL_MS + 3000);
    expect(fetchHealth).toHaveBeenCalledTimes(8);

    // Steady state: exactly one cycle per POLL_BACKOFF_MAX_INTERVAL_MS.
    // Almost the full cap later, cycle 5 must NOT have started yet:
    await step(POLL_BACKOFF_MAX_INTERVAL_MS - 5000);
    expect(fetchHealth).toHaveBeenCalledTimes(8);

    // Past the cap, it does - and stays capped:
    await step(10_000);
    expect(fetchHealth).toHaveBeenCalledTimes(10);
  });

  it("resets to the base interval after a success", async () => {
    mountHealthProbe();

    // Fail through cycle 3 (cadence stretched to 240s).
    await step(FIRST_RETRY_DELAY_MS + 500);
    await step(HEALTH_REFETCH_INTERVAL_MS + 31_000);
    await step(4 * HEALTH_REFETCH_INTERVAL_MS + 2000);
    expect(fetchHealth).toHaveBeenCalledTimes(6);

    // Gateway comes back: the next poll succeeds (single attempt, no retry)
    // and the success resets the cadence to the base interval.
    fetchHealth.mockResolvedValue("AVAILABLE");
    await step(8 * HEALTH_REFETCH_INTERVAL_MS + 3000);
    expect(fetchHealth).toHaveBeenCalledTimes(7);

    // Well inside the reset base interval there is no re-fetch yet:
    await step(HEALTH_REFETCH_INTERVAL_MS - 5000);
    expect(fetchHealth).toHaveBeenCalledTimes(7);

    // ... but it does poll again right at the base interval (exactly one
    // base period later - the assert window ends before the next one):
    await step(HEALTH_REFETCH_INTERVAL_MS - 1000);
    expect(fetchHealth).toHaveBeenCalledTimes(8);
  });
});
