import { z } from "zod";

export const ColumnSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    referenceConfig: z.record(z.unknown()).nullable().optional()
  })
  .passthrough();

export const TableDetailSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    columns: z.array(ColumnSchema)
  })
  .passthrough();
