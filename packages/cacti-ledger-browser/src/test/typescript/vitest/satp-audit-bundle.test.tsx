/**
 * Tests for the session audit bundle export: the builder keeps the raw
 * gateway evidence intact (snapshots, merged claims, ordering) and the
 * download flow goes through a blob URL with the expected filename.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AUDIT_BUNDLE_SCHEMA_VERSION,
  buildAuditBundle,
} from "../../../main/typescript/apps/satp/audit-bundle";
import type { SatpSessionDetail } from "../../../main/typescript/apps/satp/transform";

const NOW = Date.UTC(2026, 8, 20, 12, 0, 0);

function detail(): SatpSessionDetail {
  return {
    sessionId: "alpha",
    events: [
      {
        sequenceNumber: 1,
        type: "TRANSFER_PROPOSAL",
        operation: "TRANSFER_PROPOSAL",
        timestampMs: NOW - 60_000,
        snapshot: { state: 2, lockAssertionClaim: { proof: "early" } },
      },
      {
        sequenceNumber: 2,
        auditEntryId: "alpha-2",
        type: "TRANSFER_COMPLETE",
        operation: "TRANSFER_COMPLETE",
        timestampMs: NOW,
        snapshot: { state: 2, digitalAssetId: "0xabc" },
      },
    ],
    latestSnapshot: { state: 2, digitalAssetId: "0xabc" },
  };
}

describe("buildAuditBundle", () => {
  it("produces a self-describing bundle with ordered raw evidence", () => {
    const bundle = buildAuditBundle(
      detail(),
      { status: "DONE", substatus: "FINAL", startTime: "2026-09-20T11:00:00Z" },
      NOW,
    );

    expect(bundle.schemaVersion).toBe(AUDIT_BUNDLE_SCHEMA_VERSION);
    expect(bundle.generatedAt).toBe("2026-09-20T12:00:00.000Z");
    expect(bundle.sessionId).toBe("alpha");
    expect(bundle.eventCount).toBe(2);
    expect(bundle.status).toEqual({
      status: "DONE",
      substatus: "FINAL",
      stage: undefined,
      startTime: "2026-09-20T11:00:00Z",
    });

    // Timeline order preserved with raw snapshots as the gateway wrote them.
    expect(bundle.timeline.map((event) => event.sequenceNumber)).toEqual([
      1, 2,
    ]);
    expect(bundle.timeline[0].snapshot).toEqual({
      state: 2,
      lockAssertionClaim: { proof: "early" },
    });
    expect(bundle.timeline[0].auditEntryId).toBeUndefined();
    expect(bundle.timeline[1].auditEntryId).toBe("alpha-2");

    // Claims merged across the timeline (highest sequence wins).
    expect(bundle.claims).toEqual({ lockAssertionClaim: { proof: "early" } });
  });

  it("omits status and unknown timestamps instead of writing nulls", () => {
    const bundle = buildAuditBundle(
      {
        sessionId: "beta",
        events: [{ sequenceNumber: 1, type: "T", operation: "" }],
      },
      undefined,
      NOW,
    );
    expect(bundle.status).toBeUndefined();
    expect(bundle.timeline[0].timestamp).toBeUndefined();
    expect(bundle.timeline[0].snapshot).toBeUndefined();
  });
});

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

import SessionDetailPage from "../../../main/typescript/apps/satp/pages/SessionDetailPage";
import {
  fetchAuditEntries,
  fetchSessionStatus,
} from "../../../main/typescript/apps/satp/api";

describe("SessionDetailPage export button", () => {
  beforeEach(() => {
    const timestamp = NOW - 60_000;
    vi.mocked(fetchAuditEntries).mockResolvedValue([
      {
        auditEntryId: "alpha-1",
        timestamp,
        session: {
          sessionId: "alpha",
          type: "TRANSFER_PROPOSAL",
          key: "alpha",
          operation: "TRANSFER_PROPOSAL",
          sequenceNumber: 1,
          timestamp: String(timestamp),
          data: JSON.stringify({ state: 2 }),
        },
      },
    ]);
    vi.mocked(fetchSessionStatus).mockResolvedValue({
      status: "DONE",
      substatus: "FINAL",
      stage: "STAGE_3",
      step: "transferComplete",
      startTime: "2026-09-20T11:59:00Z",
    });
  });

  it("downloads the audit bundle as a JSON file", async () => {
    const user = userEvent.setup();
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:mock");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockReturnValue();
    // downloadJson removes the anchor right after clicking, so capture it
    // from the click spy itself rather than querying the detached DOM.
    let clickedAnchor: HTMLAnchorElement | undefined;
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias -- the only way to grab the anchor: it is detached from the DOM immediately after this call
        const anchor = this;
        clickedAnchor = anchor;
      });

    render(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: { queries: { retry: false, gcTime: 0 } },
          })
        }
      >
        <MemoryRouter initialEntries={["/satp/session/alpha"]}>
          <Routes>
            <Route
              path="/satp"
              element={
                <Outlet context={{ gatewayUrl: "http://localhost:4010" }} />
              }
            >
              <Route
                path="session/:sessionId"
                element={<SessionDetailPage />}
              />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const exportButton = await screen.findByRole("button", {
      name: /export audit bundle/i,
    });
    await user.click(exportButton);

    await waitFor(() => expect(anchorClick).toHaveBeenCalledTimes(1));
    expect(clickedAnchor?.download).toBe("satp-alpha-audit-bundle.json");
    expect(clickedAnchor?.href).toContain("blob:mock");

    const blob = createObjectURL.mock.calls[0][0] as Blob;
    // jsdom's Blob lacks .text(); read it through FileReader instead.
    const blobText = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob);
    });
    const payload = JSON.parse(blobText);
    expect(payload.schemaVersion).toBe(AUDIT_BUNDLE_SCHEMA_VERSION);
    expect(payload.sessionId).toBe("alpha");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock");
  });
});
