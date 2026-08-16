import { execSync } from 'child_process';

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

export function runPrismaMigrateDeploy(env: NodeJS.ProcessEnv = process.env): void {
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env,
    timeout: 90_000,
  });
}
