import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Sidebar from "../../../main/typescript/components/Layout/Sidebar";
import { AppInstance } from "../../../main/typescript/common/types/app";

const mockAppConfig: AppInstance[] = [
  {
    id: "app-satp-1",
    appName: "SATP Inspector",
    instanceName: "My SATP Inspector",
    description: "SATP Gateway monitor",
    path: "/satp",
    options: {},
    menuEntries: [
      { title: "Sessions", url: "/" },
      { title: "Gateways", url: "/gateways" },
      { title: "Messages", url: "/messages" },
    ],
    routes: [],
    useAppStatus: () => ({
      isPending: false,
      isInitialized: true,
      status: { severity: "success", message: "OK" },
    }),
    StatusComponent: <div>Status</div>,
  },
];

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("Sidebar Navigation", () => {
  it("renders brand header, overview link, network context and applications", () => {
    renderWithProviders(
      <MemoryRouter initialEntries={["/"]}>
        <Sidebar appConfig={mockAppConfig} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Cacti")).toBeInTheDocument();
    expect(screen.getByText("Ledger Browser")).toBeInTheDocument();
    expect(screen.getByText("Local Environment")).toBeInTheDocument();
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("My SATP Inspector")).toBeInTheDocument();
    expect(screen.getByText("Create")).toBeInTheDocument();
    expect(screen.getByText("v3.0.1")).toBeInTheDocument();
  });

  it("renders sub-navigation entries when inside the active app route", () => {
    renderWithProviders(
      <MemoryRouter initialEntries={["/satp"]}>
        <Sidebar appConfig={mockAppConfig} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Sessions")).toBeInTheDocument();
    expect(screen.getByText("Gateways")).toBeInTheDocument();
    expect(screen.getByText("Messages")).toBeInTheDocument();
  });

  it("opens the Add Application dialog when Create button is clicked", async () => {
    renderWithProviders(
      <MemoryRouter initialEntries={["/"]}>
        <Sidebar appConfig={mockAppConfig} />
      </MemoryRouter>,
    );

    const createBtn = screen.getByRole("button", { name: /create/i });
    await userEvent.click(createBtn);

    expect(screen.getAllByText("Select Group").length).toBeGreaterThan(0);
  });
});
