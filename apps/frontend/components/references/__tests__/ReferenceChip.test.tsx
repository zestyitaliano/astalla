import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ReferenceChip } from "../ReferenceChip";

describe("ReferenceChip", () => {
  it("renders as a button when clickable", async () => {
    const handleClick = vi.fn();
    render(<ReferenceChip label="Leases" kind="table" onClick={handleClick} />);

    await userEvent.click(screen.getByRole("button", { name: /leases/i }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("supports removal without triggering the primary click handler", async () => {
    const handleClick = vi.fn();
    const handleRemove = vi.fn();
    render(
      <ReferenceChip label="Total Rent" kind="column" onClick={handleClick} onRemove={handleRemove} />,
    );

    const chipButton = screen.getByText("Total Rent").closest("button");
    expect(chipButton).toBeTruthy();
    await userEvent.click(chipButton!);
    expect(handleClick).toHaveBeenCalledTimes(1);

    const removeButton = screen.getByRole("button", { name: /remove total rent/i });
    await userEvent.click(removeButton);

    expect(handleRemove).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("prevents removal when disabled", async () => {
    const handleRemove = vi.fn();
    render(<ReferenceChip label="Status" disabled onRemove={handleRemove} />);

    const removeButton = screen.getByRole("button", { name: /remove status/i });
    fireEvent.click(removeButton);

    expect(handleRemove).not.toHaveBeenCalled();
  });
});
