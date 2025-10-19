import { createRequire } from 'node:module';

type PrismaClientLike = {
  user: {
    findFirst: (...args: any[]) => Promise<any>;
  };
  $disconnect: () => Promise<void>;
};

type PrismaClientConstructor = new () => PrismaClientLike;

const require = createRequire(import.meta.url);

let PrismaClientCtor: PrismaClientConstructor;

try {
  const moduleExports = require('@prisma/client') as { PrismaClient?: PrismaClientConstructor };
  if (moduleExports?.PrismaClient) {
    PrismaClientCtor = moduleExports.PrismaClient;
  } else {
    throw new Error('PrismaClient export missing');
  }
} catch (error) {
  if (process.env.NODE_ENV !== 'test') {
    console.warn('[prisma] Falling back to stub PrismaClient implementation', error);
  }
  class PrismaClientStub implements PrismaClientLike {
    user = {
      findFirst: async () => undefined,
    };

    async $disconnect(): Promise<void> {}
  }

  PrismaClientCtor = PrismaClientStub;
}

export const prisma = new PrismaClientCtor();
