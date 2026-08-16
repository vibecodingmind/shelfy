import type { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export async function getPrisma(): Promise<PrismaClient | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    if (!globalForPrisma.prisma) {
      const { PrismaClient } = await import('@prisma/client');
      globalForPrisma.prisma = new PrismaClient();
    }
    return globalForPrisma.prisma;
  } catch (err) {
    console.error('Prisma client failed to initialize:', err instanceof Error ? err.message : err);
    return null;
  }
}
