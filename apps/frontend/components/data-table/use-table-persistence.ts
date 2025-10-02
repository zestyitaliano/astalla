"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  ColumnSizingState,
  VisibilityState
} from "@tanstack/react-table";

export type TableDensity = "comfortable" | "compact";

export type TableLayoutState = {
  columnOrder: string[];
  columnVisibility: VisibilityState;
  columnSizing: ColumnSizingState;
  density: TableDensity;
};

function isBrowser() {
  return typeof window !== "undefined";
}

function parseLayout(value: string | null): Partial<TableLayoutState> | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<TableLayoutState>;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn("Failed to parse stored table layout", error);
    return null;
  }
}

export function useTablePersistence(
  storageKey: string,
  defaults: TableLayoutState,
  enabled: boolean
) {
  const [layout, setLayout] = useState<TableLayoutState>(defaults);

  useEffect(() => {
    if (!enabled || !isBrowser()) {
      setLayout(defaults);
      return;
    }

    const parsed = parseLayout(window.localStorage.getItem(storageKey));

    if (!parsed) {
      setLayout(defaults);
      return;
    }

    setLayout((previous) => ({
      ...defaults,
      ...previous,
      ...parsed,
      columnOrder: parsed.columnOrder?.length ? parsed.columnOrder : defaults.columnOrder
    }));
  }, [defaults, enabled, storageKey]);

  useEffect(() => {
    if (!enabled || !isBrowser()) {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(layout));
  }, [enabled, layout, storageKey]);

  const updateLayout = useCallback(
    (value: Partial<TableLayoutState>) =>
      setLayout((previous) => ({
        ...previous,
        ...value
      })),
    []
  );

  const reset = useCallback(() => {
    setLayout(defaults);
    if (enabled && isBrowser()) {
      window.localStorage.removeItem(storageKey);
    }
  }, [defaults, enabled, storageKey]);

  return useMemo(
    () => ({
      layout,
      updateLayout,
      reset
    }),
    [layout, reset, updateLayout]
  );
}
