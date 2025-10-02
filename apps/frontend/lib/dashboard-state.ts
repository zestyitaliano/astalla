"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { MeResponse } from "@shared/api";

const STORAGE_KEY = "astalla:dashboard-state:v1";

type QuickStat = {
  id: string;
  label: string;
  value: string;
  helper?: string;
};

type TableRow = string[];

type Table = {
  id: string;
  name: string;
  description?: string;
  columns: string[];
  rows: TableRow[];
  createdAt: string;
  updatedAt: string;
};

type WelcomeCopy = {
  headline: string;
  message: string;
  note: string;
};

type DashboardState = {
  user: MeResponse;
  welcome: WelcomeCopy;
  quickStats: QuickStat[];
  tables: Table[];
};

function createDefaultState(): DashboardState {
  return {
    user: {
      id: "dashboard-user",
      name: "",
      email: "",
      orgId: "internal"
    },
    welcome: {
      headline: "",
      message: "",
      note: ""
    },
    quickStats: [],
    tables: []
  };
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `id_${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeUser(value: unknown, fallback: MeResponse): MeResponse {
  if (!value || typeof value !== "object") {
    return fallback;
  }

  const source = value as Partial<MeResponse>;
  return {
    id: typeof source.id === "string" && source.id.trim() ? source.id : fallback.id,
    name: typeof source.name === "string" ? source.name : fallback.name,
    email: typeof source.email === "string" ? source.email : fallback.email,
    orgId: typeof source.orgId === "string" && source.orgId.trim() ? source.orgId : fallback.orgId
  };
}

function sanitizeWelcome(value: unknown, fallback: WelcomeCopy): WelcomeCopy {
  if (!value || typeof value !== "object") {
    return fallback;
  }

  const source = value as Partial<WelcomeCopy>;
  return {
    headline: typeof source.headline === "string" ? source.headline : fallback.headline,
    message: typeof source.message === "string" ? source.message : fallback.message,
    note: typeof source.note === "string" ? source.note : fallback.note
  };
}

function sanitizeQuickStats(value: unknown): QuickStat[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const source = entry as Partial<QuickStat>;
      const label = typeof source.label === "string" ? source.label : "";
      const statValue = typeof source.value === "string" ? source.value : "";

      if (!label && !statValue) {
        return null;
      }

      return {
        id: typeof source.id === "string" ? source.id : createId(),
        label,
        value: statValue,
        helper: typeof source.helper === "string" ? source.helper : undefined
      } satisfies QuickStat;
    })
    .filter((entry): entry is QuickStat => Boolean(entry));
}

function sanitizeTableRows(columns: string[], rows: unknown): TableRow[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map((row) => {
      if (!Array.isArray(row)) {
        return null;
      }

      return columns.map((_, index) => {
        const value = row[index];
        return typeof value === "string" ? value : "";
      });
    })
    .filter((row): row is TableRow => Array.isArray(row));
}

function sanitizeTables(value: unknown): Table[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const source = entry as Partial<Table>;
      const name = typeof source.name === "string" ? source.name : "";
      const columns = Array.isArray(source.columns)
        ? source.columns.filter((column): column is string => typeof column === "string")
        : [];

      if (!name) {
        return null;
      }

      const created = typeof source.createdAt === "string" ? source.createdAt : new Date().toISOString();
      const updated = typeof source.updatedAt === "string" ? source.updatedAt : created;

      return {
        id: typeof source.id === "string" ? source.id : createId(),
        name,
        description: typeof source.description === "string" ? source.description : undefined,
        columns,
        rows: sanitizeTableRows(columns, source.rows),
        createdAt: created,
        updatedAt: updated
      } satisfies Table;
    })
    .filter((entry): entry is Table => Boolean(entry));
}

function hydrateStoredState(value: unknown): DashboardState {
  const fallback = createDefaultState();

  if (!value || typeof value !== "object") {
    return fallback;
  }

  const source = value as Partial<DashboardState>;

  return {
    user: sanitizeUser(source.user, fallback.user),
    welcome: sanitizeWelcome(source.welcome, fallback.welcome),
    quickStats: sanitizeQuickStats(source.quickStats),
    tables: sanitizeTables(source.tables)
  } satisfies DashboardState;
}

export function useDashboardState() {
  const [state, setState] = useState<DashboardState>(() => {
    if (typeof window === "undefined") {
      return createDefaultState();
    }

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);

      if (!stored) {
        return createDefaultState();
      }

      return hydrateStoredState(JSON.parse(stored));
    } catch (error) {
      console.warn("Failed to read dashboard state from storage", error);
      return createDefaultState();
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("Failed to persist dashboard state", error);
    }
  }, [state]);

  const updateUser = useCallback((patch: Partial<MeResponse>) => {
    setState((previous) => ({
      ...previous,
      user: { ...previous.user, ...patch }
    }));
  }, []);

  const updateWelcome = useCallback((patch: Partial<WelcomeCopy>) => {
    setState((previous) => ({
      ...previous,
      welcome: { ...previous.welcome, ...patch }
    }));
  }, []);

  const addQuickStat = useCallback((stat: Omit<QuickStat, "id">) => {
    setState((previous) => ({
      ...previous,
      quickStats: [
        ...previous.quickStats,
        {
          id: createId(),
          label: stat.label,
          value: stat.value,
          helper: stat.helper?.trim() ? stat.helper : undefined
        }
      ]
    }));
  }, []);

  const removeQuickStat = useCallback((id: string) => {
    setState((previous) => ({
      ...previous,
      quickStats: previous.quickStats.filter((stat) => stat.id !== id)
    }));
  }, []);

  const createTable = useCallback((payload: { name: string; description?: string; columns: string[] }) => {
    setState((previous) => ({
      ...previous,
      tables: [
        ...previous.tables,
        {
          id: createId(),
          name: payload.name,
          description: payload.description?.trim() ? payload.description : undefined,
          columns: payload.columns,
          rows: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    }));
  }, []);

  const deleteTable = useCallback((tableId: string) => {
    setState((previous) => ({
      ...previous,
      tables: previous.tables.filter((table) => table.id !== tableId)
    }));
  }, []);

  const addTableRow = useCallback((tableId: string, values: string[]) => {
    setState((previous) => ({
      ...previous,
      tables: previous.tables.map((table) => {
        if (table.id !== tableId) {
          return table;
        }

        const timestamp = new Date().toISOString();

        return {
          ...table,
          rows: [...table.rows, table.columns.map((_, index) => values[index] ?? "")],
          updatedAt: timestamp
        };
      })
    }));
  }, []);

  const removeTableRow = useCallback((tableId: string, rowIndex: number) => {
    setState((previous) => ({
      ...previous,
      tables: previous.tables.map((table) => {
        if (table.id !== tableId) {
          return table;
        }

        const timestamp = new Date().toISOString();

        return {
          ...table,
          rows: table.rows.filter((_, index) => index !== rowIndex),
          updatedAt: timestamp
        };
      })
    }));
  }, []);

  const clearAll = useCallback(() => {
    setState(createDefaultState());

    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.warn("Failed to clear dashboard state", error);
      }
    }
  }, []);

  return useMemo(
    () => ({
      state,
      updateUser,
      updateWelcome,
      addQuickStat,
      removeQuickStat,
      createTable,
      deleteTable,
      addTableRow,
      removeTableRow,
      clearAll
    }),
    [
      state,
      updateUser,
      updateWelcome,
      addQuickStat,
      removeQuickStat,
      createTable,
      deleteTable,
      addTableRow,
      removeTableRow,
      clearAll
    ]
  );
}
