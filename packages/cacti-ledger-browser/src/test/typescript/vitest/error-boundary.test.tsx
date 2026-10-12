/**
 * Tests for the crash-guard `ErrorBoundary`.
 *
 * The plugin-app architecture renders user-installable apps inside the
 * shell's React tree, so a crashing app must not take the shell down: the
 * boundary catches the render error, swaps in a controlled fallback and
 * leaves sibling UI untouched. The fallback offers the app setup guide next
 * to error states - only for valid URLs
 * (the boundary does not blindly trust the app-provided value).
 *
 * No network access happens in this suite.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ErrorBoundary from "../../../main/typescript/components/ui/ErrorBoundary";

/** A plugin-app child that explodes during render. */
function ThrowingChild(): never {
  throw new Error("plugin app exploded");
}

/** Same, but throws a non-Error value (plugin code may do this). */
function ThrowingNonErrorChild(): never {
  // eslint-disable-next-line @typescript-eslint/no-throw-literal
  throw "a plain string";
}

function HealthyChild(): string {
  return "healthy-child";
}

describe("ErrorBoundary", () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // React logs caught errors even when a boundary handles them (and the
    // boundary itself logs a breadcrumb); silence for clean test output.
    consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it("catches a throwing child and renders a controlled fallback", () => {
    render(
      <ErrorBoundary contextLabel="My SATP Inspector">
        <ThrowingChild />
      </ErrorBoundary>,
    );

    expect(
      screen.getByText("My SATP Inspector could not be rendered"),
    ).toBeInTheDocument();
    expect(screen.getByText(/unexpected error occurred/i)).toBeInTheDocument();
    // The original error message is surfaced for debugging:
    expect(screen.getByText(/plugin app exploded/)).toBeInTheDocument();
  });

  it("leaves sibling UI (the rest of the shell) unaffected", () => {
    render(
      <div>
        <div>header-bar-alive</div>
        <ErrorBoundary contextLabel="Broken App">
          <ThrowingChild />
        </ErrorBoundary>
        <div>other-app-card-alive</div>
      </div>,
    );

    expect(screen.getByText("header-bar-alive")).toBeInTheDocument();
    expect(screen.getByText("other-app-card-alive")).toBeInTheDocument();
    expect(
      screen.getByText("Broken App could not be rendered"),
    ).toBeInTheDocument();
  });

  it("normalizes non-Error throwables into a message", () => {
    render(
      <ErrorBoundary contextLabel="Weird App">
        <ThrowingNonErrorChild />
      </ErrorBoundary>,
    );

    expect(
      screen.getByText("Weird App could not be rendered"),
    ).toBeInTheDocument();
    expect(screen.getByText(/a plain string/)).toBeInTheDocument();
  });

  it("offers the setup guide next to the fallback when the URL is valid", async () => {
    const windowOpen = vi.spyOn(window, "open").mockImplementation(() => null);

    render(
      <ErrorBoundary
        contextLabel="Broken App"
        setupGuideURL="https://hyperledger-cacti.github.io/cacti/setup"
      >
        <ThrowingChild />
      </ErrorBoundary>,
    );

    const guideButton = screen.getByRole("button", { name: /setup guide/i });
    await userEvent.click(guideButton);
    expect(windowOpen).toHaveBeenCalledWith(
      "https://hyperledger-cacti.github.io/cacti/setup",
      "_blank",
    );

    windowOpen.mockRestore();
  });

  it("renders no setup guide link for an unset or invalid URL", () => {
    const windowOpen = vi.spyOn(window, "open").mockImplementation(() => null);

    // Unset URL:
    const { unmount } = render(
      <ErrorBoundary contextLabel="Broken App">
        <ThrowingChild />
      </ErrorBoundary>,
    );
    expect(
      screen.queryByRole("button", { name: /setup guide/i }),
    ).not.toBeInTheDocument();
    unmount();

    // Invalid URL (the boundary does not trust app-provided values):
    render(
      <ErrorBoundary contextLabel="Broken App" setupGuideURL="not a url">
        <ThrowingChild />
      </ErrorBoundary>,
    );
    expect(
      screen.queryByRole("button", { name: /setup guide/i }),
    ).not.toBeInTheDocument();

    windowOpen.mockRestore();
  });

  it("renders children normally while nothing throws", () => {
    render(
      <ErrorBoundary contextLabel="Fine App">
        <HealthyChild />
      </ErrorBoundary>,
    );

    expect(screen.getByText("healthy-child")).toBeInTheDocument();
    expect(screen.queryByText(/could not be rendered/)).not.toBeInTheDocument();
  });
});
