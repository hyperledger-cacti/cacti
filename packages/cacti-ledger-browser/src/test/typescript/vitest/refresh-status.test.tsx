/**
 * Unit tests for the live refresh indicator: honest about data age and about
 * the polling state, including the exponential-backoff case where a fixed
 * "every Ns" caption would be wrong. Uses the deterministic `nowMs` prop.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import RefreshStatus from "../../../main/typescript/apps/satp/components/RefreshStatus";

const NOW = Date.UTC(2026, 8, 20, 12, 0, 0);

function renderStatus(
  props: Partial<Parameters<typeof RefreshStatus>[0]> = {},
) {
  return render(
    <RefreshStatus
      updatedAtMs={NOW - 42_000}
      isError={false}
      isFetching={false}
      nowMs={NOW}
      {...props}
    />,
  );
}

describe("RefreshStatus", () => {
  it("shows the data age relative to now", () => {
    renderStatus();
    expect(screen.getByText(/Updated 42s ago/i)).toBeInTheDocument();
    expect(screen.getByText("live")).toBeInTheDocument();
  });

  it("reports the backoff state instead of a fixed cadence on errors", () => {
    renderStatus({ isError: true });
    expect(screen.getByText("backing off")).toBeInTheDocument();
  });

  it("reports an in-flight refresh", () => {
    renderStatus({ isFetching: true });
    expect(screen.getByText("refreshing")).toBeInTheDocument();
  });

  it("handles a query that has never completed", () => {
    const first = renderStatus({ updatedAtMs: undefined });
    expect(screen.getByText(/not updated yet/i)).toBeInTheDocument();
    first.unmount();
    // react-query reports dataUpdatedAt 0 before the first success.
    renderStatus({ updatedAtMs: 0 });
    expect(screen.getByText(/not updated yet/i)).toBeInTheDocument();
  });
});
