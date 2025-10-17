import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DiagnosticsInline } from "../DiagnosticsInline";
import type { ReferenceDiagnostic } from "@/lib/references/diagnostics";

describe("DiagnosticsInline", () => {
  it("applies quick fixes", () => {
    const onChange = vi.fn();
    const diagnostics: ReferenceDiagnostic[] = [
      {
        code: "unknown_table",
        message: "Unknown table",
        range: { start: 4, end: 9 },
        severity: "error",
        fix: {
          label: 'Use "Leases"',
          apply: () => "sum(@Leases.TotalRent)",
        },
      },
    ];

    render(<DiagnosticsInline value="sum(@Lease.TotalRent)" diagnostics={diagnostics} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: /use "leases"/i }));

    expect(onChange).toHaveBeenCalledWith("sum(@Leases.TotalRent)");
  });
});
