import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { PRISMA_MIGRATIONS_TABLE_SQL } from '../services/prismaBoot.js';

describe('Railway production boot', () => {
  it('starts the compiled server without failing the process on migrate', () => {
    const railway = JSON.parse(fs.readFileSync(path.resolve('railway.json'), 'utf-8')) as {
      deploy: { startCommand: string; healthcheckPath: string; healthcheckTimeout: number };
    };
    expect(railway.deploy.startCommand).toBe('node dist/server.cjs');
    expect(railway.deploy.healthcheckPath).toBe('/api/health');
    expect(railway.deploy.healthcheckTimeout).toBeGreaterThanOrEqual(100);
    const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf-8')) as {
      scripts: { start: string };
    };
    expect(pkg.scripts.start).toBe('node dist/server.cjs');
  });

  it('baselines Prisma history so migrate can run beside existing JSONB tables', () => {
    expect(PRISMA_MIGRATIONS_TABLE_SQL).toContain('CREATE TABLE IF NOT EXISTS "_prisma_migrations"');
    expect(PRISMA_MIGRATIONS_TABLE_SQL).toContain('migration_name');
  });

  it('generates a Prisma engine for Railway Debian OpenSSL 3', () => {
    const schema = fs.readFileSync(path.resolve('prisma/schema.prisma'), 'utf-8');
    expect(schema).toContain('debian-openssl-3.0.x');
  });

  it('copies Prisma schema and generated client into the Docker runner', () => {
    const docker = fs.readFileSync(path.resolve('Dockerfile'), 'utf-8');
    expect(docker).toContain('COPY --from=builder /app/prisma ./prisma');
    expect(docker).toContain('COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma');
    expect(docker).toContain('COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma');
    expect(docker).not.toContain('RUN npx prisma generate');
  });
});
