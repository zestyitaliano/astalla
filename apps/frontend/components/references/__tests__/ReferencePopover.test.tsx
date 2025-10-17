import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ReferencePopover, type ReferenceSuggestionItem } from "../ReferencePopover";

afterEach(() => {
  vi.restoreAllMocks();
});

const suggestions: ReferenceSuggestionItem[] = [
  { id: "leases.total_rent", label: "Leases • Total Rent" },
  { id: "leases.status", label: "Leases • Status" },
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
});
