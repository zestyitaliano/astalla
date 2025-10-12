"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/data-table/data-table";
import type { EditableCellMeta } from "@/components/data-table/editable-cell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDashboardState } from "@/lib/dashboard-state";
import { cn } from "@/lib/utils";

type WorkspaceRow = {
  id: string;
} & Record<string, string>;

interface TableWorkspaceProps {
  tableId: string;
}

export function TableWorkspace({ tableId }: TableWorkspaceProps) {
  const router = useRouter();
  const {
    state,
    createTable,
    deleteTable,
    addTableRow,
    removeTableRow,
    updateTableDetails,
    addTableColumn,
    removeTableColumn,
    replaceTableRows
  } = useDashboardState();

  const knownTableIdsRef = useRef(new Set(state.tables.map((table) => table.id)));
  useEffect(() => {
    const known = knownTableIdsRef.current;
    const newTables = state.tables.filter((entry) => !known.has(entry.id));
    if (newTables.length > 0) {
      knownTableIdsRef.current = new Set(state.tables.map((entry) => entry.id));
      router.replace(`/tables/${newTables[0].id}`);
      return;
    }

    knownTableIdsRef.current = new Set(state.tables.map((entry) => entry.id));
  }, [router, state.tables]);

  const resolvedTable = useMemo(
    () => state.tables.find((entry) => entry.id === tableId),
    [state.tables, tableId]
  );
  const table = resolvedTable ?? state.tables[0];

  useEffect(() => {
    if (!resolvedTable && state.tables.length > 0 && state.tables[0].id !== tableId) {
      router.replace(`/tables/${state.tables[0].id}`);
    }
  }, [resolvedTable, router, state.tables, tableId]);

  const [search, setSearch] = useState("");
  const [newTableName, setNewTableName] = useState("");
  const [newTableColumns, setNewTableColumns] = useState("Name, Status");
  const [newColumnName, setNewColumnName] = useState("");
  const [draftName, setDraftName] = useState(table?.name ?? "");
  const [draftDescription, setDraftDescription] = useState(table?.description ?? "");

  useEffect(() => {
    setDraftName(table?.name ?? "");
    setDraftDescription(table?.description ?? "");
  }, [table?.description, table?.id, table?.name]);

  const filteredTables = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return state.tables;
    }
    return state.tables.filter((entry) => entry.name.toLowerCase().includes(query));
  }, [search, state.tables]);

  const workspaceColumns = useMemo<ColumnDef<WorkspaceRow, unknown>[]>(() => {
    if (!table) {
      return [];
    }

    return table.columns.map((columnName, index) => ({
      accessorKey: `column_${index}`,
      id: `column_${index}`,
      header: columnName || `Column ${index + 1}`,
      meta: {
        editable: true,
        placeholder: columnName || `Column ${index + 1}`
      } satisfies EditableCellMeta<WorkspaceRow>
    }));
  }, [table]);

  const workspaceRows = useMemo<WorkspaceRow[]>(() => {
    if (!table) {
      return [];
    }

    return table.rows.map((row, rowIndex) => {
      const record: WorkspaceRow = { id: `${table.id}-${rowIndex}` };
      table.columns.forEach((_, columnIndex) => {
        record[`column_${columnIndex}`] = row[columnIndex] ?? "";
      });
      return record;
    });
  }, [table]);

  const handleCreateTable = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newTableName.trim();
    if (!name) {
      return;
    }

    const columns = newTableColumns
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    createTable({
      name,
      columns: columns.length > 0 ? columns : ["Name", "Status"],
      description: ""
    });
    setNewTableName("");
    setNewTableColumns("Name, Status");
  };

  const handleDeleteTable = () => {
    if (!table) {
      return;
    }
    deleteTable(table.id);
  };

  const handleAddRow = () => {
    if (!table) {
      return;
    }
    addTableRow(table.id, new Array(table.columns.length).fill(""));
  };

  const handleRemoveRow = () => {
    if (!table || table.rows.length === 0) {
      return;
    }
    removeTableRow(table.id, table.rows.length - 1);
  };

  const handleAddColumn = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!table) {
      return;
    }

    const name = newColumnName.trim() || `Column ${table.columns.length + 1}`;
    addTableColumn(table.id, { name });
    setNewColumnName("");
  };

  const handleRenameTable = () => {
    if (!table) {
      return;
    }
    updateTableDetails(table.id, { name: draftName });
  };

  const handleUpdateDescription = () => {
    if (!table) {
      return;
    }
    updateTableDetails(table.id, { description: draftDescription });
  };

  const handleRowsChange = (rows: WorkspaceRow[]) => {
    if (!table) {
      return;
    }
    const normalized = rows.map((row) =>
      table.columns.map((_, index) => row[`column_${index}`] ?? "")
    );
    replaceTableRows(table.id, normalized);
  };

  if (!table) {
    return (
      <div className="flex flex-col items-center gap-6 rounded-2xl border border-dashed border-border/70 bg-card/40 p-10 text-center">
        <div className="max-w-md space-y-2">
          <h2 className="text-xl font-semibold text-text">Create your first table</h2>
          <p className="text-sm text-muted-foreground">
            Tables let you capture workflows, audit updates, and collaborate with your team in real time.
            Start by defining the columns you need and invite others to contribute.
          </p>
        </div>
        <form onSubmit={handleCreateTable} className="flex w-full max-w-md flex-col gap-3">
          <Input
            value={newTableName}
            onChange={(event) => setNewTableName(event.target.value)}
            placeholder="Table name"
            required
          />
          <Input
            value={newTableColumns}
            onChange={(event) => setNewTableColumns(event.target.value)}
            placeholder="Columns (comma separated)"
          />
          <Button type="submit">Create table</Button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <aside className="w-full rounded-2xl border border-border/60 bg-card p-4 md:w-72">
        <form onSubmit={handleCreateTable} className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">New table</h2>
            <p className="text-xs text-muted-foreground/80">Name your dataset and choose starter columns.</p>
          </div>
          <Input
            value={newTableName}
            onChange={(event) => setNewTableName(event.target.value)}
            placeholder="Portfolio tracker"
            required
          />
          <Input
            value={newTableColumns}
            onChange={(event) => setNewTableColumns(event.target.value)}
            placeholder="Columns (comma separated)"
          />
          <Button type="submit" className="w-full">
            + Create table
          </Button>
        </form>

        <div className="mt-6 space-y-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tables"
          />
          <nav className="space-y-1">
            {filteredTables.length === 0 ? (
              <p className="rounded-lg bg-card-contrast/40 px-3 py-2 text-xs text-muted-foreground">
                No tables match your search.
              </p>
            ) : (
              filteredTables.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/tables/${entry.id}`}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-3 py-2 text-sm transition",
                    entry.id === table.id
                      ? "bg-primary/10 text-primary shadow"
                      : "text-muted-foreground hover:bg-card-contrast/50 hover:text-text"
                  )}
                >
                  <span className="truncate">{entry.name}</span>
                  <span className="text-xs text-muted-foreground">{entry.columns.length} cols</span>
                </Link>
              ))
            )}
          </nav>
        </div>
      </aside>

      <main className="flex-1 space-y-8">
        <header className="space-y-4 rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex-1 space-y-3">
              <div>
                <label className="text-xs font-medium uppercase text-muted-foreground" htmlFor="table-name">
                  Table name
                </label>
                <Input
                  id="table-name"
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  onBlur={handleRenameTable}
                  placeholder="Team workspace"
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase text-muted-foreground" htmlFor="table-description">
                  Description
                </label>
                <textarea
                  id="table-description"
                  value={draftDescription}
                  onChange={(event) => setDraftDescription(event.target.value)}
                  onBlur={handleUpdateDescription}
                  placeholder="Summarize what this dataset tracks"
                  className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleAddRow}>
                Add row
              </Button>
              <Button variant="outline" onClick={handleRemoveRow} disabled={table.rows.length === 0}>
                Remove row
              </Button>
              <Button variant="destructive" onClick={handleDeleteTable}>
                Delete table
              </Button>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text">Columns</h3>
              <p className="text-xs text-muted-foreground">Reorder columns inside the grid or add new fields here.</p>
            </div>
            <form onSubmit={handleAddColumn} className="flex w-full max-w-sm items-center gap-2 md:w-auto">
              <Input
                value={newColumnName}
                onChange={(event) => setNewColumnName(event.target.value)}
                placeholder="Column label"
              />
              <Button type="submit" variant="secondary">
                + Add column
              </Button>
            </form>
          </div>
          <ul className="mt-4 grid gap-2 md:grid-cols-2">
            {table.columns.map((columnName, index) => (
              <li
                key={columnName + index.toString()}
                className="flex items-center justify-between rounded-xl border border-border/60 bg-card-contrast/40 px-3 py-2 text-sm"
              >
                <span className="truncate font-medium text-text">{columnName || `Column ${index + 1}`}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => removeTableColumn(table.id, index)}
                  disabled={table.columns.length <= 1}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <DataTable
            columns={workspaceColumns}
            data={workspaceRows}
            storageKey={`astalla:workspace:${table.id}`}
            onDataChange={handleRowsChange}
            persistenceEnabled={true}
            enableVirtualizedRows
            virtualizationThreshold={100}
            virtualizedContainerHeight={600}
          />
        </section>
      </main>
    </div>
  );
}
