import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { TableColumnDto } from "@shared/api";

import { ColumnSettingsDrawer } from "../ColumnSettingsDrawer";

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return render(ui, { wrapper: Wrapper });
}

describe("ColumnSettingsDrawer", () => {
  const baseColumn = {
    id: "leases.UnitId",
    tableId: "public.leases",
    name: "Unit",
    slug: "unit",
    type: "REFERENCE",
    position: 1,
    config: {}
  } as TableColumnDto;

  let fetchMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchMock = vi.spyOn(global, "fetch");
    (global as any).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  afterEach(() => {
    fetchMock.mockRestore();
    delete (global as any).ResizeObserver;
  });

  it("renders controls, waits for a target selection, and saves reference settings", async () => {
    const tableChoices = [
      { id: "public.leases", name: "leases" },
      { id: "public.units", name: "units", label: "Units" }
    ];
    const columnChoices = [
      { id: "units.Id", name: "Id", type: "text" },
      { id: "units.Name", name: "Name", type: "text" }
    ];

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url.includes("/api/tables/choices")) {
        return Promise.resolve(
          new Response(JSON.stringify(tableChoices), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          })
        );
      }

      if (url.includes("/api/tables/public.units/columns/choices")) {
        return Promise.resolve(
          new Response(JSON.stringify(columnChoices), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          })
        );
      }

      if (url.includes("/api/tables/public.leases/columns/leases.UnitId") && init?.method === "PATCH") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              column: {
                id: "leases.UnitId",
                tableId: "public.leases",
                name: "Unit",
                type: "REFERENCE",
                referenceConfig: {
                  targetTableId: "public.units",
                  displayColumnId: "units.Name",
                  cardinality: "single",
                  enforceForeignKey: false
                }
              }
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" }
            }
          )
        );
      }

      return Promise.reject(new Error(`Unhandled fetch request for ${url}`));
    });

    const onClose = vi.fn();
    renderWithClient(
      <ColumnSettingsDrawer tableId="public.leases" column={baseColumn} open onClose={onClose} />
    );

    const targetSelect = await screen.findByLabelText(/target table/i);
    const displaySelect = screen.getByLabelText(/display column/i) as HTMLSelectElement;

    expect(displaySelect).toBeDisabled();

    const user = userEvent.setup();
    await waitFor(() => expect(targetSelect).not.toBeDisabled());
    await user.selectOptions(targetSelect, "public.units");

    await waitFor(() => expect(displaySelect).not.toBeDisabled());
    expect(displaySelect.value).toBe("units.Name");

    const saveButton = screen.getByRole("button", { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => expect(onClose).toHaveBeenCalled());

    const patchCall = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH");
    expect(patchCall).toBeDefined();
    const body = patchCall?.[1]?.body;
    expect(typeof body).toBe("string");
    const parsed = JSON.parse(body as string);
    expect(parsed.type).toBe("reference");
    expect(parsed.referenceConfig).toMatchObject({
      targetTableId: "public.units",
      displayColumnId: "units.Name",
      cardinality: "single",
      enforceForeignKey: false
    });
  });

  it("auto-selects a display column when the saved value is unavailable", async () => {
    const tableChoices = [
      { id: "public.units", name: "units", label: "Units" }
    ];
    const columnChoices = [
      { id: "units.Id", name: "Id", type: "text" },
      { id: "units.Name", name: "Name", type: "text" }
    ];

    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url.includes("/api/tables/choices")) {
        return Promise.resolve(
          new Response(JSON.stringify(tableChoices), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          })
        );
      }

      if (url.includes("/api/tables/public.units/columns/choices")) {
        return Promise.resolve(
          new Response(JSON.stringify(columnChoices), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          })
        );
      }

      return Promise.reject(new Error(`Unhandled fetch request for ${url}`));
    });

    renderWithClient(
      <ColumnSettingsDrawer
        tableId="public.leases"
        column={{
          ...baseColumn,
          referenceConfig: {
            targetTableId: "public.units",
            displayColumnId: "units.Display",
            cardinality: "single",
            enforceForeignKey: false
          }
        }}
        open
        onClose={vi.fn()}
      />
    );

    const displaySelect = await screen.findByLabelText(/display column/i);

    await waitFor(() => expect(displaySelect).not.toBeDisabled());
    expect(displaySelect).toHaveValue("units.Name");
  });
});
