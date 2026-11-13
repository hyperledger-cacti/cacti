/**
 * Multi-gateway support of the SATP inspector: the per-instance gateway
 * context (no built-in hosts, config + viewer gateways, precedence, scoped
 * storage), the toolbar and manage dialog, and the cross-gateway session
 * card. All gateway calls are module-mocked.
 */
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type Mock,
} from "vitest";
import { render, screen, act, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("../../../main/typescript/apps/satp/api", () => ({
  createSatpAdminApi: vi.fn((options: { gatewayUrl: string }) => ({
    gatewayUrl: options.gatewayUrl,
  })),
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
  fetchSessionStatus,
} from "../../../main/typescript/apps/satp/api";
import {
  SatpGatewayProvider,
  useSatpGatewayContext,
} from "../../../main/typescript/apps/satp/context/GatewayContext";
import { SatpPollingProvider } from "../../../main/typescript/apps/satp/context/PollingContext";
import { gatewayStorageKeys } from "../../../main/typescript/apps/satp/gateways";
import SatpGatewayToolbar from "../../../main/typescript/apps/satp/components/SatpGatewayToolbar";
import DualGatewayFlowCard from "../../../main/typescript/apps/satp/components/DualGatewayFlowCard";
import type {
  SatpAppOptions,
  SatpGatewayEndpoint,
} from "../../../main/typescript/apps/satp/types";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
}

type Ctx = ReturnType<typeof useSatpGatewayContext>;

function TestConsumer({ onContext }: { onContext: (ctx: Ctx) => void }) {
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

const OPTIONS: SatpAppOptions = {
  gatewayUrl: "http://gw-a.test:4010",
  counterpartyGatewayUrl: "http://gw-b.test:4110",
  gateways: [{ name: "Third", url: "http://gw-c.test:4210/" }],
};

function renderContext(
  options: SatpAppOptions | undefined,
  appInstanceId = "instance-1",
) {
  let ctx!: Ctx;
  const utils = render(
    <SatpGatewayProvider
      appInstanceId={appInstanceId}
      options={options}
      fallbackGatewayUrl="http://fallback.test:4010"
    >
      <TestConsumer onContext={(value) => (ctx = value)} />
    </SatpGatewayProvider>,
  );
  return { ...utils, ctx: () => ctx };
}

describe("SatpGatewayProvider", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("lists only the instance's gateways: no built-in presets", () => {
    const { ctx } = renderContext(OPTIONS);
    expect(ctx().gateways.map((gw) => gw.url)).toEqual([
      "http://gw-a.test:4010",
      "http://gw-b.test:4110",
      "http://gw-c.test:4210",
    ]);
    expect(ctx().gateways.every((gw) => gw.source === "config")).toBe(true);
    expect(ctx().gateways.map((gw) => gw.name)).toEqual([
      "Primary gateway",
      "Counterparty gateway",
      "Third",
    ]);
  });

  it("starts on the instance gatewayUrl and its configured counterparty", () => {
    renderContext(OPTIONS);
    expect(screen.getByTestId("active-gw")).toHaveTextContent(
      "http://gw-a.test:4010",
    );
    expect(screen.getByTestId("counterparty-gw")).toHaveTextContent(
      "http://gw-b.test:4110",
    );
  });

  it("falls back to the runtime default only when the instance names no gateway", () => {
    const { ctx } = renderContext({ gatewayUrl: "" });
    expect(ctx().gateways).toHaveLength(0);
    expect(ctx().activeGatewayUrl).toBe("http://fallback.test:4010");
  });

  it("switches the active gateway and remembers it per instance", () => {
    const { ctx, unmount } = renderContext(OPTIONS);
    act(() => ctx().setActiveGatewayUrl("http://gw-c.test:4210"));
    expect(screen.getByTestId("active-gw")).toHaveTextContent(
      "http://gw-c.test:4210",
    );
    expect(
      localStorage.getItem(gatewayStorageKeys("instance-1").activeGateway),
    ).toBe("http://gw-c.test:4210");
    unmount();

    // Same instance: choice restored.
    renderContext(OPTIONS);
    expect(screen.getByTestId("active-gw")).toHaveTextContent(
      "http://gw-c.test:4210",
    );
  });

  it("does not leak one instance's selection into another instance", () => {
    const first = renderContext(OPTIONS, "instance-1");
    act(() => first.ctx().setActiveGatewayUrl("http://gw-c.test:4210"));
    first.unmount();

    const second = renderContext(OPTIONS, "instance-2");
    expect(second.ctx().activeGatewayUrl).toBe("http://gw-a.test:4010");
  });

  it("ignores a stored selection that is no longer in the gateway list", () => {
    localStorage.setItem(
      gatewayStorageKeys("instance-1").activeGateway,
      "http://removed.test:1",
    );
    const { ctx } = renderContext(OPTIONS);
    expect(ctx().activeGatewayUrl).toBe("http://gw-a.test:4010");
  });

  it("keeps an explicitly cleared counterparty cleared across reloads", () => {
    const { ctx, unmount } = renderContext(OPTIONS);
    act(() => ctx().setCounterpartyGatewayUrl(undefined));
    expect(screen.getByTestId("counterparty-gw")).toHaveTextContent("none");
    unmount();

    renderContext(OPTIONS);
    expect(screen.getByTestId("counterparty-gw")).toHaveTextContent("none");
  });

  it("never uses the active gateway as its own counterparty", () => {
    const { ctx } = renderContext(OPTIONS);
    act(() => ctx().setActiveGatewayUrl("http://gw-b.test:4110"));
    expect(ctx().counterpartyGatewayUrl).toBeUndefined();
  });

  it("adds and removes viewer gateways with URL validation", () => {
    const { ctx } = renderContext(OPTIONS);

    let added = false;
    act(() => {
      added = ctx().addGateway({ name: "Bad", url: "javascript:alert(1)" });
    });
    expect(added).toBe(false);
    expect(ctx().gateways).toHaveLength(3);

    act(() => {
      added = ctx().addGateway({ name: "Mine", url: "http://mine.test:5000/" });
    });
    expect(added).toBe(true);
    const mine = ctx().gateways.find((gw) => gw.source === "user");
    expect(mine).toMatchObject({ name: "Mine", url: "http://mine.test:5000" });

    // A viewer gateway with a configured URL is not listed twice.
    act(() => {
      ctx().addGateway({ name: "Dup", url: "http://gw-a.test:4010" });
    });
    expect(
      ctx().gateways.filter((gw) => gw.url === "http://gw-a.test:4010"),
    ).toHaveLength(1);

    act(() => ctx().removeGateway(mine!.id));
    expect(ctx().gateways.some((gw) => gw.name === "Mine")).toBe(false);
  });

  it("drops malformed stored gateways instead of crashing", () => {
    localStorage.setItem(
      gatewayStorageKeys("instance-1").userGateways,
      JSON.stringify([
        { id: "ok", name: "Ok", url: "http://ok.test:1" },
        { id: "bad", name: "Bad", url: "ftp://bad.test" },
        "not an object",
      ]),
    );
    const { ctx } = renderContext(OPTIONS);
    expect(ctx().gateways.map((gw) => gw.name)).toContain("Ok");
    expect(ctx().gateways.map((gw) => gw.name)).not.toContain("Bad");
  });

  it("resets this browser's gateways and choices", () => {
    const { ctx } = renderContext(OPTIONS);
    act(() => {
      ctx().addGateway({ name: "Mine", url: "http://mine.test:5000" });
      ctx().setActiveGatewayUrl("http://gw-c.test:4210");
    });
    act(() => ctx().resetToDefaults());
    expect(ctx().gateways).toHaveLength(3);
    expect(ctx().activeGatewayUrl).toBe("http://gw-a.test:4010");
    expect(
      localStorage.getItem(gatewayStorageKeys("instance-1").userGateways),
    ).toBeNull();
  });
});

describe("SatpGatewayToolbar", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.clearAllMocks());

  function renderToolbar() {
    return render(
      <QueryClientProvider client={createTestQueryClient()}>
        <SatpGatewayProvider appInstanceId="instance-1" options={OPTIONS}>
          <SatpPollingProvider>
            <SatpGatewayToolbar options={OPTIONS} />
          </SatpPollingProvider>
        </SatpGatewayProvider>
      </QueryClientProvider>,
    );
  }

  it("shows the active gateway, counterparty and polling controls", () => {
    renderToolbar();
    expect(
      screen.getByText(/Primary gateway · http:\/\/gw-a.test:4010/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Counterparty gateway · http:\/\/gw-b.test:4110/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "pause live updates" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Manage gateways (3)" }),
    ).toBeInTheDocument();
  });

  it("opens the manage dialog listing every gateway with its source", async () => {
    const user = userEvent.setup();
    renderToolbar();
    await user.click(
      screen.getByRole("button", { name: "Manage gateways (3)" }),
    );

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText("Manage SATP gateways"),
    ).toBeInTheDocument();
    expect(within(dialog).getAllByText("App config")).toHaveLength(3);
    expect(within(dialog).getByText("Third")).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: /Save to app config/ }),
    ).toBeEnabled();
  });

  it("validates the URL of a gateway added in the dialog", async () => {
    const user = userEvent.setup();
    renderToolbar();
    await user.click(
      screen.getByRole("button", { name: "Manage gateways (3)" }),
    );
    const dialog = await screen.findByRole("dialog");

    await user.type(
      within(dialog).getByLabelText("Gateway OAPI (REST) URL"),
      "not a url",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Add gateway" }),
    );
    expect(
      within(dialog).getByText(/Enter an absolute http\(s\) URL/),
    ).toBeInTheDocument();

    await user.clear(within(dialog).getByLabelText("Gateway OAPI (REST) URL"));
    await user.type(within(dialog).getByLabelText("Name"), "Fourth");
    await user.type(
      within(dialog).getByLabelText("Gateway OAPI (REST) URL"),
      "http://gw-d.test:4310",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Add gateway" }),
    );
    expect(within(dialog).getByText("Fourth")).toBeInTheDocument();
    expect(within(dialog).getByText("This browser")).toBeInTheDocument();
  });
});

describe("DualGatewayFlowCard (cross-gateway session)", () => {
  const GATEWAYS: SatpGatewayEndpoint[] = [
    { id: "a", name: "Origin", url: "http://gw-a.test:4010", source: "config" },
    {
      id: "b",
      name: "Destination",
      url: "http://gw-b.test:4110",
      source: "config",
    },
  ];

  beforeEach(() => {
    (fetchAuditEntries as Mock).mockImplementation(
      async (api: { gatewayUrl: string }) => [
        {
          auditEntryId: `${api.gatewayUrl}-1`,
          timestamp: 1_000,
          session: {
            sessionId: "s-1",
            type: api.gatewayUrl.includes("gw-a")
              ? "LOCK_ASSERT"
              : "TRANSFER_PROPOSAL_RECEIPT",
            sequenceNumber: 1,
            data: JSON.stringify({
              state: 1,
              senderGatewayNetworkId: "Besu",
              recipientGatewayNetworkId: "Fabric",
            }),
          },
        },
      ],
    );
    (fetchSessionStatus as Mock).mockImplementation(
      async (api: { gatewayUrl: string }) =>
        api.gatewayUrl.includes("gw-a")
          ? {
              status: "PENDING",
              substatus: "WAIT_DESTINATION_TRANSACTION",
              stage: "STAGE_2",
            }
          : {
              status: "PENDING",
              substatus: "WAIT_SOURCE_CONFIRMATIONS",
              stage: "STAGE_1",
            },
    );
  });
  afterEach(() => vi.clearAllMocks());

  it("looks the session up on every gateway and shows each side", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <DualGatewayFlowCard
          sessionId="s-1"
          gateways={GATEWAYS}
          options={{ gatewayUrl: GATEWAYS[0].url }}
          timelineGatewayUrl={GATEWAYS[0].url}
          onSelectTimelineGateway={onSelect}
        />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText("WAIT_DESTINATION_TRANSACTION"),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("WAIT_SOURCE_CONFIRMATIONS"),
    ).toBeInTheDocument();
    expect(screen.getByText(/seen on 2 of 2 gateways/)).toBeInTheDocument();
    expect(screen.getByText("In flight between gateways")).toBeInTheDocument();
    // Route from the snapshot, not from a guessed "origin" label.
    expect(screen.getByText("Besu")).toBeInTheDocument();
    expect(screen.getByText("Fabric")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Show this gateway's timeline" }),
    );
    expect(onSelect).toHaveBeenCalledWith(GATEWAYS[1].url);
  });

  it("invites adding a counterparty when only one gateway is configured", async () => {
    const onManage = vi.fn();
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <DualGatewayFlowCard
          sessionId="s-1"
          gateways={[GATEWAYS[0]]}
          options={{ gatewayUrl: GATEWAYS[0].url }}
          onOpenManageGateways={onManage}
        />
      </QueryClientProvider>,
    );
    expect(screen.getByText("Only one gateway configured")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Add a gateway" }),
    );
    expect(onManage).toHaveBeenCalled();
    await waitFor(() => expect(fetchSessionStatus).toHaveBeenCalledTimes(1));
  });
});
