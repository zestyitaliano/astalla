declare module "@prisma/client" {
  class PrismaClient {
    constructor(options?: any);
    dataTable: {
      findMany(args: any): Promise<any>;
      findFirst(args: any): Promise<any>;
    };
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
  }

  const Prisma: Record<string, unknown>;

  export { PrismaClient, Prisma };
}
