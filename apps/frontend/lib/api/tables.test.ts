import { afterEach, describe, expect, it, vi } from "vitest";

import { ColumnType } from "@shared/api";

import { normalizeColumnType, queryTable } from "./tables";

describe("normalizeColumnType", () => {
  it("maps known backend types to ColumnType enum values", () => {
    expect(normalizeColumnType("text")).toBe(ColumnType.TEXT);
    expect(normalizeColumnType(" numeric ")).toBe(ColumnType.NUMBER);
    expect(normalizeColumnType("integer")).toBe(ColumnType.NUMBER);
    expect(normalizeColumnType("decimal")).toBe(ColumnType.NUMBER);
    expect(normalizeColumnType("number")).toBe(ColumnType.NUMBER);
    expect(normalizeColumnType("boolean")).toBe(ColumnType.BOOLEAN);
    expect(normalizeColumnType("date")).toBe(ColumnType.DATE);
    expect(normalizeColumnType("datetime")).toBe(ColumnType.DATE);
    expect(normalizeColumnType("reference")).toBe(ColumnType.REFERENCE);
    expect(normalizeColumnType("select")).toBe(ColumnType.SELECT);
  });

  it("falls back to ColumnType.TEXT for unknown or missing values", () => {
    expect(normalizeColumnType(undefined)).toBe(ColumnType.TEXT);
    expect(normalizeColumnType(null)).toBe(ColumnType.TEXT);
    expect(normalizeColumnType(123)).toBe(ColumnType.TEXT);
    expect(normalizeColumnType(" ")).toBe(ColumnType.TEXT);
    expect(normalizeColumnType("mystery")).toBe(ColumnType.TEXT);
  });
});

describe("queryTable", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes column types returned from the backend", async () => {
    const jsonHeaders = { "Content-Type": "application/json" };
    const tableId = "table-1";

    const tableResponse = {
      id: tableId,
      name: "Test table",
      columns: [
        { id: "col-text", name: "Text", type: "text", position: 0 },
        { id: "col-number", name: "Number", type: "numeric", position: 1 },
        { id: "col-date", name: "Date", type: "datetime", position: 2 },
        { id: "col-boolean", name: "Boolean", type: "boolean", position: 3 },
        { id: "col-reference", name: "Reference", type: "reference", position: 4 },
        { id: "col-select", name: "Select", type: "select", position: 5 }
      ],
      rows: [],
      views: []
    };

    const rowsResponse = {
      items: [],
      nextCursor: undefined
    };

    const fetchMock = vi.spyOn(global, "fetch").mockImplementation((input: RequestInfo | URL) => {
      const rawUrl =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const url = new URL(rawUrl, "http://localhost");

      if (url.pathname.startsWith("/api/tables/") && !url.pathname.endsWith("/columns/choices")) {
        return Promise.resolve(
          new Response(JSON.stringify(tableResponse), {
            status: 200,
            headers: jsonHeaders
          })
        );
      }

      if (url.pathname === "/api/rows") {
        return Promise.resolve(
          new Response(JSON.stringify(rowsResponse), {
            status: 200,
            headers: jsonHeaders
          })
        );
      }

      if (url.pathname === "/health") {
        return Promise.resolve(new Response("", { status: 200 }));
      }

      return Promise.reject(new Error(`Unhandled request for ${url.toString()}`));
    });

    const result = await queryTable(tableId);

    expect(fetchMock).toHaveBeenCalled();
    expect(result.columns.map((column) => column.type)).toEqual([
      ColumnType.TEXT,
      ColumnType.NUMBER,
      ColumnType.DATE,
      ColumnType.BOOLEAN,
      ColumnType.REFERENCE,
      ColumnType.SELECT
    ]);
  });
});
