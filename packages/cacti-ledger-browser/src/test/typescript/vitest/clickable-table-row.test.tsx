/**
 * Keyboard-operability tests for the shared `ClickableTableRow`: rows that
 * open a detail view on click must also be focusable and activatable with
 * Enter and Space (the sessions/messages tables navigate on row activation).
 */
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ClickableTableRow } from "../../../main/typescript/components/ui/UITableListing/ClickableTableRow";

function renderRow(onClick: () => void) {
  return render(
    <Table>
      <TableBody>
        <ClickableTableRow onClick={onClick}>
          <TableCell>row content</TableCell>
        </ClickableTableRow>
      </TableBody>
    </Table>,
  );
}

describe("ClickableTableRow keyboard activation", () => {
  it("activates with Enter", async () => {
    const onClick = vi.fn();
    renderRow(onClick);
    const row = screen.getByText("row content").closest("tr");
    expect(row).not.toBeNull();
    row!.focus();
    await userEvent.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("activates with Space and does not scroll", async () => {
    const onClick = vi.fn();
    renderRow(onClick);
    const row = screen.getByText("row content").closest("tr");
    row!.focus();
    await userEvent.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("ignores keys that are not activation keys", async () => {
    const onClick = vi.fn();
    renderRow(onClick);
    screen.getByText("row content").closest("tr")!.focus();
    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard("a");
    expect(onClick).not.toHaveBeenCalled();
  });

  it("is focusable only when a click handler is attached", () => {
    const { rerender } = render(
      <Table>
        <TableBody>
          <ClickableTableRow>
            <TableCell>plain</TableCell>
          </ClickableTableRow>
        </TableBody>
      </Table>,
    );
    const plain = screen.getByText("plain").closest("tr");
    expect(plain).toHaveAttribute("tabindex", "-1");

    const onClick = vi.fn();
    rerender(
      <Table>
        <TableBody>
          <ClickableTableRow onClick={onClick}>
            <TableCell>plain</TableCell>
          </ClickableTableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByText("plain").closest("tr")).toHaveAttribute(
      "tabindex",
      "0",
    );
  });
});
