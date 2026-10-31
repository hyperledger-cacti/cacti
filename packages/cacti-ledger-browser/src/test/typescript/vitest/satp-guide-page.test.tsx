/**
 * Component tests for the in-app setup guide: live gateway status for the
 * configured instance, copyable command blocks for each step, and links to
 * the full documentation. Everything is mocked - no network access.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import GuidePage from "../../../main/typescript/apps/satp/pages/GuidePage";
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

import { fetchGatewayHealth } from "../../../main/typescript/apps/satp/api";

const SATP_OPTIONS: SatpAppOptions = {
  gatewayUrl: "http://localhost:4010",
  prometheusUrl: "http://localhost:9090",
};

let mountedContainer: HTMLElement;

function containerCommandTexts(): string[] {
  return Array.from(mountedContainer.querySelectorAll("pre")).map(
    (element) => element.textContent ?? "",
  );
}

function renderGuidePage() {
  const rendered = render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false, gcTime: 0 } },
        })
      }
    >
      <MemoryRouter initialEntries={["/satp/guide"]}>
        <Routes>
          <Route path="/satp" element={<Outlet context={SATP_OPTIONS} />}>
            <Route path="guide" element={<GuidePage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  mountedContainer = rendered.container;
  return rendered;
}

describe("GuidePage", () => {
  beforeEach(() => {
    vi.mocked(fetchGatewayHealth).mockReset();
  });

  it("shows the unreachable status and the hint when the gateway is down", async () => {
    vi.mocked(fetchGatewayHealth).mockRejectedValue(new Error("down"));
    renderGuidePage();

    expect(
      await screen.findByText(
        "gateway unreachable — backing off",
        {},
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/follow the steps below/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        (_content, element) =>
          element?.tagName === "CODE" &&
          (element.textContent ?? "").includes("localhost:4010"),
      ),
    ).toBeInTheDocument();
  });

  it("shows the reachable status when the healthcheck answers", async () => {
    vi.mocked(fetchGatewayHealth).mockResolvedValue("AVAILABLE");
    renderGuidePage();

    expect(await screen.findByText("gateway reachable")).toBeInTheDocument();
    expect(screen.queryByText(/follow the steps below/i)).toBeNull();
  });

  it("renders the three setup steps with copyable commands", async () => {
    vi.mocked(fetchGatewayHealth).mockRejectedValue(new Error("down"));
    renderGuidePage();

    expect(
      screen.getByText("Start a SATP Hermes gateway (with Prometheus)"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Point this app at the gateway"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Run transfers and watch them appear"),
    ).toBeInTheDocument();

    const commandTexts = containerCommandTexts();
    expect(commandTexts[0]).toContain("docker compose --project-directory");
    expect(commandTexts[0]).toContain("docker-compose-satp.yml up -d --build");
    expect(commandTexts[1]).toContain("cactus-plugin-satp-hermes/healthcheck");
    expect(commandTexts[2]).toContain("test:integration:docker-local");

    // Every command block has a copy button.
    expect(
      screen.getAllByRole("button", { name: "copy command" }),
    ).toHaveLength(3);
  });

  it("copies a command block to the clipboard", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    vi.mocked(fetchGatewayHealth).mockRejectedValue(new Error("down"));
    renderGuidePage();

    await user.click(
      screen.getAllByRole("button", { name: "copy command" })[0],
    );
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(String(writeText.mock.calls[0][0])).toContain("docker compose");
  });

  it("links to the full documentation", () => {
    vi.mocked(fetchGatewayHealth).mockRejectedValue(new Error("down"));
    renderGuidePage();

    const docsLink = screen.getByRole("link", { name: "Full documentation" });
    expect(docsLink.getAttribute("href")).toBe(
      "https://hyperledger-cacti.github.io/cacti/cactus/ledger-browser/plugin-apps/satp-inspector/",
    );
  });
});
