"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Key } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ColumnDef,
  FilterFn,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { format } from "date-fns";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Filter,
  FolderPlus,
  Plus,
  Rows,
  Search,
  Trash2
} from "lucide-react";

import { ColumnTypeSchema, type TableColumnDto, type TableRowDto, type TableViewDto } from "@shared/api";
import {
  TableApiError,
  useCreateColumnMutation,
  useCreateRowMutation,
  useCreateViewMutation,
  useDeleteColumnMutation,
  useDeleteRowMutation,
  useDeleteViewMutation,
  useExportCsvMutation,
  useImportCsvMutation,
  usePatchRowCellsMutation,
  useReorderRowsMutation,
  useTable,
  useUpdateColumnMutation,
  useUpdateViewMutation,
  type TableDetail
} from "@/lib/api/tables";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ReferenceCell } from "@/components/cells/ReferenceCell";

import { ColumnMenu } from "./ColumnMenu";
import { ColumnSettingsDrawer } from "./ColumnSettingsDrawer";
import { ImportCsvModal } from "./ImportCsvModal";
import { ViewMenu } from "./ViewMenu";

type GridRow = {
  __meta: TableRowDto;
} & Record<string, unknown>;

type ColumnKind = TableColumnDto["type"];

type FilterCondition = {
  columnId: string;
  value: string;
};

type SortCondition = {
  columnId: string;
  direction: "asc" | "desc";
};

type ViewConfig = {
  filters?: FilterCondition[];
  sorts?: SortCondition[];
  hidden?: string[];
  columnOrder?: string[];
};

interface TableGridProps {
  tableId: string;
}

const COLUMN_TYPE_ENUM = ColumnTypeSchema.enum;

const SEARCHABLE_COLUMN_TYPES = new Set<ColumnKind>([
  COLUMN_TYPE_ENUM.TEXT,
  COLUMN_TYPE_ENUM.NUMBER,
  COLUMN_TYPE_ENUM.BOOLEAN,
  COLUMN_TYPE_ENUM.DATE
]);

const COLUMN_TYPE_OPTIONS: Array<{ label: string; value: ColumnKind }> = [
  { label: "Text", value: COLUMN_TYPE_ENUM.TEXT },
  { label: "Number", value: COLUMN_TYPE_ENUM.NUMBER },
  { label: "Date", value: COLUMN_TYPE_ENUM.DATE },
  { label: "Boolean", value: COLUMN_TYPE_ENUM.BOOLEAN },
  { label: "Select", value: COLUMN_TYPE_ENUM.SELECT },
  { label: "Reference", value: COLUMN_TYPE_ENUM.REFERENCE }
];

function resolveLoadError(error: Error | null): { message: string | null; showRetry: boolean } {
  if (!error) {
    return { message: null, showRetry: false };
  }

  if (error instanceof TableApiError) {
    if (error.status === 404) {
      return {
        message: "This table no longer exists. It may have been deleted or renamed.",
        showRetry: false
      };
    }

    if (error.status === 401) {
      return {
        message: "You’re signed out or don’t have access.",
        showRetry: false
      };
    }

    const message = error.message?.trim();
    if (message) {
      return { message, showRetry: true };
    }
  }

  const fallbackMessage = error.message?.trim();
  if (fallbackMessage) {
    return { message: fallbackMessage, showRetry: true };
  }

  return {
    message: "We couldn’t load this table. Click retry.",
    showRetry: true
  };
}

function parseSelectOptionsInput(raw: string) {
  const values = raw
    .split(/\r?\n/)
    .flatMap((line) => line.split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(new Set(values));
}

function buildSelectConfig(options: string[]) {
  return {
    options: options.map((value) => ({ label: value, value }))
  };
}

function extractSelectOptionLabels(config: unknown): string[] {
  if (!config || typeof config !== "object") {
    return [];
  }

  const rawOptions = (config as any).options;
  if (!Array.isArray(rawOptions)) {
    return [];
  }

  return rawOptions
    .map((option) => {
      if (!option) {
        return null;
      }
      if (typeof option === "string") {
        return option;
      }
      if (typeof option === "object") {
        const value = (option as any).label ?? (option as any).value;
        return value ? String(value) : null;
      }
      return null;
    })
    .filter((value): value is string => Boolean(value));
}

function parseViewConfig(value: unknown): ViewConfig {
  if (!value || typeof value !== "object") {
    return {};
  }

  const config = value as Record<string, unknown>;
  const filters = Array.isArray(config.filters)
    ? (config.filters
        .map((item) => {
          if (item && typeof item === "object") {
            const columnId = String((item as any).columnId ?? "");
            const val = String((item as any).value ?? "");
            if (columnId) {
              return { columnId, value: val } satisfies FilterCondition;
            }
          }
          return null;
        })
        .filter(Boolean) as FilterCondition[])
    : undefined;
  const sorts = Array.isArray(config.sorts)
    ? (config.sorts
        .map((item) => {
          if (item && typeof item === "object") {
            const columnId = String((item as any).columnId ?? "");
            const direction = (item as any).direction === "desc" ? "desc" : "asc";
            if (columnId) {
              return { columnId, direction } satisfies SortCondition;
            }
          }
          return null;
        })
        .filter(Boolean) as SortCondition[])
    : undefined;
  const hidden = Array.isArray(config.hidden)
    ? (config.hidden.map((item) => String(item ?? "")).filter(Boolean) as string[])
    : undefined;
  const columnOrder = Array.isArray(config.columnOrder)
    ? (config.columnOrder.map((item) => String(item ?? "")).filter(Boolean) as string[])
    : undefined;
  return { filters, sorts, hidden, columnOrder };
}

function buildConfig({
  filters,
  sorts,
  columnVisibility,
  columnOrder
}: {
  filters: FilterCondition[];
  sorts: SortCondition[];
  columnVisibility: Record<string, boolean>;
  columnOrder: string[];
}): ViewConfig {
  const hidden = Object.entries(columnVisibility)
    .filter(([, visible]) => !visible)
    .map(([columnId]) => columnId);
  return {
    filters: filters.length ? filters : undefined,
    sorts: sorts.length ? sorts : undefined,
    hidden: hidden.length ? hidden : undefined,
    columnOrder: columnOrder.length ? columnOrder : undefined
  };
}

function getCellValue(row: TableRowDto, columnId: string) {
  const cell = row.cells.find(
    (entry: TableRowDto["cells"][number]) => entry.columnId === columnId
  );
  return cell?.value ?? null;
}

function stringifyValueForSearch(column: TableColumnDto, value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (column.type === COLUMN_TYPE_ENUM.BOOLEAN) {
    if (typeof value === "boolean") {
      return value ? "true" : "false";
    }
    if (typeof value === "number") {
      return value !== 0 ? "true" : "false";
    }
    if (typeof value === "string") {
      const normalized = value.toLowerCase();
      if (["true", "1", "yes", "y", "on"].includes(normalized)) {
        return "true";
      }
      if (["false", "0", "no", "n", "off"].includes(normalized)) {
        return "false";
      }
    }
  }

  if (column.type === COLUMN_TYPE_ENUM.NUMBER) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value.toString();
    }
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed.toString();
    }
  }

  if (column.type === COLUMN_TYPE_ENUM.DATE) {
    const date = value instanceof Date ? value : new Date(String(value));
    if (!Number.isNaN(date.getTime())) {
      const iso = date.toISOString();
      const locale = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`.trim();
      return `${iso} ${locale}`.trim();
    }
  }

  return String(value);
}

function normalizeValue(type: ColumnKind, value: unknown) {
  if (value === null || value === undefined) {
    if (type === "BOOLEAN") {
      return false;
    }
    return "";
  }
  if (type === "BOOLEAN") {
    return Boolean(value);
  }
  if (type === "NUMBER") {
    const number = Number(value);
    return Number.isFinite(number) ? number : "";
  }
  return value as any;
}

function applyFilters(rows: TableRowDto[], filters: FilterCondition[], columnMap: Map<string, TableColumnDto>) {
  if (!filters.length) {
    return rows;
  }
  return rows.filter((row) =>
    filters.every((filter) => {
      const column = columnMap.get(filter.columnId);
      if (!column) {
        return true;
      }
      const value = getCellValue(row, column.id);
      const query = String(filter.value ?? "").trim().toLowerCase();

      if (!query) {
        return true;
      }

      if (value === null || value === undefined) {
        return false;
      }

      const normalized = stringifyValueForSearch(column, value).toLowerCase();

      if (column.type === "BOOLEAN") {
        return normalized === query;
      }

      return normalized.includes(query);
    })
  );
}

function applySorts(rows: TableRowDto[], sorts: SortCondition[], columnMap: Map<string, TableColumnDto>) {
  if (!sorts.length) {
    return rows;
  }
  const sorted = [...rows];
  const compare = (a: TableRowDto, b: TableRowDto, column: TableColumnDto, direction: "asc" | "desc") => {
    const aValue = getCellValue(a, column.id);
    const bValue = getCellValue(b, column.id);
    const multiplier = direction === "asc" ? 1 : -1;
    if (aValue === bValue) {
      return 0;
    }
    if (aValue === null || aValue === undefined) {
      return -1 * multiplier;
    }
    if (bValue === null || bValue === undefined) {
      return 1 * multiplier;
    }
    if (column.type === "NUMBER") {
      return (Number(aValue) - Number(bValue)) * multiplier;
    }
    if (column.type === "DATE") {
      return (new Date(String(aValue)).getTime() - new Date(String(bValue)).getTime()) * multiplier;
    }
    if (column.type === "BOOLEAN") {
      return (aValue === bValue ? 0 : aValue ? 1 : -1) * multiplier;
    }
    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();
    if (aStr === bStr) {
      return 0;
    }
    return (aStr > bStr ? 1 : -1) * multiplier;
  };

  sorted.sort((a, b) => {
    for (const sort of sorts) {
      const column = columnMap.get(sort.columnId);
      if (!column) {
        continue;
      }
      const result = compare(a, b, column, sort.direction);
      if (result !== 0) {
        return result;
      }
    }
    return 0;
  });
  return sorted;
}

type VirtualItem = {
  key: Key;
  index: number;
  start: number;
  size: number;
};

interface SortableRowProps {
  row: any;
  virtualRow: VirtualItem;
  allowDrag: boolean;
}

function SortableRow({ row, virtualRow, allowDrag }: SortableRowProps) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: row.original.__meta.id,
    disabled: !allowDrag
  });

  const y = (transform?.y ?? 0) + virtualRow.start;
  const x = transform?.x ?? 0;

  return (
    <div
      ref={setNodeRef}
      style={{
        height: `${virtualRow.size}px`,
        transform: CSS.Transform.toString({ x, y, scaleX: 1, scaleY: 1 }),
        transition,
        zIndex: isDragging ? 10 : undefined,
        position: "absolute",
        width: "100%"
      }}
      className={cn(
        "flex items-stretch border-b border-border/60 bg-card/70 last:border-none",
        isDragging ? "shadow-cardHover" : undefined
      )}
      {...attributes}
      {...listeners}
    >
      {row.getVisibleCells().map((cell: any) => (
        <div
          key={cell.id}
          className={cn(
            "flex min-h-full flex-none items-center border-r border-border/40 px-3 text-sm text-text last:border-r-0",
            cell.column.getSize() ? undefined : "min-w-[12rem]"
          )}
          style={{ width: cell.column.getSize() ? `${cell.column.getSize()}px` : undefined }}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </div>
      ))}
    </div>
  );
}

export function TableGrid({ tableId }: TableGridProps) {
  const [loadError, setLoadError] = useState<Error | null>(null);

  const { data, isLoading, isFetching, refetch, error } = useTable(tableId, {
    onError: (error) => {
      setLoadError(error);
    },
    onSuccess: () => {
      setLoadError(null);
    }
  });
  const tableData = data as TableDetail | undefined;
  const createColumnMutation = useCreateColumnMutation(tableId);
  const updateColumnMutation = useUpdateColumnMutation(tableId);
  const deleteColumnMutation = useDeleteColumnMutation(tableId);
  const deleteViewMutation = useDeleteViewMutation(tableId);
  const createRowMutation = useCreateRowMutation(tableId);
  const patchCellsMutation = usePatchRowCellsMutation(tableId);
  const reorderRowsMutation = useReorderRowsMutation(tableId);
  const deleteRowMutation = useDeleteRowMutation(tableId);
  const createViewMutation = useCreateViewMutation(tableId);
  const updateViewMutation = useUpdateViewMutation(tableId);
  const exportCsvMutation = useExportCsvMutation(tableId);
  const importCsvMutation = useImportCsvMutation(tableId);

  const columns = useMemo<TableColumnDto[]>(() => tableData?.columns ?? [], [tableData]);
  const rows = useMemo<TableRowDto[]>(() => tableData?.rows ?? [], [tableData]);
  const views = useMemo<TableViewDto[]>(() => tableData?.views ?? [], [tableData]);

  const isInitialLoading = isLoading && !tableData;
  const isRefetching = isFetching && !isInitialLoading;

  useEffect(() => {
    if (error) {
      setLoadError(error);
    }
  }, [error]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const { message: loadErrorMessage, showRetry: shouldShowRetry } = useMemo(
    () => resolveLoadError(loadError),
    [loadError]
  );

  const errorAlert = loadErrorMessage ? (
    <Alert variant="destructive" className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <AlertTitle>Unable to load table</AlertTitle>
        <AlertDescription>{loadErrorMessage}</AlertDescription>
      </div>
      {shouldShowRetry ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0"
          onClick={handleRetry}
          disabled={isRefetching}
        >
          {isRefetching ? "Retrying…" : "Retry"}
        </Button>
      ) : null}
    </Alert>
  ) : null;

  const columnMap = useMemo(
    () => new Map(columns.map((column: TableColumnDto) => [column.id, column])),
    [columns]
  );
  const baseColumnOrder = useMemo(() => columns.map((column: TableColumnDto) => column.id), [columns]);

  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [columnOrder, setColumnOrder] = useState<string[]>(baseColumnOrder);
  const [rowOrder, setRowOrder] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [sorts, setSorts] = useState<SortCondition[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [tableBodyMaxHeight, setTableBodyMaxHeight] = useState<number>();
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnType, setNewColumnType] = useState<ColumnKind>(COLUMN_TYPE_ENUM.TEXT);
  const [newColumnOptions, setNewColumnOptions] = useState("");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importSummary, setImportSummary] = useState<{ createdColumns: number; createdRows: number } | null>(null);
  const [importToast, setImportToast] = useState<string | null>(null);
  const importToastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const copyStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeColumnSettings, setActiveColumnSettings] = useState<{ columnId: string } | null>(null);

  const openColumnSettings = useCallback((columnId: string) => {
    setActiveColumnSettings({ columnId });
  }, []);

  const closeColumnSettings = useCallback(() => {
    setActiveColumnSettings(null);
  }, []);

  useEffect(() => {
    return () => {
      if (importToastTimerRef.current) {
        clearTimeout(importToastTimerRef.current);
      }
      if (copyStatusTimerRef.current) {
        clearTimeout(copyStatusTimerRef.current);
      }
    };
  }, []);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState("");
  const [globalQuery, setGlobalQuery] = useState("");
  const [debouncedGlobalQuery, setDebouncedGlobalQuery] = useState("");

  const reorderDisabled = Boolean(filters.length || sorts.length);

  const orderedViewColumns = useMemo(() => {
    const byId = new Map(columns.map((column: TableColumnDto) => [column.id, column] as const));
    const seen = new Set<string>();
    const ordered: TableColumnDto[] = [];

    for (const columnId of columnOrder) {
      const column = byId.get(columnId);
      if (column && !seen.has(column.id)) {
        ordered.push(column);
        seen.add(column.id);
      }
    }

    if (seen.size < columns.length) {
      for (const column of columns) {
        if (!seen.has(column.id)) {
          ordered.push(column);
          seen.add(column.id);
        }
      }
    }

    return ordered;
  }, [columns, columnOrder]);

  useEffect(() => {
    setColumnOrder(baseColumnOrder);
  }, [baseColumnOrder]);

  useEffect(() => {
    if (!isAddColumnOpen) {
      setNewColumnName("");
      setNewColumnType(COLUMN_TYPE_ENUM.TEXT);
      setNewColumnOptions("");
    }
  }, [isAddColumnOpen]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedGlobalQuery(globalQuery);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [globalQuery]);

  useEffect(() => {
    setColumnVisibility((prev) => {
      const next: Record<string, boolean> = {};
      for (const column of columns) {
        next[column.id] = prev[column.id] ?? true;
      }
      return next;
    });
  }, [columns]);

  useEffect(() => {
    const ordered = [...rows]
      .sort((a, b) => a.position - b.position)
      .map((row) => row.id);
    setRowOrder(ordered);
  }, [rows]);

  useEffect(() => {
    const activeView = activeViewId
      ? views.find((view: TableViewDto) => view.id === activeViewId)
      : null;
    if (!activeView) {
      setFilters([]);
      setSorts([]);
      setColumnVisibility((prev) => {
        const next: Record<string, boolean> = {};
        for (const column of columns) {
          next[column.id] = prev[column.id] ?? true;
        }
        return next;
      });
      setColumnOrder(baseColumnOrder);
      return;
    }
    const parsed = parseViewConfig(activeView.config);
    setFilters(parsed.filters ?? []);
    setSorts(parsed.sorts ?? []);
    setColumnVisibility(() => {
      const hidden = new Set(parsed.hidden ?? []);
      const next: Record<string, boolean> = {};
      for (const column of columns) {
        next[column.id] = !hidden.has(column.id);
      }
      return next;
    });
    setColumnOrder(parsed.columnOrder?.length ? parsed.columnOrder : baseColumnOrder);
  }, [activeViewId, views, columns, baseColumnOrder]);

  useEffect(() => {
    setSelectedRows((prev) => {
      const next = new Set<string>();
      for (const row of rows) {
        if (prev.has(row.id)) {
          next.add(row.id);
        }
      }
      return next;
    });
  }, [rows]);

  const orderedRows = useMemo(() => {
    if (!rows.length) {
      return [];
    }

    const rowMap = new Map(rows.map((row) => [row.id, row] as const));
    const seen = new Set<string>();
    const ordered: TableRowDto[] = [];

    for (const rowId of rowOrder) {
      const row = rowMap.get(rowId);
      if (row && !seen.has(row.id)) {
        ordered.push(row);
        seen.add(row.id);
      }
    }

    if (ordered.length === rows.length) {
      return ordered;
    }

    const fallback = [...rows]
      .sort((a, b) => a.position - b.position)
      .filter((row) => !seen.has(row.id));

    return ordered.concat(fallback);
  }, [rowOrder, rows]);

  const filteredRows = useMemo(() => applyFilters(orderedRows, filters, columnMap), [orderedRows, filters, columnMap]);
  const sortedRows = useMemo(() => applySorts(filteredRows, sorts, columnMap), [filteredRows, sorts, columnMap]);

  const gridRows = useMemo<GridRow[]>(() => {
    return sortedRows.map((row) => {
      const record: GridRow = { __meta: row };
      for (const column of columns) {
        record[column.id] = getCellValue(row, column.id);
      }
      return record;
    });
  }, [sortedRows, columns]);

  const searchableColumns = useMemo(() => {
    return columns.filter(
      (column) => (columnVisibility[column.id] ?? true) && SEARCHABLE_COLUMN_TYPES.has(column.type)
    );
  }, [columns, columnVisibility]);

  const globalFilterFn = useMemo<FilterFn<GridRow>>(
    () =>
      (row, _columnId, filterValue) => {
        const query = String(filterValue ?? "").trim().toLowerCase();

        if (!query) {
          return true;
        }

        if (!searchableColumns.length) {
          return false;
        }

        for (const column of searchableColumns) {
          const rawValue = row.original[column.id];
          const text = stringifyValueForSearch(column, rawValue).toLowerCase();
          if (text && text.includes(query)) {
            return true;
          }
        }

        return false;
      },
    [searchableColumns]
  );

  const handleRowDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (reorderDisabled) {
        return;
      }
      const activeId = String(event.active.id);
      const overId = event.over ? String(event.over.id) : null;
      if (!overId || activeId === overId) {
        return;
      }
      setRowOrder((prev) => {
        const activeIndex = prev.indexOf(activeId);
        const overIndex = prev.indexOf(overId);
        if (activeIndex === -1 || overIndex === -1) {
          return prev;
        }
        const next = arrayMove(prev, activeIndex, overIndex);
        reorderRowsMutation.mutate(next.map((rowId, index) => ({ rowId, position: index + 1 })));
        return next;
      });
    },
    [reorderRowsMutation, reorderDisabled]
  );

  const handleToggleColumnVisibility = useCallback(
    (columnId: string, nextVisible?: boolean) => {
      setColumnVisibility((prev) => {
        const current = prev[columnId] ?? true;
        const resolved = typeof nextVisible === "boolean" ? nextVisible : !current;

        if (resolved === current) {
          return prev;
        }

        const next = { ...prev, [columnId]: resolved };
        if (activeViewId) {
          const config = buildConfig({ filters, sorts, columnVisibility: next, columnOrder });
          updateViewMutation.mutate({ id: activeViewId, payload: { config } });
        }
        return next;
      });
    },
    [activeViewId, columnOrder, filters, sorts, updateViewMutation]
  );

  const handleDeleteColumn = useCallback(
    (columnId: string) => {
      if (!window.confirm("Delete this column?")) {
        return;
      }
      deleteColumnMutation.mutate(columnId);
    },
    [deleteColumnMutation]
  );

  const startRenameColumn = useCallback((column: TableColumnDto) => {
    setEditingColumnId(column.id);
    setEditingColumnName(column.name);
  }, []);

  const commitRename = useCallback(
    (columnId: string, nextName: string) => {
      const trimmed = nextName.trim();
      if (!trimmed) {
        setEditingColumnId(null);
        return;
      }
      updateColumnMutation.mutate({ id: columnId, payload: { name: trimmed } });
      setEditingColumnId(null);
    },
    [updateColumnMutation]
  );

  const handleChangeColumnType = useCallback(
    (column: TableColumnDto, nextType: ColumnKind) => {
      if (column.type === nextType) {
        return;
      }

      const payload: { type: ColumnKind; config?: unknown } = { type: nextType };

      if (nextType === COLUMN_TYPE_ENUM.SELECT) {
        const existing = extractSelectOptionLabels(column.config);
        const defaultValue = existing.join(", ");
        const input = typeof window !== "undefined"
          ? window.prompt(
              "Enter select options separated by commas or line breaks",
              defaultValue
            )
          : "";

        if (input === null) {
          return;
        }

        const values = parseSelectOptionsInput(input ?? "");
        payload.config = buildSelectConfig(values);
      } else if (column.type === COLUMN_TYPE_ENUM.SELECT) {
        payload.config = null;
      }

      updateColumnMutation.mutate({ id: column.id, payload });
    },
    [updateColumnMutation]
  );

  const handleCommitCell = useCallback(
    (rowId: string, columnId: string, value: unknown) => {
      patchCellsMutation.mutate({ rowId, cells: [{ columnId, value }] });
    },
    [patchCellsMutation]
  );

  const handleMoveColumn = useCallback(
    (columnId: string, direction: "left" | "right") => {
      setColumnOrder((prev) => {
        const currentIndex = prev.indexOf(columnId);
        if (currentIndex === -1) {
          return prev;
        }

        const targetIndex =
          direction === "left"
            ? Math.max(currentIndex - 1, 0)
            : Math.min(currentIndex + 1, prev.length - 1);

        if (targetIndex === currentIndex) {
          return prev;
        }

        const next = arrayMove(prev, currentIndex, targetIndex);
        const newPosition = next.indexOf(columnId) + 1;
        updateColumnMutation.mutate({ id: columnId, payload: { position: newPosition } });

        if (activeViewId) {
          const config = buildConfig({ filters, sorts, columnVisibility, columnOrder: next });
          updateViewMutation.mutate({ id: activeViewId, payload: { config } });
        }

        return next;
      });
    },
    [activeViewId, columnVisibility, filters, sorts, updateColumnMutation, updateViewMutation]
  );

  const columnDefs = useMemo<ColumnDef<GridRow>[]>(() => {
    const defs: ColumnDef<GridRow>[] = [];

    defs.push({
      id: "__select__",
      header: () => (
        <Checkbox
          checked={selectedRows.size > 0 && selectedRows.size === gridRows.length}
          onCheckedChange={(value) => {
            if (value) {
              setSelectedRows(new Set(gridRows.map((row) => row.__meta.id)));
            } else {
              setSelectedRows(new Set());
            }
          }}
          aria-label="Select all rows"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedRows.has(row.original.__meta.id)}
          onCheckedChange={(value) => {
            setSelectedRows((prev) => {
              const next = new Set(prev);
              if (value) {
                next.add(row.original.__meta.id);
              } else {
                next.delete(row.original.__meta.id);
              }
              return next;
            });
          }}
          aria-label="Select row"
        />
      ),
      size: 40,
      enableResizing: false
    });

    defs.push({
      id: "__position__",
      header: () => <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">#</span>,
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Rows className="h-3.5 w-3.5" />
          {row.index + 1}
        </div>
      ),
      size: 64,
      enableResizing: false
    });

    for (const column of columns) {
      defs.push({
        id: column.id,
        accessorKey: column.id,
        header: () => {
          const columnIndex = columnOrder.indexOf(column.id);
          const canMoveLeft = columnIndex > 0;
          const canMoveRight = columnIndex > -1 && columnIndex < columnOrder.length - 1;

          return (
            <ColumnHeader
              column={column}
              columnVisibility={columnVisibility}
              onToggleVisibility={() => handleToggleColumnVisibility(column.id)}
              onDelete={() => handleDeleteColumn(column.id)}
              onStartRename={() => startRenameColumn(column)}
              isEditing={editingColumnId === column.id}
              editingName={editingColumnName}
              onEditingNameChange={setEditingColumnName}
              onCommit={(next) => commitRename(column.id, next)}
              onChangeType={(next) => handleChangeColumnType(column, next)}
              onMoveLeft={() => handleMoveColumn(column.id, "left")}
              onMoveRight={() => handleMoveColumn(column.id, "right")}
              canMoveLeft={canMoveLeft}
              canMoveRight={canMoveRight}
              onOpenReferenceSettings={() => openColumnSettings(column.id)}
              showReferenceSettings={column.type === COLUMN_TYPE_ENUM.REFERENCE}
            />
          );
        },
        cell: ({ row, getValue }) => (
          <CellEditor
            column={column}
            row={row.original.__meta}
            value={getValue()}
            onCommit={(next) => handleCommitCell(row.original.__meta.id, column.id, next)}
          />
        ),
        size: 200
      });
    }

    return defs;
  }, [
    columns,
    columnVisibility,
    selectedRows,
    gridRows,
    editingColumnId,
    editingColumnName,
    handleToggleColumnVisibility,
    handleDeleteColumn,
    startRenameColumn,
    commitRename,
    handleCommitCell,
    columnOrder,
    handleMoveColumn,
    handleChangeColumnType,
    openColumnSettings
  ]);

  const tableColumnOrder = useMemo(() => ["__select__", "__position__", ...columnOrder], [columnOrder]);

  const columnDragItems = tableColumnOrder;

  const settingsColumn = useMemo(() => {
    if (!activeColumnSettings) {
      return null;
    }
    return columns.find((item) => item.id === activeColumnSettings.columnId) ?? null;
  }, [activeColumnSettings, columns]);

  const settingsColumnType = settingsColumn?.type;

  useEffect(() => {
    if (activeColumnSettings && !settingsColumn) {
      setActiveColumnSettings(null);
    }
  }, [activeColumnSettings, settingsColumn]);

  useEffect(() => {
    if (activeColumnSettings && settingsColumnType && settingsColumnType !== COLUMN_TYPE_ENUM.REFERENCE) {
      setActiveColumnSettings(null);
    }
  }, [activeColumnSettings, settingsColumnType]);

  const table = useReactTable({
    data: gridRows,
    columns: columnDefs,
    state: {
      columnOrder: tableColumnOrder,
      columnVisibility,
      globalFilter: debouncedGlobalQuery
    },
    onColumnOrderChange: (updater) => {
      const nextOrder = typeof updater === "function" ? (updater as (old: string[]) => string[])(tableColumnOrder) : updater;
      const filtered = nextOrder.filter((id) => id !== "__select__" && id !== "__position__");
      setColumnOrder(filtered);
    },
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel()
  });

  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowModel = table.getRowModel();
  const rowVirtualizer = useVirtualizer({
    count: rowModel.rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 8
  });

  useEffect(() => {
    const VIEWPORT_OFFSET = 360;

    const updateMaxHeight = () => {
      if (typeof window === "undefined") {
        return;
      }

      const availableHeight = Math.max(window.innerHeight - VIEWPORT_OFFSET, 320);
      setTableBodyMaxHeight(availableHeight);
    };

    updateMaxHeight();

    window.addEventListener("resize", updateMaxHeight);

    return () => {
      window.removeEventListener("resize", updateMaxHeight);
    };
  }, []);

  const rowSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const columnSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleAddRow = () => {
    createRowMutation.mutate(undefined);
  };

  const handleDeleteSelected = () => {
    const ids = Array.from(selectedRows);
    if (!ids.length) {
      return;
    }
    if (!window.confirm(`Delete ${ids.length} row${ids.length === 1 ? "" : "s"}?`)) {
      return;
    }
    Promise.all(ids.map((id) => deleteRowMutation.mutateAsync(id))).then(() => {
      setSelectedRows(new Set());
    });
  };

  const handleAddColumn = async () => {
    const name = newColumnName.trim() || "New column";
    const payload: { name: string; type: ColumnKind; config?: unknown } = {
      name,
      type: newColumnType
    };

    if (newColumnType === COLUMN_TYPE_ENUM.SELECT) {
      const values = parseSelectOptionsInput(newColumnOptions);
      payload.config = buildSelectConfig(values);
    }

    await createColumnMutation.mutateAsync(payload);
    setIsAddColumnOpen(false);
  };

  const handleSaveCurrentView = useCallback(async () => {
    const name = window.prompt("Name your view");
    if (!name) {
      return;
    }
    const config = buildConfig({ filters, sorts, columnVisibility, columnOrder });
    const view = await createViewMutation.mutateAsync({ name, config });
    setActiveViewId(view.id);
  }, [createViewMutation, filters, sorts, columnVisibility, columnOrder]);

  const handleRenameView = useCallback(
    (viewId: string) => {
      const view = views.find((item) => item.id === viewId);
      const next = window.prompt("Rename view", view?.name ?? "");
      if (!next) {
        return;
      }
      updateViewMutation.mutate({ id: viewId, payload: { name: next } });
    },
    [updateViewMutation, views]
  );

  const handleDeleteView = useCallback(
    (viewId: string) => {
      if (!window.confirm("Delete this view?")) {
        return;
      }
      deleteViewMutation.mutate(viewId, {
        onSuccess: () => {
          setActiveViewId((current) => (current === viewId ? null : current));
        }
      });
    },
    [deleteViewMutation]
  );

  useEffect(() => {
    setColumnVisibility((prev) => {
      const next: Record<string, boolean> = {};
      for (const columnId of columnOrder) {
        next[columnId] = prev[columnId] ?? true;
      }
      return next;
    });
  }, [columnOrder]);

  const handleColumnOrderChange = useCallback(
    (event: DragEndEvent) => {
      const activeId = String(event.active.id);
      const overId = event.over ? String(event.over.id) : null;
      if (!overId || activeId === overId) {
        return;
      }
      setColumnOrder((prev) => {
        const activeIndex = prev.indexOf(activeId);
        const overIndex = prev.indexOf(overId);
        if (activeIndex === -1 || overIndex === -1) {
          return prev;
        }
        const next = arrayMove(prev, activeIndex, overIndex);
        const movedColumnId = activeId;
        const newPosition = next.indexOf(movedColumnId) + 1;
        updateColumnMutation.mutate({ id: movedColumnId, payload: { position: newPosition } });
        if (activeViewId) {
          const config = buildConfig({ filters, sorts, columnVisibility, columnOrder: next });
          updateViewMutation.mutate({ id: activeViewId, payload: { config } });
        }
        return next;
      });
    },
    [activeViewId, columnVisibility, filters, sorts, updateColumnMutation, updateViewMutation]
  );

  const handleFilterChange = useCallback(
    (nextFilters: FilterCondition[]) => {
      setFilters(nextFilters);
      if (activeViewId) {
        const config = buildConfig({ filters: nextFilters, sorts, columnVisibility, columnOrder });
        updateViewMutation.mutate({ id: activeViewId, payload: { config } });
      }
    },
    [activeViewId, sorts, columnVisibility, columnOrder, updateViewMutation]
  );

  const handleSortChange = useCallback(
    (nextSorts: SortCondition[]) => {
      setSorts(nextSorts);
      if (activeViewId) {
        const config = buildConfig({ filters, sorts: nextSorts, columnVisibility, columnOrder });
        updateViewMutation.mutate({ id: activeViewId, payload: { config } });
      }
    },
    [activeViewId, filters, columnVisibility, columnOrder, updateViewMutation]
  );

  const handleImport = useCallback(
    async (file: File) => {
      const summary = await importCsvMutation.mutateAsync(file);
      setImportSummary(summary);
      setIsImportOpen(false);
      const parts = [
        summary.createdRows === 1 ? "1 row" : `${summary.createdRows} rows`,
        summary.createdColumns === 1 ? "1 new column" : `${summary.createdColumns} new columns`
      ];
      const message = `Imported ${parts.join(" • ")}`;
      setImportToast(message);
      if (importToastTimerRef.current) {
        clearTimeout(importToastTimerRef.current);
      }
      importToastTimerRef.current = setTimeout(() => setImportToast(null), 4_000);
    },
    [importCsvMutation]
  );

  const footerText = useMemo(() => {
    const updatedAt = tableData?.updatedAt;
    const updatedBy = tableData?.updatedBy;

    if (!updatedAt) {
      return null;
    }

    const actor = updatedBy ?? "system";
    const parsedDate = new Date(updatedAt);

    if (Number.isNaN(parsedDate.getTime())) {
      return `Last updated by ${actor}`;
    }

    const timestamp = format(parsedDate, "MMM d, yyyy h:mm a");
    return `Last updated by ${actor} at ${timestamp}`;
  }, [tableData?.updatedAt, tableData?.updatedBy]);

  const hasColumns = columns.length > 0;
  const hasRows = gridRows.length > 0;

  const handleCopyId = useCallback(async () => {
    if (!tableData?.id) {
      return;
    }

    try {
      await navigator.clipboard.writeText(tableData.id);
      setCopyStatus("copied");
      if (copyStatusTimerRef.current) {
        clearTimeout(copyStatusTimerRef.current);
      }
      copyStatusTimerRef.current = setTimeout(() => {
        setCopyStatus("idle");
      }, 2000);
    } catch (error) {
      console.error("Failed to copy table id", error);
    }
  }, [tableData?.id]);

  if (isInitialLoading) {
    return (
      <div className="flex h-[480px] items-center justify-center rounded-3xl border border-border bg-card/80 shadow-card">
        <span className="text-sm text-muted-foreground">Loading table…</span>
      </div>
    );
  }

  if (!tableData) {
    return (
      <div className="flex h-full flex-col gap-4">
        {errorAlert}
        <div className="flex h-[480px] items-center justify-center rounded-3xl border border-border bg-card/80 shadow-card">
          <span className="text-sm text-muted-foreground">
            {loadErrorMessage ?? "No table data to display."}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {errorAlert}
      <div className="rounded-3xl border border-border/70 bg-card/80 p-4 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-text">{tableData.name}</h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="uppercase tracking-wide">ID</span>
              <code className="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                {tableData.id}
              </code>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full"
            onClick={handleCopyId}
          >
            {copyStatus === "copied" ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            <span aria-live="polite">{copyStatus === "copied" ? "Copied!" : "Copy ID"}</span>
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <ViewMenu
          views={views}
          activeViewId={activeViewId}
          onSelect={setActiveViewId}
          onSaveCurrent={handleSaveCurrentView}
          onRename={handleRenameView}
          onDelete={handleDeleteView}
          isSaving={createViewMutation.isPending}
          columns={orderedViewColumns}
          columnVisibility={columnVisibility}
          onToggleColumnVisibility={(columnId, visible) =>
            handleToggleColumnVisibility(columnId, visible)
          }
        />
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={globalQuery}
            onChange={(event) => setGlobalQuery(event.target.value)}
            placeholder="Quick search"
            aria-label="Quick search"
            className="h-8 w-56 rounded-full border border-border/60 bg-card/70 pl-8 pr-3 text-sm focus-visible:ring-0"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3 py-1">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Filters</span>
          {filters.map((filter, index) => (
            <span
              key={`${filter.columnId}-${index}`}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
            >
              {columnMap.get(filter.columnId)?.name ?? "Column"}: {filter.value || "Any"}
            </span>
          ))}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 rounded-full px-2 text-xs"
            onClick={() =>
              handleFilterChange([
                ...filters,
                { columnId: columns[0]?.id ?? "", value: "" }
              ])
            }
            disabled={!columns.length}
          >
            Add filter
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3 py-1">
          <ArrowDown className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Sorts</span>
          {sorts.map((sort, index) => (
            <span key={`${sort.columnId}-${index}`} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
              {columnMap.get(sort.columnId)?.name ?? "Column"}: {sort.direction === "asc" ? "A→Z" : "Z→A"}
            </span>
          ))}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 rounded-full px-2 text-xs"
            onClick={() =>
              handleSortChange([
                ...sorts,
                { columnId: columns[0]?.id ?? "", direction: "asc" }
              ])
            }
            disabled={!columns.length}
          >
            Add sort
          </Button>
        </div>
        <div className="flex-1" />
        <Button type="button" variant="outline" className="rounded-full" onClick={() => setIsImportOpen(true)}>
          Import CSV
        </Button>
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          onClick={() => exportCsvMutation.mutate(activeViewId ?? undefined)}
        >
          Export CSV
        </Button>
        <Button type="button" className="rounded-full bg-primary text-primary-foreground" onClick={() => setIsAddColumnOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Column
        </Button>
        <Button type="button" className="rounded-full" onClick={handleAddRow}>
          <Plus className="mr-2 h-4 w-4" /> Row
        </Button>
      </div>

      {filters.length ? (
        <div className="space-y-3 rounded-3xl border border-border/70 bg-card/80 p-4 shadow-card">
          {filters.map((filter, index) => (
            <div key={`${filter.columnId}-${index}`} className="flex flex-wrap items-center gap-3">
              <select
                className="rounded-xl border border-border/60 bg-card px-3 py-2 text-sm"
                value={filter.columnId}
                onChange={(event) => {
                  const updated = [...filters];
                  updated[index] = { ...filter, columnId: event.target.value };
                  handleFilterChange(updated);
                }}
              >
                {columns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.name}
                  </option>
                ))}
              </select>
              <Input
                className="w-48"
                value={filter.value}
                onChange={(event) => {
                  const updated = [...filters];
                  updated[index] = { ...filter, value: event.target.value };
                  handleFilterChange(updated);
                }}
                placeholder="Contains…"
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  const updated = filters.filter((_, idx) => idx !== index);
                  handleFilterChange(updated);
                }}
              >
                Remove
              </Button>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Filters update instantly. Save as a view to keep them.</p>
        </div>
      ) : null}

      {sorts.length ? (
        <div className="space-y-3 rounded-3xl border border-border/70 bg-card/80 p-4 shadow-card">
          {sorts.map((sort, index) => (
            <div key={`${sort.columnId}-${index}`} className="flex flex-wrap items-center gap-3">
              <select
                className="rounded-xl border border-border/60 bg-card px-3 py-2 text-sm"
                value={sort.columnId}
                onChange={(event) => {
                  const updated = [...sorts];
                  updated[index] = { ...sort, columnId: event.target.value };
                  handleSortChange(updated);
                }}
              >
                {columns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="secondary"
                className="rounded-full"
                onClick={() => {
                  const updated = [...sorts];
                  updated[index] = {
                    ...sort,
                    direction: sort.direction === "asc" ? "desc" : "asc"
                  };
                  handleSortChange(updated);
                }}
              >
                {sort.direction === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  const updated = sorts.filter((_, idx) => idx !== index);
                  handleSortChange(updated);
                }}
              >
                Remove
              </Button>
            </div>
          ))}
          {reorderDisabled ? (
            <p className="text-xs text-muted-foreground">Row drag is disabled while filters or sorts are active.</p>
          ) : null}
        </div>
      ) : null}

      <div className="relative flex-1 rounded-3xl border border-border bg-card/80 shadow-card">
        {!hasColumns ? (
          <div className="flex h-full items-center justify-center p-10 text-center">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-text">Create your first column</h3>
              <p className="text-sm text-muted-foreground">
                Define the fields your team needs. Add a column to start building your workspace.
              </p>
              <Button type="button" onClick={() => setIsAddColumnOpen(true)} className="rounded-full">
                <Plus className="mr-2 h-4 w-4" /> Add column
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex min-h-0 flex-1 flex-col overflow-x-auto">
              <div className="flex min-h-0 min-w-max flex-1 flex-col">
                <div className="sticky top-0 z-10 border-b border-border/60 bg-card/90">
                  <DndContext sensors={columnSensors} collisionDetection={closestCenter} onDragEnd={handleColumnOrderChange}>
                    <SortableContext items={columnDragItems} strategy={horizontalListSortingStrategy}>
                      <div className="flex">
                        {table.getHeaderGroups().map((headerGroup) => (
                          <Fragment key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                              <SortableColumnHeader
                                key={header.id}
                                header={header}
                                disableDrag={header.column.id === "__select__" || header.column.id === "__position__"}
                              />
                            ))}
                          </Fragment>
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
                {!hasRows ? (
                  <div className="flex h-full flex-1 items-center justify-center p-10 text-center">
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-text">Add your first row</h3>
                      <p className="text-sm text-muted-foreground">
                        Capture records manually or import a CSV to bring in existing data.
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <Button type="button" onClick={handleAddRow} className="rounded-full">
                          <Plus className="mr-2 h-4 w-4" /> Add row
                        </Button>
                        <Button type="button" variant="outline" className="rounded-full" onClick={() => setIsImportOpen(true)}>
                          Import CSV
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <DndContext sensors={rowSensors} collisionDetection={closestCenter} onDragEnd={handleRowDragEnd}>
                    <SortableContext items={rowModel.rows.map((row) => row.original.__meta.id)} strategy={verticalListSortingStrategy}>
                      <div
                        ref={parentRef}
                        className="flex-1 min-h-0 overflow-y-auto"
                        style={tableBodyMaxHeight ? { maxHeight: `${tableBodyMaxHeight}px` } : undefined}
                      >
                        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}>
                          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                            const row = rowModel.rows[virtualRow.index];
                            return (
                              <SortableRow key={row.id} row={row} virtualRow={virtualRow} allowDrag={!reorderDisabled} />
                            );
                          })}
                        </div>
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between rounded-3xl border border-dashed border-border/70 bg-card/70 px-4 py-3 text-xs text-muted-foreground">
        <div>
          {selectedRows.size > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1 text-destructive"
              onClick={handleDeleteSelected}
            >
              <Trash2 className="h-4 w-4" /> Delete selected ({selectedRows.size})
            </Button>
          ) : (
            <span>Select rows to bulk delete.</span>
          )}
        </div>
        {footerText ? <span>{footerText}</span> : null}
      </div>

      {isAddColumnOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 px-4 backdrop-blur">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card/95 p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                <FolderPlus className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-text">Add column</h3>
                <p className="text-sm text-muted-foreground">Name the column and choose the type.</p>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text" htmlFor="column-name">
                  Column name
                </label>
                <Input
                  id="column-name"
                  value={newColumnName}
                  onChange={(event) => setNewColumnName(event.target.value)}
                  placeholder="e.g. Status"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium text-text">Type</span>
                <div className="grid grid-cols-2 gap-2">
                  {COLUMN_TYPE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setNewColumnType(option.value)}
                      className={cn(
                        "flex items-center gap-2 rounded-2xl border border-border/60 bg-card/80 px-3 py-2 text-left text-sm",
                        newColumnType === option.value ? "border-primary text-primary" : "hover:border-primary/60"
                      )}
                    >
                      {newColumnType === option.value ? <Check className="h-4 w-4" /> : <span className="h-4 w-4" />}
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              {newColumnType === COLUMN_TYPE_ENUM.SELECT ? (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text" htmlFor="column-options">
                    Options
                  </label>
                  <textarea
                    id="column-options"
                    value={newColumnOptions}
                    onChange={(event) => setNewColumnOptions(event.target.value)}
                    placeholder={"One option per line"}
                    className="min-h-[96px] w-full rounded-2xl border border-border/60 bg-card/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <p className="text-xs text-muted-foreground">Enter one option per line or separate with commas.</p>
                </div>
              ) : null}
              <div className="flex items-center justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setIsAddColumnOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleAddColumn} disabled={createColumnMutation.isPending}>
                  {createColumnMutation.isPending ? "Adding…" : "Add column"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ImportCsvModal
        open={isImportOpen}
        onOpenChange={(next) => {
          setIsImportOpen(next);
          if (!next) {
            setImportSummary(null);
          }
        }}
        onSubmit={handleImport}
        isSubmitting={importCsvMutation.isPending}
        summary={importSummary}
      />
      {importToast ? (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl border border-border/60 bg-card/95 px-4 py-3 shadow-lg">
          <p className="text-sm font-medium text-text">{importToast}</p>
        </div>
      ) : null}
      <ColumnSettingsDrawer
        tableId={tableId}
        column={settingsColumn}
        open={Boolean(activeColumnSettings && settingsColumn)}
        onClose={closeColumnSettings}
      />
    </div>
  );
}

interface ColumnHeaderProps {
  column: TableColumnDto;
  columnVisibility: Record<string, boolean>;
  onToggleVisibility: () => void;
  onDelete: () => void;
  onStartRename: () => void;
  isEditing: boolean;
  editingName: string;
  onEditingNameChange: (value: string) => void;
  onCommit: (value: string) => void;
  onChangeType: (next: ColumnKind) => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onOpenReferenceSettings?: () => void;
  showReferenceSettings?: boolean;
}

interface SortableColumnHeaderProps {
  header: any;
  disableDrag?: boolean;
}

function SortableColumnHeader({ header, disableDrag = false }: SortableColumnHeaderProps) {
  const { setNodeRef, attributes, listeners, transform, transition } = useSortable({
    id: header.column.id,
    disabled: disableDrag
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        width: header.column.getSize() ? `${header.column.getSize()}px` : undefined,
        transform: CSS.Transform.toString(transform ?? { x: 0, y: 0, scaleX: 1, scaleY: 1 }),
        transition
      }}
      className="flex min-h-[44px] flex-none items-center border-r border-border/40 bg-card/80 px-3 text-sm font-medium text-muted-foreground last:border-r-0"
      {...attributes}
      {...(!disableDrag ? listeners : {})}
    >
      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
    </div>
  );
}

function ColumnHeader({
  column,
  columnVisibility,
  onToggleVisibility,
  onDelete,
  onStartRename,
  isEditing,
  editingName,
  onEditingNameChange,
  onCommit,
  onChangeType,
  onMoveLeft,
  onMoveRight,
  canMoveLeft,
  canMoveRight,
  onOpenReferenceSettings,
  showReferenceSettings
}: ColumnHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      {isEditing ? (
        <Input
          value={editingName}
          onChange={(event) => onEditingNameChange(event.target.value)}
          onBlur={() => onCommit(editingName)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onCommit(editingName);
            }
            if (event.key === "Escape") {
              onCommit(column.name);
            }
          }}
          className="h-8 rounded-lg"
          autoFocus
        />
      ) : (
        <button
          type="button"
          className="text-left text-sm font-semibold text-text"
          onDoubleClick={() => onStartRename()}
        >
          {column.name}
        </button>
      )}
      <ColumnMenu
        column={column}
        onRename={onStartRename}
        onToggleVisibility={onToggleVisibility}
        onDelete={onDelete}
        isHidden={!columnVisibility[column.id]}
        onChangeType={onChangeType}
        onMoveLeft={onMoveLeft}
        onMoveRight={onMoveRight}
        canMoveLeft={canMoveLeft}
        canMoveRight={canMoveRight}
        onOpenReferenceSettings={onOpenReferenceSettings}
        showReferenceSettings={showReferenceSettings}
      />
    </div>
  );
}

interface CellEditorProps {
  column: TableColumnDto;
  row: TableRowDto;
  value: unknown;
  onCommit: (value: unknown) => void;
}

function normalizeReferenceCellValue(value: unknown): string | string[] | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => {
        if (typeof item === "string") {
          const trimmed = item.trim();
          return trimmed ? trimmed : null;
        }
        if (typeof item === "number" || typeof item === "boolean") {
          const text = String(item).trim();
          return text ? text : null;
        }
        if (item && typeof item === "object") {
          const record = item as Record<string, unknown>;
          const idCandidate = [record.id, record.value, record.rowId]
            .map((candidate) => (typeof candidate === "string" ? candidate.trim() : ""))
            .find((candidate) => candidate.length > 0);
          if (idCandidate) {
            return idCandidate;
          }
        }
        return null;
      })
      .filter((item): item is string => Boolean(item));

    return normalized.length ? normalized : [];
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    const text = String(value).trim();
    return text ? text : null;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (Array.isArray(record.values)) {
      return normalizeReferenceCellValue(record.values);
    }
    if (Array.isArray(record.ids)) {
      return normalizeReferenceCellValue(record.ids);
    }

    const idCandidate = [record.id, record.value, record.rowId]
      .map((candidate) => (typeof candidate === "string" ? candidate.trim() : ""))
      .find((candidate) => candidate.length > 0);

    return idCandidate ?? null;
  }

  return null;
}

function CellEditor({ column, value, onCommit }: CellEditorProps) {
  if (column.type === COLUMN_TYPE_ENUM.REFERENCE) {
    const normalizedValue = normalizeReferenceCellValue(value);
    return (
      <ReferenceCell
        column={column as any}
        value={normalizedValue}
        onChange={(next) => onCommit(next)}
      />
    );
  }

  return <PrimitiveCellEditor column={column} value={value} onCommit={onCommit} />;
}

function PrimitiveCellEditor({ column, value, onCommit }: Omit<CellEditorProps, "row">) {
  const [draft, setDraft] = useState(normalizeValue(column.type, value));

  useEffect(() => {
    setDraft(normalizeValue(column.type, value));
  }, [column.id, column.type, value]);

  if (column.type === "BOOLEAN") {
    return (
      <Checkbox
        checked={Boolean(draft)}
        onCheckedChange={(checked) => {
          setDraft(Boolean(checked));
          onCommit(Boolean(checked));
        }}
      />
    );
  }

  if (column.type === "SELECT") {
    const options = Array.isArray((column.config as any)?.options)
      ? (column.config as any).options
      : [];
    return (
      <select
        className="w-full rounded-lg border border-border/60 bg-card px-2 py-1 text-sm"
        value={draft ?? ""}
        onChange={(event) => {
          setDraft(event.target.value);
          onCommit(event.target.value);
        }}
      >
        <option value="">Select…</option>
        {options.map((option: any) => {
          if (option && typeof option === "object") {
            const optionValue = option.value ?? option.id ?? option.label ?? "";
            const optionLabel = option.label ?? optionValue;
            return (
              <option key={String(optionValue)} value={optionValue}>
                {String(optionLabel)}
              </option>
            );
          }
          return (
            <option key={String(option)} value={String(option)}>
              {String(option)}
            </option>
          );
        })}
      </select>
    );
  }

  if (column.type === "DATE") {
    const formatted = draft ? new Date(String(draft)).toISOString().slice(0, 10) : "";
    return (
      <Input
        type="date"
        value={formatted}
        onChange={(event) => {
          setDraft(event.target.value);
          onCommit(event.target.value);
        }}
        className="h-8"
      />
    );
  }

  if (column.type === "NUMBER") {
    return (
      <Input
        type="number"
        value={draft === "" ? "" : String(draft)}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => onCommit(draft === "" ? null : Number(draft))}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            onCommit(draft === "" ? null : Number(draft));
          }
        }}
        className="h-8"
      />
    );
  }

  return (
    <Input
      value={draft as string}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => onCommit(draft)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          onCommit(draft);
        }
      }}
      className="h-8"
    />
  );
}



