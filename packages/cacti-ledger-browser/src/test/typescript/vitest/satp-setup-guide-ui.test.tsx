/**
 * UI tests for the app setup-guide link on connection errors.
 *
 * `AppDefinition.appSetupGuideURL` used to be rendered only by the
 * Add-Application wizard; these tests pin the link at the in-app
 * connection-error sites: the shared `SetupGuideLink` component, the home
 * page app card status line (fed by `useSatpAppStatus`) and the SATP
 * sessions page empty/error state.
 *
 * Everything is mocked - no network access happens in this suite.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi, beforeEach, afterEach, Mock } from "vitest";

import { AppInstance } from "../../../main/typescript/common/types/app";
import SetupGuideLink from "../../../main/typescript/components/ui/SetupGuideLink";
import AppCard from "../../../main/typescript/pages/home/AppCard";
import SessionsPage from "../../../main/typescript/apps/satp/pages/SessionsPage";
import { SATP_APP_SETUP_GUIDE_URL } from "../../../main/typescript/apps/satp/hooks";
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

function newQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
}

function renderSessionsPage() {
  const queryClient = newQueryClient();
  // Note: no NotificationProvider here - its Snackbar (MUI Slide /
  // react-transition-group CJS interop) does not render under vitest, and
  // `useNotification` falls back to a console-logging default when the
  // provider is absent.
  return render(
    <QueryClientProvider client={queryClient}>
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

describe("SetupGuideLink", () => {
  let windowOpen: Mock;

  beforeEach(() => {
    windowOpen = vi
      .spyOn(window, "open")
      .mockImplementation(() => null) as unknown as Mock;
  });

  afterEach(() => {
    windowOpen.mockRestore();
  });

  it("renders nothing when the URL is unset", () => {
    const { container } = render(<SetupGuideLink url={undefined} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText("Setup Guide")).not.toBeInTheDocument();
  });

  it("renders nothing when the URL is not a valid URL", () => {
    for (const invalid of ["", "not a url", "http://:99"]) {
      const { container } = render(<SetupGuideLink url={invalid} />);
      expect(container).toBeEmptyDOMElement();
      expect(screen.queryByText("Setup Guide")).not.toBeInTheDocument();
      container.remove();
    }
  });

  it("renders the button for a valid URL and opens it in a new tab", async () => {
    render(<SetupGuideLink url={SATP_APP_SETUP_GUIDE_URL} />);

    const button = screen.getByRole("button", { name: /setup guide/i });
    expect(button).toBeInTheDocument();

    await userEvent.click(button);
    expect(windowOpen).toHaveBeenCalledWith(SATP_APP_SETUP_GUIDE_URL, "_blank");
  });

  it("supports a custom label", () => {
    render(<SetupGuideLink url="https://example.test/guide" label="Guide" />);
    expect(screen.getByRole("button", { name: /guide/i })).toBeInTheDocument();
    expect(screen.queryByText("Setup Guide")).not.toBeInTheDocument();
  });
});

describe("AppCard status setup guide link", () => {
  const BASE_URL = "http://localhost:4010";

  function makeInstance(status: {
    severity: "success" | "info" | "warning" | "error";
    message: string;
    setupGuideURL?: string;
  }): AppInstance {
    return {
      id: "instance-1",
      appName: "SATP Inspector",
      instanceName: "My SATP Inspector",
      description: "test instance",
      path: "/satp",
      options: {},
      menuEntries: [],
      routes: [],
      useAppStatus: () => ({
        isPending: false,
        isInitialized: false,
        status,
      }),
      StatusComponent: <div data-testid="status-component" />,
    };
  }

  function renderCard(instance: AppInstance) {
    return render(
      <MemoryRouter initialEntries={["/"]}>
        <AppCard appConfig={instance} />
      </MemoryRouter>,
    );
  }

  it("shows the setup guide next to an error status that carries the URL", () => {
    renderCard(
      makeInstance({
        severity: "error",
        message: `SATP gateway is not reachable at ${BASE_URL}`,
        setupGuideURL: SATP_APP_SETUP_GUIDE_URL,
      }),
    );

    expect(
      screen.getByText(`SATP gateway is not reachable at ${BASE_URL}`),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /setup guide/i }),
    ).toBeInTheDocument();
  });

  it("shows no setup guide when the status does not carry one", () => {
    renderCard(
      makeInstance({
        severity: "success",
        message: `SATP gateway is reachable at ${BASE_URL}`,
      }),
    );

    expect(screen.getByText(/SATP gateway is reachable/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /setup guide/i }),
    ).not.toBeInTheDocument();
  });
});

describe("SessionsPage empty/error state setup guide link", () => {
  let windowOpen: Mock;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    windowOpen = vi
      .spyOn(window, "open")
      .mockImplementation(() => null) as unknown as Mock;
    // The page logs the fetch error as a notification + console.error.
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    windowOpen.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
  });

  it("renders the setup guide link with the right URL when the gateway is unreachable", async () => {
    (fetchSessionIds as Mock).mockRejectedValue(
      new Error("getaddrinfo ENOTFOUND gateway"),
    );
    (fetchAuditEntries as Mock).mockRejectedValue(
      new Error("getaddrinfo ENOTFOUND gateway"),
    );

    renderSessionsPage();

    // Empty/error state explains where the gateway should be. The query
    // retries once before surfacing the error, hence the generous timeout.
    expect(
      await screen.findByText(
        /Is the gateway reachable at/,
        {},
        { timeout: 4000 },
      ),
    ).toHaveTextContent(`Is the gateway reachable at http://localhost:4010`);

    // ... and links to the setup guide.
    const guide = await screen.findByRole("button", { name: /setup guide/i });
    await userEvent.click(guide);
    expect(windowOpen).toHaveBeenCalledWith(SATP_APP_SETUP_GUIDE_URL, "_blank");
  });

  it("renders the setup guide link when the gateway answers with zero sessions", async () => {
    (fetchSessionIds as Mock).mockResolvedValue([]);
    (fetchAuditEntries as Mock).mockResolvedValue([]);

    renderSessionsPage();

    expect(
      await screen.findByText("No SATP transfer sessions found."),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /setup guide/i }),
      ).toBeInTheDocument(),
    );
  });
});
