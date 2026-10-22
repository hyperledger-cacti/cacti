import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("../../../main/typescript/apps/satp/api", () => ({
  createSatpAdminApi: vi.fn(() => ({})),
  fetchSessionIds: vi.fn().mockResolvedValue([]),
  fetchSessionStatus: vi.fn().mockResolvedValue({
    sessionId: "test-session",
    status: "COMPLETED",
    step: "03-02",
    stage: "3",
  }),
  fetchAuditEntries: vi.fn().mockResolvedValue([]),
  fetchSupportedLedgers: vi.fn().mockResolvedValue([]),
  fetchGatewayHealth: vi.fn().mockResolvedValue({ status: "OK" }),
  fetchPromInstant: vi.fn(),
  fetchPromRange: vi.fn(),
}));

import {
  SatpGatewayProvider,
  useSatpGatewayContext,
  SATP_DEFAULT_PRESETS,
} from "../../../main/typescript/apps/satp/context/GatewayContext";
import SatpGatewayToolbar from "../../../main/typescript/apps/satp/components/SatpGatewayToolbar";
import DualGatewayFlowCard from "../../../main/typescript/apps/satp/components/DualGatewayFlowCard";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
}

function TestConsumer({
  onContext,
}: {
  onContext: (ctx: ReturnType<typeof useSatpGatewayContext>) => void;
}) {
  const ctx = useSatpGatewayContext();
  onContext(ctx);
  return (
    <div>
      <span data-testid="active-gw">{ctx.activeGatewayUrl}</span>
      <span data-testid="counterparty-gw">
        {ctx.counterpartyGatewayUrl ?? "none"}
      </span>
      <span data-testid="gw-count">{ctx.gateways.length}</span>
    </div>
  );
}

describe("SATP Multi-Gateway Management & Context", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("initializes with default gateway and CBDC presets", () => {
    let contextValue!: ReturnType<typeof useSatpGatewayContext>;

    render(
      <SatpGatewayProvider>
        <TestConsumer onContext={(ctx) => (contextValue = ctx)} />
      </SatpGatewayProvider>,
    );

    expect(contextValue.activeGatewayUrl).toBe("http://localhost:4010");
    expect(contextValue.counterpartyGatewayUrl).toBeUndefined();
    expect(contextValue.gateways.length).toBe(SATP_DEFAULT_PRESETS.length);

    // Verify CBDC presets are available
    const urls = contextValue.gateways.map((g) => g.url);
    expect(urls).toContain("http://localhost:4010");
    expect(urls).toContain("http://localhost:4020");
    expect(urls).toContain("http://localhost:3013");
    expect(urls).toContain("http://localhost:3014");
  });

  it("allows dynamically switching active gateway URL", () => {
    let contextValue!: ReturnType<typeof useSatpGatewayContext>;

    render(
      <SatpGatewayProvider>
        <TestConsumer onContext={(ctx) => (contextValue = ctx)} />
      </SatpGatewayProvider>,
    );

    act(() => {
      contextValue.setActiveGatewayUrl("http://localhost:3013");
    });

    expect(screen.getByTestId("active-gw").textContent).toBe(
      "http://localhost:3013",
    );
    expect(localStorage.getItem("cacti_satp_active_gateway")).toBe(
      "http://localhost:3013",
    );
  });

  it("allows setting and clearing counterparty gateway URL", () => {
    let contextValue!: ReturnType<typeof useSatpGatewayContext>;

    render(
      <SatpGatewayProvider>
        <TestConsumer onContext={(ctx) => (contextValue = ctx)} />
      </SatpGatewayProvider>,
    );

    act(() => {
      contextValue.setCounterpartyGatewayUrl("http://localhost:4020");
    });

    expect(screen.getByTestId("counterparty-gw").textContent).toBe(
      "http://localhost:4020",
    );
    expect(localStorage.getItem("cacti_satp_counterparty_gateway")).toBe(
      "http://localhost:4020",
    );

    act(() => {
      contextValue.setCounterpartyGatewayUrl(undefined);
    });

    expect(screen.getByTestId("counterparty-gw").textContent).toBe("none");
    expect(localStorage.getItem("cacti_satp_counterparty_gateway")).toBeNull();
  });

  it("adds and removes custom gateway endpoints with validation", () => {
    let contextValue!: ReturnType<typeof useSatpGatewayContext>;

    render(
      <SatpGatewayProvider>
        <TestConsumer onContext={(ctx) => (contextValue = ctx)} />
      </SatpGatewayProvider>,
    );

    // Rejects invalid URL
    let added = false;
    act(() => {
      added = contextValue.addGateway({
        name: "Invalid Endpoint",
        url: "not-a-valid-url",
      });
    });
    expect(added).toBe(false);

    // Accepts valid URL
    act(() => {
      added = contextValue.addGateway({
        name: "Custom Hermes Gateway",
        url: "https://hermes.example.com:4010",
        description: "Production gateway",
      });
    });
    expect(added).toBe(true);

    const customGw = contextValue.gateways.find(
      (g) => g.url === "https://hermes.example.com:4010",
    );
    expect(customGw).toBeDefined();
    expect(customGw?.name).toBe("Custom Hermes Gateway");

    // Remove custom gateway
    act(() => {
      contextValue.removeGateway(customGw!.id);
    });
    expect(
      contextValue.gateways.find(
        (g) => g.url === "https://hermes.example.com:4010",
      ),
    ).toBeUndefined();
  });

  it("loads CBDC demo presets with Besu (4010) as origin and Fabric (4020) as destination", () => {
    let contextValue!: ReturnType<typeof useSatpGatewayContext>;

    render(
      <SatpGatewayProvider>
        <TestConsumer onContext={(ctx) => (contextValue = ctx)} />
      </SatpGatewayProvider>,
    );

    act(() => {
      contextValue.loadCbdcPresets();
    });

    expect(screen.getByTestId("active-gw").textContent).toBe(
      "http://localhost:4010",
    );
    expect(screen.getByTestId("counterparty-gw").textContent).toBe(
      "http://localhost:4020",
    );
  });

  it("resets all gateways and storage to defaults", () => {
    let contextValue!: ReturnType<typeof useSatpGatewayContext>;

    render(
      <SatpGatewayProvider>
        <TestConsumer onContext={(ctx) => (contextValue = ctx)} />
      </SatpGatewayProvider>,
    );

    act(() => {
      contextValue.setActiveGatewayUrl("http://localhost:9999");
      contextValue.setCounterpartyGatewayUrl("http://localhost:8888");
      contextValue.resetToDefaults();
    });

    expect(screen.getByTestId("active-gw").textContent).toBe(
      "http://localhost:4010",
    );
    expect(screen.getByTestId("counterparty-gw").textContent).toBe("none");
    expect(localStorage.getItem("cacti_satp_active_gateway")).toBeNull();
    expect(localStorage.getItem("cacti_satp_counterparty_gateway")).toBeNull();
  });
});

describe("SatpGatewayToolbar & DualGatewayFlowCard", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders SatpGatewayToolbar with active gateway and opens manage dialog", async () => {
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <SatpGatewayProvider initialGatewayUrl="http://localhost:4010">
          <SatpGatewayToolbar />
        </SatpGatewayProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText(/GATEWAY:/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Default Local Gateway \(http:\/\/localhost:4010\)/i),
    ).toBeInTheDocument();

    const manageBtn = screen.getByRole("button", {
      name: /Switch \/ Manage Gateways/i,
    });
    expect(manageBtn).toBeInTheDocument();

    await userEvent.click(manageBtn);

    expect(screen.getByText("Manage SATP Gateways")).toBeInTheDocument();
    expect(screen.getByText("CBDC Bridging Demo Mode")).toBeInTheDocument();
    expect(screen.getByText("Load CBDC Preset")).toBeInTheDocument();
  });

  it("renders DualGatewayFlowCard with quick-connect buttons when no counterparty is set", () => {
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <SatpGatewayProvider initialGatewayUrl="http://localhost:4010">
          <DualGatewayFlowCard
            sessionId="test-session-001"
            primaryGatewayUrl="http://localhost:4010"
          />
        </SatpGatewayProvider>
      </QueryClientProvider>,
    );

    expect(
      screen.getByText("Cross-Gateway Real Flow Telemetry"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("SATP PROTOCOL PROGRESSION (RFC DRAFT-16)"),
    ).toBeInTheDocument();
    expect(screen.getByText("Origin Gateway")).toBeInTheDocument();
    expect(
      screen.getByText("No Counterparty Gateway Connected"),
    ).toBeInTheDocument();
  });

  it("renders DualGatewayFlowCard with both origin and destination columns when counterparty is set", () => {
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <SatpGatewayProvider
          initialGatewayUrl="http://localhost:4010"
          initialCounterpartyGatewayUrl="http://localhost:4020"
        >
          <DualGatewayFlowCard
            sessionId="test-session-002"
            primaryGatewayUrl="http://localhost:4010"
            counterpartyGatewayUrl="http://localhost:4020"
          />
        </SatpGatewayProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText("Origin Gateway")).toBeInTheDocument();
    expect(screen.getByText("Destination Gateway")).toBeInTheDocument();
    expect(screen.getByText("http://localhost:4010")).toBeInTheDocument();
    expect(screen.getByText("http://localhost:4020")).toBeInTheDocument();
  });
});
