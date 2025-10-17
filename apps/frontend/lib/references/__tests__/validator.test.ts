import { describe, expect, it } from "vitest";
import { parseExpression } from "../parser";
import { validate } from "../validator";
import type { SchemaGraph } from "@shared/api";

const schema: SchemaGraph = {
  tables: [
    {
      id: "leases",
      name: "Leases",
      columns: [
        { id: "leases.total_rent", name: "TotalRent", type: "numeric" },
        { id: "leases.year", name: "Year", type: "numeric" },
      ],
      fks: [],
    },
    {
      id: "units",
      name: "Units",
      columns: [
        { id: "units.bedrooms", name: "Bedrooms", type: "numeric" },
      ],
      fks: [],
    },
  ],
};

describe("validator", () => {
  it("flags unknown tables", () => {
    const ast = parseExpression("sum(@Unknown.Total)");
    const result = validate(ast, schema);
    expect(result.ok).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({ code: "unknown_table" }),
    ]);
  });

  it("flags unknown columns", () => {
    const ast = parseExpression("sum(@Leases.Missing)");
    const result = validate(ast, schema);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatchObject({ code: "unknown_column" });
  });

  it("returns ok for known references", () => {
    const ast = parseExpression("sum(@Leases.TotalRent where @Leases.Year = 2025)");
    const result = validate(ast, schema);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
