import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ReferenceCell } from "../ReferenceCell";

const column = {
  id: "leases.unitId",
  name: "Unit",
  type: "reference",
  referenceConfig: {
    targetTableId: "public.units",
    displayColumnId: "public.units.Name",
    cardinality: "single",
    enforceForeignKey: false
  }
} as const;

describe("ReferenceCell", () => {
  const originalFetch = global.fetch;

  beforeAll(() => {
    class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    // @ts-expect-error jsdom does not implement ResizeObserver
    global.ResizeObserver = ResizeObserverMock;
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function renderWithClient(ui: React.ReactNode) {
    const client = new QueryClient();
    return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  }

  function ControlledReferenceCell({
    initialValue,
    onChange,
    column: columnProp
  }: {
    initialValue: string | string[] | null;
    onChange: (value: string | string[] | null) => void;
    column: any;
  }) {
    const [currentValue, setCurrentValue] = useState<string | string[] | null>(initialValue);
    return (
      <ReferenceCell
        value={currentValue}
        column={columnProp}
        onChange={(next) => {
          setCurrentValue(next);
          onChange(next);
        }}
      />
    );
  }

  it("allows selecting a single reference", async () => {
    const handleChange = vi.fn();
    const items = [
      {
        id: "unit-1",
        preview: "Unit 1A",
        fields: { "public.units.Name": "Unit 1A" }
      }
    ];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items })
    } as unknown as Response);

    renderWithClient(
      <ControlledReferenceCell initialValue={null} column={column as any} onChange={handleChange} />
    );

    const trigger = screen.getByRole("button", { name: /select/i });
    await userEvent.click(trigger);

    const option = await screen.findByRole("option", { name: /unit 1a/i });
    await userEvent.click(option);

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalledWith("unit-1");
    });

    expect(screen.getByText("Unit 1A")).toBeInTheDocument();
  });

  it("supports multi-select and removal", async () => {
    const handleChange = vi.fn();
    const multiColumn = {
      ...column,
      referenceConfig: {
        ...column.referenceConfig,
        cardinality: "multi"
      }
    } as const;

    const items = [
      {
        id: "unit-1",
        preview: "Unit 1A",
        fields: { "public.units.Name": "Unit 1A" }
      },
      {
        id: "unit-2",
        preview: "Unit 2B",
        fields: { "public.units.Name": "Unit 2B" }
      }
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items })
    } as unknown as Response);

    renderWithClient(
      <ControlledReferenceCell initialValue={[]} column={multiColumn as any} onChange={handleChange} />
    );

    await userEvent.click(screen.getByRole("button", { name: /add/i }));

    const firstOption = await screen.findByRole("option", { name: /unit 1a/i });
    await userEvent.click(firstOption);
    const secondOption = await screen.findByRole("option", { name: /unit 2b/i });
    await userEvent.click(secondOption);

    await userEvent.click(screen.getByRole("button", { name: /apply/i }));

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalledWith(["unit-1", "unit-2"]);
    });

    expect(screen.getByText("Unit 1A")).toBeInTheDocument();
    expect(screen.getByText("Unit 2B")).toBeInTheDocument();

    const removeButton = screen.getByRole("button", { name: /remove unit 1a/i });
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalledWith(["unit-2"]);
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });
});
