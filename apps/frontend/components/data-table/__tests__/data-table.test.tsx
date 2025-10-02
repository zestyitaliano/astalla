import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ColumnDef } from "@tanstack/react-table";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "../data-table";

interface SampleRow {
  id: string;
  name: string;
  status: string;
}

const columns: ColumnDef<SampleRow>[] = [
  {
    accessorKey: "name",
    id: "name",
    header: "Name",
    meta: {
      editable: true,
      placeholder: "Name"
    }
  },
  {
    accessorKey: "status",
    id: "status",
    header: "Status",
    meta: {
      editable: true,
      placeholder: "Status"
    }
  }
];

const rows: SampleRow[] = [
  { id: "row-1", name: "Alpha", status: "Green" },
  { id: "row-2", name: "Beta", status: "Delayed" }
];

describe("DataTable", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("restores column order from persistence", async () => {
    const key = "astalla:test-table";
    window.localStorage.setItem(
      key,
      JSON.stringify({
        columnOrder: ["__select", "status", "name"],
        columnVisibility: {},
        columnSizing: {},
        density: "comfortable"
      })
    );

    render(<DataTable columns={columns} data={rows} storageKey={key} />);

    const headers = screen.getAllByRole("columnheader");
    expect(headers.map((header) => header.textContent?.trim())).toEqual([
      "",
      "Status",
      "Name"
    ]);
  });

  it("commits and cancels editable cell changes", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<DataTable columns={columns} data={rows} storageKey="astalla:edit" onDataChange={handleChange} />);

    const nameCell = screen.getByRole("textbox", { name: "Name" });
    await user.dblClick(nameCell);
    const input = within(nameCell).getByRole("textbox");

    await user.clear(input);
    await user.type(input, "Gamma");
    input.blur();

    expect(handleChange).toHaveBeenCalledWith([
      { id: "row-1", name: "Gamma", status: "Green" },
      { id: "row-2", name: "Beta", status: "Delayed" }
    ]);

    await act(async () => {
      await user.dblClick(nameCell);
    });

    const secondInput = within(nameCell).getByRole("textbox");
    await user.clear(secondInput);
    await user.type(secondInput, "Delta");
    await user.keyboard("{Escape}");

    expect(nameCell).toHaveTextContent("Gamma");
  });

  it("toggles density", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={rows} storageKey="astalla:density" />);

    const compactButton = screen.getByRole("button", { name: /compact/i });
    await user.click(compactButton);

    const table = screen.getByRole("table");
    expect(table.className).toContain("[&_td]:py-2");
  });
});
