import { Prisma } from "@prisma/client";

export const JSON_NULL = Prisma.JsonNull as unknown as Prisma.InputJsonValue;
export const DB_NULL = Prisma.DbNull;
