/**
 * Component tests for the sessions dashboard affordances: KPI outcome cards
 * that double as filters, the free-text search, sortable columns and the
 * filter-aware empty state. Everything is mocked - no network access.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SessionsPage from "../../../main/typescript/apps/satp/pages/SessionsPage";
import type { SatpAppOptions } from "../../../main/typescript/apps/satp/types";

vi.mock("../../../main/typescript/apps/satp/api", () => ({
  createSatpAdminApi: vi.fn(() => ({})),
  fetchSessionIds: vi.fn(),
  fetchSessionStatus: vi.fn(),
  fetchAuditEntries: vi.fn(),
  fetchSupportedLedgers: vi.fn(),
  fetchGatewayHealth: vi.fn(),
  fetchPromInstant: vi.fn(),
  fetchPromRange: vi.fn(),
}));

import {
  fetchAuditEntries,
  fetchSessionIds,
} from "../../../main/typescript/apps/satp/api";

const SATP_OPTIONS: SatpAppOptions = {
  gatewayUrl: "http://localhost:4010",
};

const BASE_TS = 1_700_000_000_000;

/** Audit entry factory mirroring the gateway wire shape. */
function entry(
  sessionId: string,
  sequenceNumber: number,
  type: string,
  snapshot?: Record<string, unknown>,
) {
  const timestamp = BASE_TS + sequenceNumber * 60_000;
  return {
    auditEntryId: `${sessionId}-${sequenceNumber}`,
    timestamp,
    session: {
      sessionId,
      type,
      key: sessionId,
      operation: type,
      sequenceNumber,
      timestamp: String(timestamp),
      data: snapshot ? JSON.stringify(snapshot) : "",
    },
  };
}

const SESSIONS = {
  alpha: [
    entry("alpha", 1, "TRANSFER_PROPOSAL", {
      state: 2,
      sourceBasePath: "Besu",
      recipientBasePath: "Fabric",
    }),
  ],
  beta: [entry("beta", 2, "TRANSFER_COMMENCE", { state: 1 })],
  gamma: [
    entry("gamma", 3, "TRANSFER_COMMENCE", { state: 5 }),
    entry("gamma", 4, "TRANSFER_ROLLBACK_START", { state: 5 }),
  ],
};

const ALL_IDS = ["alpha", "beta", "gamma"];

function newQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
}

function renderSessionsPage() {
  return render(
    <QueryClientProvider client={newQueryClient()}>
      <MemoryRouter initialEntries={["/satp"]}>
        <Routes>
          <Route path="/satp" element={<Outlet context={SATP_OPTIONS} />}>
            <Route index element={<SessionsPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function visibleSessionIds(): string[] {
  return screen
    .getAllByRole("row")
    .map((row) => row.textContent ?? "")
    .filter((text) => ALL_IDS.some((id) => text.includes(id)))
    .map((text) => ALL_IDS.find((id) => text.includes(id))!);
}

beforeEach(() => {
  vi.mocked(fetchSessionIds).mockResolvedValue(ALL_IDS);
  vi.mocked(fetchAuditEntries).mockResolvedValue([
    ...SESSIONS.alpha,
    ...SESSIONS.beta,
    ...SESSIONS.gamma,
  ]);
});

describe("SessionsPage dashboard affordances", () => {
  it("renders KPI counts for every outcome bucket", async () => {
    renderSessionsPage();

    await waitFor(() =>
      expect(screen.getByText("Transfers (3)")).toBeInTheDocument(),
    );

    // Total 3, one in-progress (beta), one completed (alpha),
    // one failed (gamma) which also rolled back.
    const cards = screen.getAllByRole("button", {
      name: /total|in progress|completed|failed|rollbacks/i,
    });
    expect(cards).toHaveLength(5);
    expect(
      screen.getByRole("button", { name: /^3\s*Total$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^1\s*In progress$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^1\s*Completed$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^1\s*Failed$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^1\s*Rollbacks$/i }),
    ).toBeInTheDocument();
  });

  it("filters the table when an outcome card is clicked and clears on second click", async () => {
    const user = userEvent.setup();
    renderSessionsPage();

    await waitFor(() =>
      expect(screen.getByText("Transfers (3)")).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: /^1\s*Failed$/i }));
    await waitFor(() =>
      expect(screen.getByText("Transfers (1 of 3)")).toBeInTheDocument(),
    );
    expect(visibleSessionIds()).toEqual(["gamma"]);

    await user.click(screen.getByRole("button", { name: /^1\s*Failed$/i }));
    await waitFor(() =>
      expect(screen.getByText("Transfers (3)")).toBeInTheDocument(),
    );
  });

  it("narrows rows with the free-text search across row fields", async () => {
    const user = userEvent.setup();
    renderSessionsPage();

    await waitFor(() =>
      expect(screen.getByText("Transfers (3)")).toBeInTheDocument(),
    );

    await user.type(screen.getByPlaceholderText("Search sessions"), "fabric");
    await waitFor(() =>
      expect(screen.getByText("Transfers (1 of 3)")).toBeInTheDocument(),
    );
    expect(visibleSessionIds()).toEqual(["alpha"]);
  });

  it("shows a filter-aware empty state with a clear action", async () => {
    const user = userEvent.setup();
    renderSessionsPage();

    await waitFor(() =>
      expect(screen.getByText("Transfers (3)")).toBeInTheDocument(),
    );

    await user.type(screen.getByPlaceholderText("Search sessions"), "no-match");
    await waitFor(() =>
      expect(
        screen.getByText("No sessions match the current filter."),
      ).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: /clear filter/i }));
    await waitFor(() =>
      expect(screen.getByText("Transfers (3)")).toBeInTheDocument(),
    );
  });

  it("sorts by session id in both directions", async () => {
    const user = userEvent.setup();
    renderSessionsPage();

    await waitFor(() =>
      expect(screen.getByText("Transfers (3)")).toBeInTheDocument(),
    );
    // Default sort: last activity descending (gamma has the newest events).
    expect(visibleSessionIds()).toEqual(["gamma", "beta", "alpha"]);

    await user.click(screen.getByRole("button", { name: /^session id/i }));
    await waitFor(() =>
      expect(visibleSessionIds()).toEqual(["alpha", "beta", "gamma"]),
    );

    await user.click(screen.getByRole("button", { name: /^session id/i }));
    await waitFor(() =>
      expect(visibleSessionIds()).toEqual(["gamma", "beta", "alpha"]),
    );
  });
});
