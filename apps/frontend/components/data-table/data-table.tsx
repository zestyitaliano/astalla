"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type Column,
  type ColumnDef,
  type ColumnOrderState,
  type ColumnPinningState,
  type ColumnSizingState,
  type SortingState,
  type Table,
  type TableMeta
} from "@tanstack/react-table";
import {
  type RowSelectionState,
  type VisibilityState,
  useReactTable
} from "@tanstack/react-table";
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { ColumnVisibilityMenu } from "./column-visibility-menu";
import { DragHandle } from "./drag-handle";
import { EditableCell } from "./editable-cell";
import {
  type TableDensity,
  type TableLayoutState,
  useTablePersistence
} from "./use-table-persistence";

interface DataTableProps<TData extends { id: string }> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  storageKey: string;
  className?: string;
  persistenceEnabled?: boolean;
  onDataChange?: (rows: TData[]) => void;
  meta?: TableMeta<TData>;
  enableVirtualizedRows?: boolean;
  virtualizationThreshold?: number;
  virtualizedContainerHeight?: number;
  virtualizationOverscan?: number;
}

function defaultColumnId<TData>(column: ColumnDef<TData, unknown>, index: number) {
  if (column.id) {
    return column.id.toString();
  }
  if ("accessorKey" in column && column.accessorKey) {
    return column.accessorKey.toString();
  }
  return `col_${index}`;
}

type ColumnWithResizeHandler<TData> = Column<TData, unknown> & {
  getResizeHandler?: () => (event: unknown) => void;
};

function hasResizeHandler<TData>(column: Column<TData, unknown>): column is ColumnWithResizeHandler<TData> {
  return typeof (column as ColumnWithResizeHandler<TData>).getResizeHandler === "function";
}

function columnResizeHandler<TData>(column: Column<TData, unknown>) {
  if (hasResizeHandler(column)) {
    return column.getResizeHandler?.();
  }
  return undefined;
}

const densityToRowClass: Record<TableDensity, string> = {
  comfortable: "text-sm",
  compact: "text-sm [&_td]:py-2 [&_th]:py-2"
};

export function DataTable<TData extends { id: string }>({
  columns,
  data,
  storageKey,
  className,
  persistenceEnabled = true,
  onDataChange,
  meta,
  enableVirtualizedRows = false,
  virtualizationThreshold = 200,
  virtualizedContainerHeight = 560,
  virtualizationOverscan = 12
}: DataTableProps<TData>) {
  const selectionColumn = useMemo<ColumnDef<TData, unknown>>(
    () => ({
      id: "__select",
      header: ({ table }) => (
        <Checkbox
          aria-label="Select all rows"
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label={`Select row ${row.index + 1}`}
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 48,
      meta: { disableDrag: true }
    }),
    []
  );

  const tableColumns = useMemo<ColumnDef<TData, unknown>[]>(() => {
    return [selectionColumn, ...columns.map((column) => ({ ...column, cell: column.cell ?? EditableCell }))];
  }, [columns, selectionColumn]);

  const columnIds = useMemo(
    () => tableColumns.map((column, index) => defaultColumnId(column, index)),
    [tableColumns]
  );

  const defaultLayout = useMemo<TableLayoutState>(() => ({
    columnOrder: columnIds,
    columnVisibility: {},
    columnSizing: {},
    density: "comfortable"
  }), [columnIds]);

  const { layout, updateLayout, reset } = useTablePersistence(storageKey, defaultLayout, persistenceEnabled);

  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(layout.columnOrder);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(layout.columnVisibility);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(layout.columnSizing);
  const [density, setDensity] = useState<TableDensity>(layout.density);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({});
  const [tableData, setTableData] = useState<TData[]>(data);
  const tableScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setColumnOrder(layout.columnOrder);
    setColumnVisibility(layout.columnVisibility);
    setColumnSizing(layout.columnSizing);
    setDensity(layout.density);
  }, [layout.columnOrder, layout.columnSizing, layout.columnVisibility, layout.density]);

  useEffect(() => {
    setColumnOrder((previous) => {
      const existing = new Set(previous);
      const cleaned = previous.filter((id) => columnIds.includes(id));
      const merged = [...cleaned, ...columnIds.filter((id) => !existing.has(id))];
      return merged;
    });
  }, [columnIds]);

  useEffect(() => {
    setTableData(data);
  }, [data]);

  useEffect(() => {
    updateLayout({ columnOrder, columnVisibility, columnSizing, density });
  }, [columnOrder, columnVisibility, columnSizing, density, updateLayout]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const rowSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleRowDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = tableData.findIndex((row) => row.id === active.id);
    const newIndex = tableData.findIndex((row) => row.id === over.id);
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const nextData = arrayMove(tableData, oldIndex, newIndex);
    setTableData(nextData);
    onDataChange?.(nextData);
  };

  const handleColumnDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) {
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) {
      return;
    }

    setColumnOrder((previous) => arrayMove(previous, previous.indexOf(activeId), previous.indexOf(overId)));
  };

  const table = useReactTable({
    data: tableData,
    columns: tableColumns,
    state: {
      sorting,
      globalFilter,
      columnVisibility,
      columnOrder,
      columnSizing,
      rowSelection,
      columnPinning
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: setColumnSizing,
    onRowSelectionChange: setRowSelection,
    onColumnPinningChange: setColumnPinning,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    columnResizeMode: "onChange",
    getRowId: (originalRow) => originalRow.id,
    meta: {
      onUpdate: (rowId: string, columnId: string, value: unknown) => {
        setTableData((previous) => {
          const nextRows = previous.map((row) => (row.id === rowId ? { ...row, [columnId]: value } : row));
          onDataChange?.(nextRows);
          return nextRows;
        });
      },
      ...meta
    }
  });

  const tableRows = table.getRowModel().rows;
  const shouldVirtualize =
    enableVirtualizedRows && tableRows.length > 0 && tableRows.length >= virtualizationThreshold;
  const rowVirtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => tableScrollRef.current,
    estimateSize: () => (density === "compact" ? 40 : 56),
    overscan: virtualizationOverscan,
    enabled: shouldVirtualize
  });
  const tableClassName = useMemo(
    () => cn("min-w-full text-left", densityToRowClass[density]),
    [density]
  );
  const noDataRow = (
    <tr>
      <td
        colSpan={table.getAllLeafColumns().length}
        className="px-6 py-12 text-center text-sm text-muted-foreground"
      >
        No data found. Adjust your filters or add new records.
      </td>
    </tr>
  );

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2">
          <Input
            value={globalFilter}
            onChange={(event) => table.setGlobalFilter(event.target.value)}
            placeholder="Search records..."
            className="max-w-xs rounded-full border-border/70 bg-card px-4"
            aria-label="Search table"
          />
          <ColumnVisibilityMenu table={table} />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-border/60 bg-card p-1">
            {(["comfortable", "compact"] as TableDensity[]).map((option) => (
              <Button
                key={option}
                type="button"
                size="sm"
                variant={density === option ? "default" : "ghost"}
                className={cn(
                  "h-8 rounded-full px-3 text-xs capitalize",
                  density === option ? "shadow-sm" : "text-muted-foreground"
                )}
                onClick={() => setDensity(option)}
              >
                {option}
              </Button>
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full border border-transparent px-3 text-xs text-muted-foreground hover:border-border"
            onClick={reset}
          >
            Reset layout
          </Button>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
        <div
          ref={tableScrollRef}
          className="w-full overflow-auto"
          style={shouldVirtualize ? { maxHeight: virtualizedContainerHeight } : undefined}
        >
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleColumnDragEnd}>
            <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
              <table className={tableClassName}>
                <thead className="bg-card-contrast/60 text-xs uppercase tracking-wide text-muted-foreground">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <SortableColumnHeader key={header.id} header={header} />
                      ))}
                    </tr>
                  ))}
                </thead>
                {shouldVirtualize ? (
                  <tbody
                    style={{
                      height: rowVirtualizer.getTotalSize(),
                      position: "relative"
                    }}
                  >
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                      const row = tableRows[virtualRow.index];
                      return <VirtualizedRow key={row.id} row={row} virtualRow={virtualRow} />;
                    })}
                  </tbody>
                ) : (
                  <DndContext sensors={rowSensors} collisionDetection={closestCenter} onDragEnd={handleRowDragEnd}>
                    <tbody>
                      <SortableContext items={tableRows.map((row) => row.id)} strategy={verticalListSortingStrategy}>
                        {tableRows.length === 0
                          ? noDataRow
                          : tableRows.map((row) => <SortableRow key={row.id} row={row} />)}
                      </SortableContext>
                    </tbody>
                  </DndContext>
                )}
              </table>
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  );
}

interface SortableColumnHeaderProps<TData> {
  header: ReturnType<Table<TData>["getHeaderGroups"]>[number]["headers"][number];
}

function SortableColumnHeader<TData>({ header }: SortableColumnHeaderProps<TData>) {
  const column = header.column;
  const meta = (column.columnDef.meta ?? {}) as { disableDrag?: boolean };
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
    disabled: meta.disableDrag
  });
  const resizeHandler = columnResizeHandler(column);

  return (
    <th
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "relative select-none border-b border-border/60 bg-card-contrast/40 px-4 py-3 text-xs font-semibold uppercase text-muted-foreground",
        isDragging && "z-10 bg-card shadow-lg"
      )}
    >
      {header.isPlaceholder ? null : (
        <div className="flex items-center gap-2">
          {column.getCanSort() ? (
            <button
              type="button"
              className="flex items-center gap-1 text-left text-foreground"
              onClick={column.getToggleSortingHandler()}
            >
              <span>{flexRender(column.columnDef.header, header.getContext())}</span>
              {column.getIsSorted() ? (
                <span className="text-[10px] uppercase text-muted-foreground">
                  {column.getIsSorted() === "asc" ? "▲" : "▼"}
                </span>
              ) : null}
            </button>
          ) : (
            <span className="text-foreground">{flexRender(column.columnDef.header, header.getContext())}</span>
          )}
          {!meta.disableDrag ? <DragHandle {...attributes} {...listeners} /> : null}
          {column.getCanResize() ? (
            <div
              onMouseDown={resizeHandler}
              onTouchStart={resizeHandler}
              className="absolute inset-y-0 right-0 w-1 cursor-col-resize bg-transparent"
            />
          ) : null}
        </div>
      )}
    </th>
  );
}

interface SortableRowProps<TData> {
  row: ReturnType<Table<TData>["getRowModel"]>["rows"][number];
}

function SortableRow<TData>({ row }: SortableRowProps<TData>) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id
  });

  return (
    <tr
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "border-b border-border/40 text-sm text-foreground transition",
        isDragging ? "bg-card-contrast/60 shadow" : "hover:bg-card-contrast/40"
      )}
    >
      {row.getVisibleCells().map((cell) => {
        const isSelectionCell = cell.column.id === "__select";
        return (
          <td
            key={cell.id}
            className={cn("px-4", isSelectionCell ? "w-[52px]" : "py-3")}
          >
            {isSelectionCell ? (
              <div className="flex items-center gap-2">
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                <DragHandle ref={setActivatorNodeRef} {...attributes} {...listeners} className="ml-auto" />
              </div>
            ) : (
              flexRender(cell.column.columnDef.cell, cell.getContext())
            )}
          </td>
        );
      })}
    </tr>
  );
}

interface VirtualizedRowProps<TData> {
  row: ReturnType<Table<TData>["getRowModel"]>["rows"][number];
  virtualRow: VirtualItem;
}

function VirtualizedRow<TData>({ row, virtualRow }: VirtualizedRowProps<TData>) {
  return (
    <tr
      data-index={virtualRow.index}
      ref={(node) => {
        if (node) {
          virtualRow.measureElement?.(node);
        }
      }}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        transform: `translateY(${virtualRow.start}px)`
      }}
      className="border-b border-border/40 text-sm text-foreground transition hover:bg-card-contrast/40"
    >
      {row.getVisibleCells().map((cell) => {
        const isSelectionCell = cell.column.id === "__select";
        return (
          <td key={cell.id} className={cn("px-4", isSelectionCell ? "w-[52px]" : "py-3")}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        );
      })}
    </tr>
  );
}
