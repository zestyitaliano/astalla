import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

type ColumnType = "TEXT" | "NUMBER" | "DATE" | "BOOLEAN" | "SELECT" | "REFERENCE";

type FilterConfig = {
  columnId: string;
  operator: "neq";
  value: unknown;
};

type ViewConfig = {
  columnOrder?: string[];
  hidden?: string[];
  filters?: FilterConfig[];
};

type QueryRow = {
  id: string;
  values: Map<string, unknown>;
};

type QueryResult = {
  columns: Column[];
  rows: QueryRow[];
};

interface Column {
  id: string;
  name: string;
  type: ColumnType;
  position: number;
}

class TableRow {
  readonly id: string;
  position: number;
  private readonly cells: Map<string, unknown>;

  constructor(position: number) {
    this.id = randomUUID();
    this.position = position;
    this.cells = new Map();
  }

  setCell(columnId: string, value: unknown) {
    this.cells.set(columnId, value);
  }

  getCell(columnId: string) {
    return this.cells.get(columnId);
  }

  toQueryRow(): QueryRow {
    return { id: this.id, values: new Map(this.cells) };
  }
}

class TableView {
  readonly id: string;
  readonly name: string;
  readonly config: ViewConfig;

  constructor(name: string, config: ViewConfig) {
    this.id = randomUUID();
    this.name = name;
    this.config = config;
  }
}

class InMemoryTable {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  private readonly columns: Column[] = [];
  private readonly rows: TableRow[] = [];
  private readonly views: TableView[] = [];

  constructor(name: string, description: string) {
    this.id = randomUUID();
    this.name = name;
    this.description = description;
  }

  addColumn(name: string, type: ColumnType) {
    const column: Column = {
      id: randomUUID(),
      name,
      type,
      position: this.columns.length + 1
    };
    this.columns.push(column);
    return column;
  }

  addRow() {
    const row = new TableRow(this.rows.length + 1);
    this.rows.push(row);
    return row;
  }

  patchRow(rowId: string, cells: Array<{ columnId: string; value: unknown }>) {
    const row = this.rows.find((entry) => entry.id === rowId);
    if (!row) {
      throw new Error(`Row ${rowId} not found`);
    }
    for (const cell of cells) {
      row.setCell(cell.columnId, cell.value);
    }
  }

  createView(name: string, config: ViewConfig) {
    const view = new TableView(name, config);
    this.views.push(view);
    return view;
  }

  private resolveView(viewId?: string) {
    if (!viewId) {
      return undefined;
    }
    return this.views.find((view) => view.id === viewId);
  }

  query(viewId?: string): QueryResult {
    const view = this.resolveView(viewId);
    const columnOrder = view?.config.columnOrder ?? [];
    const hidden = new Set(view?.config.hidden ?? []);

    const orderedColumns = [...this.columns];
    if (columnOrder.length) {
      const orderMap = new Map(columnOrder.map((columnId, index) => [columnId, index] as const));
      orderedColumns.sort((a, b) => {
        const orderA = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const orderB = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
        if (orderA === orderB) {
          return a.position - b.position;
        }
        return orderA - orderB;
      });
    }

    const visibleColumns = orderedColumns.filter((column) => !hidden.has(column.id));

    const filters = view?.config.filters ?? [];
    const filterMap = new Map(filters.map((filter) => [filter.columnId, filter] as const));

    const filteredRows = this.rows.filter((row) => {
      for (const [columnId, filter] of filterMap) {
        const actual = row.getCell(columnId);
        if (filter.operator === "neq" && actual === filter.value) {
          return false;
        }
      }
      return true;
    });

    const queryRows = filteredRows.map((row) => row.toQueryRow());

    return { columns: visibleColumns, rows: queryRows };
  }

  async exportCsv(viewId: string | undefined, destination: string) {
    const result = this.query(viewId);
    const headers = result.columns.map((column) => column.name);

    const escape = (value: string) => {
      const sanitized = value ?? "";
      let processed = sanitized;
      if (processed.includes("\"")) {
        processed = processed.replace(/"/g, '""');
      }
      if (/[,"\n\r]/.test(processed)) {
        return `"${processed}"`;
      }
      return processed;
    };

    const lines = [headers.join(",")];
    for (const row of result.rows) {
      const line = result.columns
        .map((column) => {
          const value = row.values.get(column.id);
          return value === undefined || value === null ? "" : String(value);
        })
        .map((cell) => escape(cell))
        .join(",");
      lines.push(line);
    }

    await fs.writeFile(destination, `${lines.join("\n")}\n`, "utf8");
  }
}

async function main() {
  const table = new InMemoryTable("Smoke Table", "Simulated table for smoke test");

  const statusColumn = table.addColumn("Status", "SELECT");
  const dueDateColumn = table.addColumn("Due Date", "DATE");
  const ownerColumn = table.addColumn("Owner", "TEXT");
  const progressColumn = table.addColumn("Progress", "NUMBER");

  const firstRow = table.addRow();
  table.patchRow(firstRow.id, [
    { columnId: statusColumn.id, value: "Active" },
    { columnId: dueDateColumn.id, value: new Date().toISOString() },
    { columnId: ownerColumn.id, value: "Avery" },
    { columnId: progressColumn.id, value: 76 }
  ]);

  const secondRow = table.addRow();
  table.patchRow(secondRow.id, [
    { columnId: statusColumn.id, value: "Planning" },
    { columnId: dueDateColumn.id, value: new Date(Date.now() + 86_400_000).toISOString() },
    { columnId: ownerColumn.id, value: "Jordan" },
    { columnId: progressColumn.id, value: 12 }
  ]);

  const activeView = table.createView("Active Work", {
    filters: [{ columnId: statusColumn.id, operator: "neq", value: "Planning" }],
    columnOrder: [ownerColumn.id, statusColumn.id, progressColumn.id, dueDateColumn.id],
    hidden: [dueDateColumn.id]
  });

  const queryResult = table.query(activeView.id);
  const exportPath = path.join("/tmp", `${table.id}.csv`);
  await table.exportCsv(activeView.id, exportPath);

  console.log("[smoke-tables] Table created", table.id);
  console.log(
    "[smoke-tables] Columns",
    queryResult.columns.map((column) => ({ name: column.name, type: column.type }))
  );
  console.log("[smoke-tables] Query rows", queryResult.rows.length);
  console.log(
    "[smoke-tables] First row values",
    queryResult.rows[0]?.values ?? new Map()
  );
  console.log("[smoke-tables] CSV saved", exportPath);
}

main().catch((error) => {
  console.error("[smoke-tables] unexpected error", error);
  process.exitCode = 1;
});
