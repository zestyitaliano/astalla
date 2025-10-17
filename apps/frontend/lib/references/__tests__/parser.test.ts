import { describe, expect, it } from "vitest";
import { parseExpression, ParseError } from "../parser";

const sample = "sum(@Leases.TotalRent where @Leases.Year = 2025 and @Units.Bedrooms = 2)";

describe("reference parser", () => {
  it("parses the canonical sample", () => {
    const ast = parseExpression(sample);
    expect(ast).toMatchObject({
      type: "Program",
      body: {
        type: "FunctionCall",
        name: "sum",
        argument: { type: "Ref" },
        where: {
          type: "Where",
        },
      },
    });
  });

  it("handles functions without where clauses", () => {
    const ast = parseExpression("count(@Leases.Id)");
    expect(ast.body.where).toBeUndefined();
    expect(ast.body.argument).toMatchObject({
      type: "Ref",
      path: [
        { type: "Identifier", name: "Leases" },
        { type: "Identifier", name: "Id" },
      ],
    });
  });

  it("supports case-insensitive function names", () => {
    const ast = parseExpression("SUM(@Users.id)");
    expect(ast.body.name).toBe("sum");
  });

  it("parses boolean literals", () => {
    const ast = parseExpression("avg(@Units.Rent where @Units.Active = true)");
    const comparison = (ast.body.where!.condition as any);
    expect(comparison.right).toMatchObject({ type: "Value", value: true });
  });

  it("parses null literals", () => {
    const ast = parseExpression("avg(@Units.Rent where @Units.MoveOut = null)");
    const comparison = (ast.body.where!.condition as any);
    expect(comparison.right).toMatchObject({ type: "Value", value: null });
  });

  it("supports identifier literals in comparisons", () => {
    const ast = parseExpression("avg(@Units.Rent where @Units.Status = Active)");
    const comparison = (ast.body.where!.condition as any);
    expect(comparison.right).toMatchObject({ type: "Value", value: "Active" });
  });

  it("parses logical AND precedence over OR", () => {
    const ast = parseExpression(
      "sum(@Units.Rent where @Units.Bedrooms = 2 or @Units.Bedrooms = 3 and @Units.Active = true)",
    );
    const where = ast.body.where!.condition as any;
    expect(where.type).toBe("Logical");
    expect(where.operator).toBe("or");
    expect(where.left.type).toBe("Comparison");
    expect(where.right.type).toBe("Logical");
    expect(where.right.operator).toBe("and");
  });

  it("parses grouped logical expressions", () => {
    const ast = parseExpression(
      "sum(@Units.Rent where (@Units.Bedrooms = 2 or @Units.Bedrooms = 3) and @Units.Active = true)",
    );
    const where = ast.body.where!.condition as any;
    expect(where.operator).toBe("and");
    expect(where.left.operator).toBe("or");
  });

  it("handles IN comparisons with strings", () => {
    const ast = parseExpression("sum(@Payments.Total where @Payments.Method in ('card', 'cash'))");
    const comparison = ast.body.where!.condition as any;
    expect(comparison.operator).toBe("in");
    expect(comparison.right).toHaveLength(2);
    expect(comparison.right[0]).toMatchObject({ type: "Value", value: "card" });
  });

  it("handles IN comparisons with identifiers", () => {
    const ast = parseExpression("sum(@Payments.Total where @Payments.Method in (Card, Cash))");
    const comparison = ast.body.where!.condition as any;
    expect(comparison.right).toHaveLength(2);
    expect(comparison.right[1]).toMatchObject({ type: "Value", value: "Cash" });
  });

  it("parses BETWEEN comparisons", () => {
    const ast = parseExpression(
      "max(@Leases.Amount where @Leases.StartDate between '2024-01-01' and '2024-12-31')",
    );
    const comparison = ast.body.where!.condition as any;
    expect(comparison.operator).toBe("between");
    expect(comparison.right).toHaveLength(2);
  });

  it("parses references with multiple segments", () => {
    const ast = parseExpression("sum(@Namespace.Leases.Total)");
    const ref = ast.body.argument as any;
    expect(ref.path).toHaveLength(3);
  });

  it("allows comparisons against other references", () => {
    const ast = parseExpression(
      "sum(@Orders.total where @Orders.user_id = @Users.id)",
    );
    const comparison = ast.body.where!.condition as any;
    expect(comparison.right).toMatchObject({ type: "Ref" });
  });

  it("parses negative numbers", () => {
    const ast = parseExpression("sum(@Orders.total where @Orders.total < -1.5)");
    const comparison = ast.body.where!.condition as any;
    expect(comparison.right).toMatchObject({ type: "Value", value: -1.5 });
  });

  it("handles escaped quotes inside strings", () => {
    const ast = parseExpression("sum(@Orders.total where @Orders.note = \"He said \\\"hi\\\"\")");
    const comparison = ast.body.where!.condition as any;
    expect(comparison.right).toMatchObject({ type: "Value", value: "He said \"hi\"" });
  });

  it("throws on invalid function names", () => {
    expect(() => parseExpression("foo(@Leases.TotalRent)")).toThrow(ParseError);
  });

  it("throws on missing closing parenthesis", () => {
    expect(() => parseExpression("sum(@Leases.TotalRent")).toThrow(ParseError);
  });

  it("throws on unterminated strings", () => {
    expect(() => parseExpression("sum(@Leases.TotalRent where @Leases.Note = 'oops)")).toThrow(ParseError);
  });

  it("throws on invalid characters", () => {
    expect(() => parseExpression("sum(@Leases.Total$)")).toThrow(ParseError);
  });

  it("throws when IN list is empty", () => {
    expect(() => parseExpression("sum(@Orders.total where @Orders.status in ())")).toThrow(ParseError);
  });

  it("throws when BETWEEN is incomplete", () => {
    expect(() => parseExpression("sum(@Orders.total where @Orders.date between '2024-01-01')")).toThrow(ParseError);
  });

  it("throws when WHERE is missing a condition", () => {
    expect(() => parseExpression("sum(@Orders.total where )")).toThrow(ParseError);
  });

  it("throws when reference is missing identifier", () => {
    expect(() => parseExpression("sum(@ where @Orders.total = 1)")).toThrow(ParseError);
  });

  it("parses nested parentheses in arithmetic-looking values", () => {
    const ast = parseExpression("sum(@Metrics.value where (@Metrics.year = 2024))");
    expect(ast.body.where!.condition).toMatchObject({ type: "Comparison" });
  });
});
