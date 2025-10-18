import type { SchemaColumn, SchemaTable } from "@shared/api";

export type PermissionTarget =
  | { kind: "table"; table: SchemaTable }
  | { kind: "column"; table: SchemaTable; column: SchemaColumn };

export const canRead = (userId: string, target: PermissionTarget): boolean => {
  if (target.kind === "column" && target.column.isPII && userId !== "admin") {
    return false;
  }

  return true;
};

export const canWrite = (userId: string, target: PermissionTarget): boolean => {
  if (target.kind === "column" && target.column.isPII && userId !== "admin") {
    return false;
  }

  return true;
};
