import { describe, expect, it } from "vitest";

import { getDiagnostics } from "../diagnostics";
import type { SchemaGraph } from "@shared/api";

const schema: SchemaGraph = {
  tables: [
    {
      id: "leases",
      name: "Leases",
      columns: [
        { id: "leases.total_rent", name: "TotalRent", type: "numeric" },
        { id: "leases.status", name: "Status", type: "text" },
        { id: "leases.year", name: "Year", type: "numeric" },
        { id: "leases.move_in", name: "MoveInDate", type: "date" },
        { id: "leases.unit_id", name: "UnitId", type: "uuid" },
      ],
      fks: [
        {
          fromTable: "Leases",
          fromCol: "UnitId",
          toTable: "Units",
          toCol: "Id",
        },
      ],
    },
    {
      id: "units",
      name: "Units",
      columns: [
        { id: "units.id", name: "Id", type: "uuid" },
        { id: "units.bedrooms", name: "Bedrooms", type: "numeric" },
      ],
      fks: [],
    },
  ],
};

describe("reference diagnostics", () => {
  it("suggests closest matching table", () => {
    const expression = "sum(@Lease.TotalRent)";
    const { diagnostics } = getDiagnostics(expression, schema);
    const diagnostic = diagnostics.find((item) => item.code === "unknown_table");
    expect(diagnostic).toBeDefined();
    expect(diagnostic?.fix).toBeDefined();
    const fixed = diagnostic!.fix!.apply(expression);
    expect(fixed).toBe("sum(@Leases.TotalRent)");
  });

  it("suggests closest matching column", () => {
    const expression = "sum(@Leases.TotalRents)";
    const { diagnostics } = getDiagnostics(expression, schema);
    const diagnostic = diagnostics.find((item) => item.code === "unknown_column");
    expect(diagnostic).toBeDefined();
    expect(diagnostic?.fix).toBeDefined();
    const fixed = diagnostic!.fix!.apply(expression);
    expect(fixed).toBe("sum(@Leases.TotalRent)");
  });

  it("flags aggregation type mismatches", () => {
    const expression = "sum(@Leases.Status)";
    const { diagnostics } = getDiagnostics(expression, schema);
    const diagnostic = diagnostics.find((item) => item.code === "type_mismatch");
    expect(diagnostic).toBeDefined();
    expect(diagnostic?.fix).toBeDefined();
    const fixed = diagnostic!.fix!.apply(expression);
    expect(fixed).toBe("count(@Leases.Status)");
  });

  it("proposes foreign key joins", () => {
    const expression = "sum(@Leases.TotalRent where @Units.Bedrooms = 2)";
    const { diagnostics } = getDiagnostics(expression, schema);
    const diagnostic = diagnostics.find((item) => item.code === "missing_join");
    expect(diagnostic).toBeDefined();
    expect(diagnostic?.fix).toBeDefined();
    const fixed = diagnostic!.fix!.apply(expression);
    expect(fixed).toBe(
      "sum(@Leases.TotalRent where @Units.Bedrooms = 2 and @Leases.UnitId = @Units.Id)",
    );
  });

  it("offers a quick fix for non-ISO date strings", () => {
    const expression = "sum(@Leases.TotalRent where @Leases.MoveInDate >= '01/31/2024')";
    const { diagnostics } = getDiagnostics(expression, schema);
    const diagnostic = diagnostics.find((item) => item.code === "bad_date");
    expect(diagnostic).toBeDefined();
    expect(diagnostic?.severity).toBe("warning");
    expect(diagnostic?.fix?.label).toBe("Reformat to 2024-01-31");
    const fixed = diagnostic!.fix!.apply(expression);
    expect(fixed).toBe("sum(@Leases.TotalRent where @Leases.MoveInDate >= '2024-01-31')");
  });

  it("detects human readable dates", () => {
    const expression = "sum(@Leases.TotalRent where @Leases.MoveInDate >= 'Sep 5, 2025')";
    const { diagnostics } = getDiagnostics(expression, schema);
    const diagnostic = diagnostics.find((item) => item.code === "bad_date");
    expect(diagnostic).toBeDefined();
    const fixed = diagnostic!.fix!.apply(expression);
    expect(fixed).toBe("sum(@Leases.TotalRent where @Leases.MoveInDate >= '2025-09-05')");
  });

  it("auto-closes unbalanced parentheses", () => {
    const expression = "sum(@Leases.TotalRent where @Leases.Year = 2024";
    const { diagnostics } = getDiagnostics(expression, schema);
    const diagnostic = diagnostics.find((item) => item.code === "unbalanced_parentheses");
    expect(diagnostic).toBeDefined();
    expect(diagnostic?.fix).toBeDefined();
    const fixed = diagnostic!.fix!.apply(expression);
    expect(fixed).toBe("sum(@Leases.TotalRent where @Leases.Year = 2024)");
  });
});
