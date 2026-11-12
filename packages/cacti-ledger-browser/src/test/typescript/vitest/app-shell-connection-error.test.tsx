/**
 * The ledger browser shell must stay usable when the app configuration
 * store is unreachable: the sidebar/header keep rendering, the error is a
 * dismissible dialog plus an inline banner, and Retry recovers in place
 * (the error -> success transition must not change the hook order).
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
  queryOptions,
} from "@tanstack/react-query";
import { ThemeProvider, createTheme } from "@mui/material/styles";

const loadConfig = vi.fn();

vi.mock("../../../main/typescript/common/queries", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("../../../main/typescript/common/queries")
    >();
  return {
    ...actual,
    guiAppConfig: () =>
      queryOptions({
        queryKey: ["test", "gui_app_config"],
        queryFn: () => loadConfig(),
      }),
  };
});

import { App } from "../../../main/typescript/CactiLedgerBrowserApp";
import { themeOptions } from "../../../main/typescript/theme";

function renderShell() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <ThemeProvider theme={createTheme(themeOptions)}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe("App shell on a config store outage", () => {
  beforeEach(() => {
    loadConfig.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("keeps the shell, shows a dismissible dialog and an inline banner", async () => {
    const user = userEvent.setup();
    loadConfig.mockRejectedValue(new Error("connection refused"));
    renderShell();

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Connection Error")).toBeInTheDocument();
    // The shell (sidebar logo, header actions) is still there behind it.
    expect(screen.getByLabelText("Hyperledger Cacti Logo")).toBeInTheDocument();
    expect(screen.getByLabelText("app-documentation-link")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Dismiss" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    const banner = screen.getByRole("alert");
    expect(banner).toHaveTextContent(
      "Could not load the app configuration store",
    );

    // "Details" reopens the dialog.
    await user.click(within(banner).getByRole("button", { name: "Details" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("recovers in place on retry", async () => {
    const user = userEvent.setup();
    loadConfig.mockRejectedValueOnce(new Error("connection refused"));
    loadConfig.mockResolvedValue([]);
    renderShell();

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(
      screen.queryByText(/Could not load the app configuration store/),
    ).toBeNull();
    expect(loadConfig).toHaveBeenCalledTimes(2);
  });
});
