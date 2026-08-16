import { createRequire } from 'module';
import type { PrismaClient } from '@prisma/client';

const require = createRequire(import.meta.url);
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getPrisma(): PrismaClient | null {
  if (!process.env.DATABASE_URL) return null;
  try {
    if (!globalForPrisma.prisma) {
      const { PrismaClient: PrismaClientCtor } = require('@prisma/client') as {
        PrismaClient: new () => PrismaClient;
      };
      globalForPrisma.prisma = new PrismaClientCtor();
    }
    return globalForPrisma.prisma;
  } catch (err) {
    console.error('Prisma client failed to initialize:', err instanceof Error ? err.message : err);
    return null;
  }
}
