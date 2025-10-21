import { useQuery } from "@tanstack/react-query";

import {
  getColumnChoices,
  getTableChoices,
  type ColumnChoicesResult,
  type ReferenceColumnChoice,
  type ReferenceTableChoice,
  type TableChoicesResult
} from "@/lib/referenceChoices";

export type {
  ReferenceTableChoice,
  ReferenceColumnChoice,
  TableChoicesResult,
  ColumnChoicesResult
};

export function useReferenceTableChoices(enabled: boolean) {
  return useQuery<TableChoicesResult>({
    queryKey: ["reference", "table-choices"],
    queryFn: () => getTableChoices(),
    enabled
  });
}

export function useReferenceColumnChoices(tableId: string | null, enabled: boolean) {
  return useQuery<ColumnChoicesResult>({
    queryKey: ["reference", "column-choices", tableId ?? "__none__"],
    queryFn: () => {
      if (!tableId) {
        throw new Error("Missing table id");
      }
      return getColumnChoices(tableId);
    },
    enabled: enabled && Boolean(tableId)
  });
}
