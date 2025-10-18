import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ReferencePopover, type ReferenceSuggestionItem } from "../ReferencePopover";

afterEach(() => {
  vi.restoreAllMocks();
});

const suggestions: ReferenceSuggestionItem[] = [
  { id: "leases.total_rent", label: "Leases • Total Rent", kind: "column" },
  { id: "leases.status", label: "Leases • Status", kind: "column" },
];

describe("ReferencePopover", () => {
  it("toggles visibility when uncontrolled and closes on outside click", async () => {
    render(<ReferencePopover triggerLabel="Open" suggestions={suggestions} />);

    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /open/i }));

    const items = await screen.findAllByRole("button", { name: /leases/i });
    expect(items).toHaveLength(2);

    fireEvent.pointerDown(document.body);

    expect(await screen.findByRole("button", { name: /open/i })).toBeInTheDocument();
    expect(screen.queryByText(/total rent/i)).not.toBeInTheDocument();
  });

  it("respects the controlled open prop and reports toggles", async () => {
    const handleOpenChange = vi.fn();
    render(
      <ReferencePopover
        triggerLabel="Toggle"
        suggestions={suggestions}
        open
        onOpenChange={handleOpenChange}
      />,
    );

    expect(screen.getAllByRole("button", { name: /leases/i })).toHaveLength(2);

    await userEvent.click(screen.getByRole("button", { name: /toggle/i }));

    expect(handleOpenChange).toHaveBeenCalledWith(false);
    // Controlled component should still be open because parent owns state.
    expect(screen.getAllByRole("button", { name: /leases/i })).toHaveLength(2);
  });

  it("invokes onSelect and closes after a selection", async () => {
    const handleSelect = vi.fn();
    render(<ReferencePopover triggerLabel="Select" suggestions={suggestions} onSelect={handleSelect} />);

    await userEvent.click(screen.getByRole("button", { name: /select/i }));

    const option = await screen.findByRole("button", { name: /total rent/i });
    await userEvent.click(option);

    expect(handleSelect).toHaveBeenCalledWith(suggestions[0]);
    expect(screen.queryByRole("button", { name: /total rent/i })).not.toBeInTheDocument();
  });

  it("splits nested labels for reference suggestions", async () => {
    render(
      <ReferencePopover
        triggerLabel="Open"
        suggestions={[{ id: "unit::name", label: "Unit › Units › Name", kind: "column" }]}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /open/i }));

    expect(screen.getByText("Unit › Units")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
  });

  it("invokes the action callback when selecting an action suggestion", async () => {
    const handleSelect = vi.fn();
    const handleAction = vi.fn();
    render(
      <ReferencePopover
        triggerLabel="Actions"
        suggestions={[{ id: "leases.unit::configure", label: "Set target table…", kind: "action" }]}
        onSelect={handleSelect}
        onActionSelect={handleAction}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /actions/i }));
    const action = await screen.findByRole("button", { name: /set target table/i });
    await userEvent.click(action);

    expect(handleAction).toHaveBeenCalledTimes(1);
    expect(handleSelect).not.toHaveBeenCalled();
  });
});
