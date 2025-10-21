import { useQuery } from "@tanstack/react-query";

import { apiBaseUrl } from "@/lib/utils";
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
    queryFn: () => getTableChoices(apiBaseUrl),
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
      return getColumnChoices(apiBaseUrl, tableId);
    },
    enabled: enabled && Boolean(tableId)
  });
}
