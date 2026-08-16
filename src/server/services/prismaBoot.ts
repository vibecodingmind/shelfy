import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Prisma refuses `migrate deploy` (P3005) when the database already has tables
 * but no `_prisma_migrations` history. Production already has `shelfy_store`.
 * Creating the history table first lets the init migration apply beside JSONB.
 */
export const PRISMA_MIGRATIONS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  "id" VARCHAR(36) PRIMARY KEY NOT NULL,
  "checksum" VARCHAR(64) NOT NULL,
  "finished_at" TIMESTAMPTZ,
  "migration_name" VARCHAR(255) NOT NULL,
  "logs" TEXT,
  "rolled_back_at" TIMESTAMPTZ,
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "applied_steps_count" INTEGER NOT NULL DEFAULT 0
)
`.trim();

export async function ensurePrismaMigrationHistory(
  query: (sql: string) => Promise<unknown>
): Promise<void> {
  await query(PRISMA_MIGRATIONS_TABLE_SQL);
}

function prismaCliPath(): string {
  const local = path.resolve(process.cwd(), 'node_modules/.bin/prisma');
  if (fs.existsSync(local)) return local;
  return 'npx';
}

/**
 * Run migrate without execSync so the HTTP event loop (Railway /api/health) stays free.
 */
export function runPrismaMigrateDeploy(
  env: NodeJS.ProcessEnv = process.env,
  timeoutMs = 90_000
): Promise<void> {
  const bin = prismaCliPath();
  const args = bin === 'npx' ? ['prisma', 'migrate', 'deploy'] : ['migrate', 'deploy'];
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      env,
      stdio: ['ignore', 'inherit', 'inherit'],
    });
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`prisma migrate deploy timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    child.once('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.once('exit', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`prisma migrate deploy exited ${code}`));
    });
  });
}
