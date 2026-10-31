/**
 * Tests for the connection-failed dialog: it must be self-actionable - show
 * the resolved store URL (schema, never the API key), the one-command local
 * quickstart and a working link to the setup guide.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ConnectionFailedDialog from "../../../main/typescript/components/ConnectionFailedDialog/ConnectionFailedDialog";

describe("ConnectionFailedDialog", () => {
  it("shows the resolved store URL and schema (never the key)", () => {
    render(<ConnectionFailedDialog />);
    // The store URL appears in the details list and again in the
    // quickstart sentence - assert on the details entry specifically.
    const details = screen.getAllByText(/http:\/\/localhost:8000/);
    expect(details.length).toBeGreaterThanOrEqual(2);
    expect(details.some((element) => element.closest("li") !== null)).toBe(
      true,
    );
    expect(screen.getByText(/public/)).toBeInTheDocument();
    // The API key must never appear in the dialog.
    expect(screen.queryByText(/SUPABASE_KEY/i)).toBeNull();
  });

  it("links the setup guide", () => {
    render(<ConnectionFailedDialog />);
    const guide = screen.getByRole("link", { name: "Open the setup guide" });
    expect(guide.getAttribute("href")).toBe(
      "https://hyperledger-cacti.github.io/cacti/cactus/ledger-browser/setup/",
    );
    expect(guide.getAttribute("target")).toBe("_blank");
  });

  it("shows the one-command local quickstart", () => {
    render(<ConnectionFailedDialog />);
    expect(
      screen.getByText(/ledger-browser-config-postgrest/),
    ).toBeInTheDocument();
  });
});
