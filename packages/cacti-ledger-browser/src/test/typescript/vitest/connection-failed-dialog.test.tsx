/**
 * Tests for the connection-failed dialog: it must be self-actionable - show
 * the resolved store URL (schema, never the API key), the one-command local
 * quickstart and a working link to the setup guide.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ConnectionFailedDialog from "../../../main/typescript/components/ConnectionFailedDialog/ConnectionFailedDialog";

describe("ConnectionFailedDialog", () => {
  it("shows the resolved store URL and schema (never the key)", () => {
    render(<ConnectionFailedDialog />);
    // The store URL appears in the details and again in the quickstart
    // sentence - assert on the details value specifically.
    expect(screen.getByText("Store URL")).toBeInTheDocument();
    expect(screen.getByText("http://localhost:8000")).toBeInTheDocument();
    expect(screen.getByText("Schema")).toBeInTheDocument();
    expect(screen.getByText("public")).toBeInTheDocument();
    // The API key must never appear in the dialog.
    expect(screen.queryByText(/SUPABASE_KEY/i)).toBeNull();
  });

  it("links the setup guide", () => {
    render(<ConnectionFailedDialog />);
    const guide = screen.getByRole("link", { name: "Open the setup guide" });
    expect(guide.getAttribute("href")).toBe(
      "https://hyperledger-cacti.github.io/cacti/latest/cactus/ledger-browser/setup/",
    );
    expect(guide.getAttribute("target")).toBe("_blank");
  });

  it("can be closed with the close button when dismissible", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ConnectionFailedDialog onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("opens Settings to change the connection", async () => {
    const user = userEvent.setup();
    render(<ConnectionFailedDialog />);
    await user.click(screen.getByRole("button", { name: "Change connection" }));
    expect(await screen.findByLabelText("Store URL")).toHaveValue(
      "http://localhost:8000",
    );
  });

  it("offers retry and dismiss when handlers are given", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const onClose = vi.fn();
    render(<ConnectionFailedDialog onRetry={onRetry} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("disables retry while a retry is in flight", () => {
    render(<ConnectionFailedDialog onRetry={() => undefined} retrying />);
    expect(screen.getByRole("button", { name: /Retrying/ })).toBeDisabled();
  });

  it("has no retry/dismiss buttons without handlers and hides when closed", async () => {
    const { rerender } = render(<ConnectionFailedDialog />);
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();
    expect(screen.queryByRole("button", { name: "close" })).toBeNull();
    rerender(<ConnectionFailedDialog open={false} />);
    // The dialog unmounts after its exit transition.
    await waitFor(() =>
      expect(screen.queryByText("Connection Error")).toBeNull(),
    );
  });

  it("shows the one-command local quickstart", () => {
    render(<ConnectionFailedDialog />);
    expect(
      screen.getByText(/ledger-browser-config-postgrest/),
    ).toBeInTheDocument();
  });
});
