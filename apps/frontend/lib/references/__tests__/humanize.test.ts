import { describe, expect, it } from "vitest";
import type { SchemaGraph } from "@shared/api";
import { translateHumanToCanonical } from "../humanize";
import { parseExpression } from "../parser";

const schema: SchemaGraph = {
  tables: [
    {
      id: "leases",
      name: "Leases",
      columns: [
        { id: "leases.id", name: "Id", type: "uuid" },
        { id: "leases.total_rent", name: "TotalRent", type: "numeric" },
        { id: "leases.year", name: "Year", type: "numeric" },
        { id: "leases.status", name: "Status", type: "text" },
        { id: "leases.move_in_date", name: "MoveInDate", type: "date" },
      ],
      fks: [],
    },
    {
      id: "units",
      name: "Units",
      columns: [
        { id: "units.id", name: "Id", type: "uuid" },
        { id: "units.bedrooms", name: "Bedrooms", type: "numeric" },
        { id: "units.bathrooms", name: "Bathrooms", type: "numeric" },
        { id: "units.active", name: "Active", type: "boolean" },
      ],
      fks: [],
    },
    {
      id: "properties",
      name: "Properties",
      label: "Community",
      columns: [
        { id: "properties.id", name: "Id", type: "uuid" },
        { id: "properties.name", name: "Name", type: "text" },
        { id: "properties.region", name: "Region", type: "text" },
      ],
      fks: [],
    },
  ],
};

describe("translateHumanToCanonical", () => {
  const cases: Array<{ input: string; expected: string }> = [
    { input: "Sum of Total Rent in Leases", expected: "sum(@Leases.TotalRent)" },
    { input: "SUM of total rent in leases", expected: "sum(@Leases.TotalRent)" },
    { input: "Total of Total Rent in Leases", expected: "sum(@Leases.TotalRent)" },
    { input: "Sum of Rent in Leases", expected: "sum(@Leases.TotalRent)" },
    { input: "Mean of Bedrooms in Units", expected: "avg(@Units.Bedrooms)" },
    { input: "Average of Rent in Leases", expected: "avg(@Leases.TotalRent)" },
    { input: "Count of Id in Community", expected: "count(@Properties.Id)" },
    {
      input: "Count of Id in Property where Name equals River Place",
      expected: "count(@Properties.Id where @Properties.Name = 'River Place')",
    },
    { input: "sum leases.TotalRent", expected: "sum(@Leases.TotalRent)" },
    {
      input: "sum leases.TotalRent where year is 2024",
      expected: "sum(@Leases.TotalRent where @Leases.Year = 2024)",
    },
    {
      input: "Sum of Total Rent in Leases where Year equals 2025",
      expected: "sum(@Leases.TotalRent where @Leases.Year = 2025)",
    },
    {
      input: "Average of Bedrooms in Units where Active is true",
      expected: "avg(@Units.Bedrooms where @Units.Active = true)",
    },
    {
      input: "Sum of Total Rent in Leases where Status equals Active",
      expected: "sum(@Leases.TotalRent where @Leases.Status = @Units.Active)",
    },
    {
      input: "Sum of Total Rent in Leases where Status equals Active and Year equals 2025",
      expected:
        "sum(@Leases.TotalRent where @Leases.Status = @Units.Active and @Leases.Year = 2025)",
    },
    {
      input: "Sum of Total Rent in Leases where Status equals Active or Status equals Pending",
      expected:
        "sum(@Leases.TotalRent where @Leases.Status = @Units.Active or @Leases.Status = 'Pending')",
    },
    {
      input: "Sum of Total Rent in Leases where Status in ('active','pending')",
      expected: "sum(@Leases.TotalRent where @Leases.Status in ('active', 'pending'))",
    },
    {
      input: "Sum of Total Rent in Leases where Status in active, pending",
      expected: "sum(@Leases.TotalRent where @Leases.Status in (@Units.Active, 'pending'))",
    },
    {
      input:
        "Sum of Total Rent in Leases where Status equals Active and Units Bedrooms equals 2",
      expected:
        "sum(@Leases.TotalRent where @Leases.Status = @Units.Active and @Units.Bedrooms = 2)",
    },
    {
      input: "Sum of Total Rent in Leases where Units.Bathrooms equals 2",
      expected: "sum(@Leases.TotalRent where @Units.Bathrooms = 2)",
    },
    {
      input:
        "Sum of Total Rent in Leases where Units Bedrooms equals Units Bathrooms",
      expected: "sum(@Leases.TotalRent where @Units.Bedrooms = @Units.Bathrooms)",
    },
    {
      input:
        "Max of Total Rent in Leases where Move In Date between 2024-01-01 and 2024-12-31",
      expected:
        "max(@Leases.TotalRent where @Leases.MoveInDate between '2024-01-01' and '2024-12-31')",
    },
    {
      input:
        "Sum of Total Rent in Leases where Move In Date between 2024-01-01 and 2024-12-31 and Status equals Active",
      expected:
        "sum(@Leases.TotalRent where @Leases.MoveInDate between '2024-01-01' and '2024-12-31' and @Leases.Status = @Units.Active)",
    },
    {
      input: "Sum of Total Rent in Leases where Move In Date after 2024-01-01",
      expected: "sum(@Leases.TotalRent where @Leases.MoveInDate > '2024-01-01')",
    },
    {
      input: "Sum of Total Rent in Leases where Move In Date before 2024-06-01",
      expected: "sum(@Leases.TotalRent where @Leases.MoveInDate < '2024-06-01')",
    },
    {
      input:
        "Sum of Total Rent in Leases where Status equals Active or Units Bedrooms equals 3 and Units Bathrooms equals 2",
      expected:
        "sum(@Leases.TotalRent where @Leases.Status = @Units.Active or @Units.Bedrooms = 3 and @Units.Bathrooms = 2)",
    },
    {
      input: "Sum of Total Rent in Leases where Status in (\"Active\", \"Pending\")",
      expected: "sum(@Leases.TotalRent where @Leases.Status in ('Active', 'Pending'))",
    },
    {
      input: "Min of Move In Date in Leases where Move In Date after 2024-01-01",
      expected: "min(@Leases.MoveInDate where @Leases.MoveInDate > '2024-01-01')",
    },
    {
      input: "Min of Move In Date in Leases where Move In Date before 2024-06-01",
      expected: "min(@Leases.MoveInDate where @Leases.MoveInDate < '2024-06-01')",
    },
  ];

  cases.forEach(({ input, expected }, index) => {
    it(`translates case ${index + 1}`, () => {
      const canonical = translateHumanToCanonical(input, schema);
      expect(canonical).toBe(expected);
      expect(() => parseExpression(canonical)).not.toThrow();
    });
  });

  it("supports resolving table synonyms with pluralisation", () => {
    const canonical = translateHumanToCanonical("Average of Bedrooms in Unit", schema);
    expect(canonical).toBe("avg(@Units.Bedrooms)");
  });

  it("handles nested AND/OR precedence in filters", () => {
    const canonical = translateHumanToCanonical(
      "Sum of Total Rent in Leases where Status equals Active and Year equals 2025 or Units Bedrooms equals 2",
      schema,
    );
    expect(canonical).toBe(
      "sum(@Leases.TotalRent where @Leases.Status = @Units.Active and @Leases.Year = 2025 or @Units.Bedrooms = 2)",
    );
  });

  it("allows BETWEEN filters that mix schema synonyms", () => {
    const canonical = translateHumanToCanonical(
      "Sum of Total Rent in Leases where move in date between Jan 1 2024 and 2024-12-31",
      schema,
    );
    expect(canonical).toBe(
      "sum(@Leases.TotalRent where @Leases.MoveInDate between 'Jan 1 2024' and '2024-12-31')",
    );
  });

  describe("error handling", () => {
    it("throws for empty input", () => {
      expect(() => translateHumanToCanonical("   ", schema)).toThrowError(
        /Input cannot be empty/,
      );
    });

    it("throws for unknown tables (typo handling)", () => {
      expect(() => translateHumanToCanonical("Sum of Total Rent in Leese", schema)).toThrowError(
        /Unknown table "Leese"/,
      );
    });

    it("throws for unknown columns (typo handling)", () => {
      expect(() =>
        translateHumanToCanonical("Sum of Total Rnt in Leases", schema),
      ).toThrowError(/Unknown column "Total Rnt"/);
    });

    it("rejects unsupported aggregate functions", () => {
      expect(() => translateHumanToCanonical("Median of Total Rent in Leases", schema)).toThrowError(
        /Unsupported function "Median"/,
      );
    });

    it("rejects incomplete BETWEEN filters", () => {
      expect(() =>
        translateHumanToCanonical(
          "Sum of Total Rent in Leases where Move In Date between 2024-01-01",
          schema,
        ),
      ).toThrowError(/Unsupported condition/);
    });
  });
});
