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
    {
      input: "Sum of Total Rent in Leases where Year equals 2025",
      expected: "sum(@Leases.TotalRent where @Leases.Year = 2025)",
    },
    {
      input: "Average of Bedrooms in Units where Active is true",
      expected: "avg(@Units.Bedrooms where @Units.Active = true)",
    },
    { input: "SUM of total rent in leases", expected: "sum(@Leases.TotalRent)" },
    { input: "Average of Rent in Leases", expected: "avg(@Leases.TotalRent)" },
    { input: "Count of Id in Community", expected: "count(@Properties.Id)" },
    { input: "sum leases.TotalRent", expected: "sum(@Leases.TotalRent)" },
    {
      input: "sum leases.TotalRent where year is 2024",
      expected: "sum(@Leases.TotalRent where @Leases.Year = 2024)",
    },
    {
      input: "Sum of Total Rent in Leases where Status in ('active','pending')",
      expected: "sum(@Leases.TotalRent where @Leases.Status in ('active', 'pending'))",
    },
    {
      input: "Sum of Total Rent in Leases where Status in active, pending",
      expected: "sum(@Leases.TotalRent where @Leases.Status in ('active', 'pending'))",
    },
    {
      input:
        "Max of Total Rent in Leases where Move In Date between 2024-01-01 and 2024-12-31",
      expected:
        "max(@Leases.TotalRent where @Leases.MoveInDate between '2024-01-01' and '2024-12-31')",
    },
    {
      input: "Min of Move In Date in Leases where Move In Date after 2024-01-01",
      expected: "min(@Leases.MoveInDate where @Leases.MoveInDate > '2024-01-01')",
    },
    {
      input: "Min of Move In Date in Leases where Move In Date before 2024-06-01",
      expected: "min(@Leases.MoveInDate where @Leases.MoveInDate < '2024-06-01')",
    },
    {
      input: "Sum of Total Rent in Leases where Units Bedrooms equals 2",
      expected: "sum(@Leases.TotalRent where @Units.Bedrooms = 2)",
    },
    {
      input: "Sum of Total Rent in Leases where Units.Bathrooms equals 2",
      expected: "sum(@Leases.TotalRent where @Units.Bathrooms = 2)",
    },
    {
      input: "Sum of Total Rent in Leases where Status equals Active",
      expected: "sum(@Leases.TotalRent where @Leases.Status = 'Active')",
    },
    {
      input: "Sum of Total Rent in Leases where Year equals 2025 and Status equals Active",
      expected:
        "sum(@Leases.TotalRent where @Leases.Year = 2025 and @Leases.Status = 'Active')",
    },
    {
      input: "Sum of Total Rent in Leases where Status equals Active or Status equals Pending",
      expected:
        "sum(@Leases.TotalRent where @Leases.Status = 'Active' or @Leases.Status = 'Pending')",
    },
    {
      input: "Sum of Total Rent in Leases where Status in (\"Active\", \"Pending\")",
      expected: "sum(@Leases.TotalRent where @Leases.Status in ('Active', 'Pending'))",
    },
    { input: "Total of Total Rent in Leases", expected: "sum(@Leases.TotalRent)" },
    {
      input: "Sum of Total Rent in Leases where Units Bedrooms equals Units Bathrooms",
      expected: "sum(@Leases.TotalRent where @Units.Bedrooms = @Units.Bathrooms)",
    },
    { input: "Mean of Bedrooms in Units", expected: "avg(@Units.Bedrooms)" },
  ];

  cases.forEach(({ input, expected }, index) => {
    it(`translates case ${index + 1}`, () => {
      const canonical = translateHumanToCanonical(input, schema);
      expect(canonical).toBe(expected);
      expect(() => parseExpression(canonical)).not.toThrow();
    });
  });

  it("throws when where clause is present but empty", () => {
    expect(() => translateHumanToCanonical("Sum of Total Rent in Leases where ", schema)).toThrow(
      "WHERE clause is empty.",
    );
  });

  it("throws when dot notation where clause is empty", () => {
    expect(() => translateHumanToCanonical("sum leases.TotalRent where ", schema)).toThrow(
      "WHERE clause is empty.",
    );
  });
});
