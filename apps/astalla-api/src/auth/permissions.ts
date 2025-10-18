import type { SchemaColumn, SchemaTable } from "@shared/api";

export type PermissionTarget =
  | { kind: "table"; table: SchemaTable }
  | { kind: "column"; table: SchemaTable; column: SchemaColumn };

const defaultCanRead = (userId: string, target: PermissionTarget): boolean => {
  if (target.kind === "column" && target.column.isPII && userId !== "admin") {
    return false;
  }

  return true;
};

type CanReadOverride = ((userId: string, target: PermissionTarget) => boolean) | null;

let canReadOverride: CanReadOverride = null;

export const __setCanReadOverrideForTests = (override: CanReadOverride) => {
  canReadOverride = override;
};

export const __resetCanReadOverrideForTests = () => {
  canReadOverride = null;
};

export const __defaultCanRead = defaultCanRead;

export const canRead = (userId: string, target: PermissionTarget): boolean => {
  const impl = canReadOverride ?? defaultCanRead;
  return impl(userId, target);
};

export const canWrite = (userId: string, target: PermissionTarget): boolean => {
  if (target.kind === "column" && target.column.isPII && userId !== "admin") {
    return false;
  }

  return true;
};
