/**
 * Shelfy 🇹🇿 — Database Engine & File Persistence
 */

import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { PlatformSettings, Shelf } from '../types/index.js';
import { execSync } from 'child_process';
import { buildCompleteSeedData, DatabaseSchema } from './seedData.js';
import { capturePaymentInLedger } from './services/finance.js';
import { getPrisma } from './prisma.js';
import { importSchemaToPrisma, loadSchemaFromPrisma, persistSchemaToPrisma, relationalUserCount } from './relational.js';

export const SEED_SCHEMA_VERSION = 5;

const DATA_DIR = path.resolve(process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || process.cwd(), process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH ? '' : 'data');
const DB_FILE = path.resolve(DATA_DIR, 'shelfy.json');

const CATEGORY_ALIASES: Record<string, string> = {
  Snacks: 'Snacks & Confectionery',
  Dairy: 'Dairy & Fresh',
  Supplements: 'Supplements & Herbal',
  Gifts: 'Gifts & Crafts',
  'Gourmet Gifts': 'Gifts & Crafts',
  Souvenirs: 'Gifts & Crafts',
  Beverages: 'Beverages & Juices',
  Juices: 'Beverages & Juices',
  'Fresh Drinks': 'Beverages & Juices',
  'Energy Drinks': 'Beverages & Juices',
  'Tea & Coffee': 'Food & Beverages',
  'Breakfast Items': 'Food & Beverages',
  'Packaged Goods': 'Food & Beverages',
  'Dry Goods': 'Food & Beverages',
  Confectionery: 'Snacks & Confectionery',
  Skincare: 'Health & Beauty',
  'Personal Care': 'Health & Beauty',
  Fashion: 'Gifts & Crafts',
  Electronics: 'Electronics & Tech',
  Cleaning: 'Gifts & Crafts',
  'Household Goods': 'Gifts & Crafts',
  'Premium Spices': 'Spices',
};

const DEFAULT_SETTINGS: PlatformSettings = {
  commissionPercentage: 10,
  autoApproveBookings: true,
  pesapalEnvironment: 'sandbox',
  currency: 'TZS',
  maintenanceMode: false,
  shelfCategories: [
    'Food & Beverages',
    'Organic Goods',
    'Cosmetics',
    'Health & Beauty',
    'Spices',
    'Snacks & Confectionery',
    'Dairy & Fresh',
    'Gifts & Crafts',
    'Electronics & Tech',
    'Beverages & Juices',
    'Baked Goods',
    'Supplements & Herbal',
  ],
  minWithdrawalTzs: 20000,
  bookingGraceHours: 24,
  cancellationFeePercent: 10,
  freeCancelDays: 7,
  shelfTypes: [
    { id: 'EYE_LEVEL', name: 'Eye-Level Display', description: 'Optimal line of sight (120–160cm) with maximum shopper gaze capture.', icon: '👁️' },
    { id: 'COUNTER_DISPLAY', name: 'Counter Checkout Box', description: 'High-impulse point-of-sale positioning directly at cashier desk.', icon: '🛒' },
    { id: 'ENTRANCE_DISPLAY', name: 'Entrance Lobby Showcase', description: 'Front-facing glass vitrine seen by 100% of store foot traffic.', icon: '✨' },
    { id: 'REFRIGERATED', name: 'Chilled / Cooler Showcase', description: 'Temperature controlled 2°C–6°C glass case for drinks & dairy.', icon: '❄️' },
    { id: 'TOP_SHELF', name: 'Top Display Rack', description: 'Elevated brand marquee shelf for premium visibility across aisles.', icon: '🔝' },
    { id: 'BOTTOM_SHELF', name: 'Bottom Bulk Shelf', description: 'Deep, heavy-load floor shelf ideal for bulk and family packs.', icon: '📦' },
    { id: 'END_CAP', name: 'Aisle End-Cap Feature', description: 'Prime corner position commanding cross-traffic attention.', icon: '🎯' },
    { id: 'WINDOW_DISPLAY', name: 'Street Window Showcase', description: 'Exterior street-facing glass showcase attracting passersby.', icon: '🪟' },
  ],
};

const EMPTY_COLLECTIONS: Array<keyof DatabaseSchema> = [
  'users',
  'vendorProfiles',
  'hostProfiles',
  'shops',
  'shelves',
  'products',
  'shelfInventory',
  'bookings',
  'bookingStatusHistory',
  'payments',
  'paymentAttempts',
  'payouts',
  'withdrawals',
  'verificationRequests',
  'fieldVisits',
  'shelfReports',
  'notifications',
  'messages',
  'auditLogs',
  'reviews',
  'disputes',
  'authTokens',
  'ledgerAccounts',
  'ledgerEntries',
];

function normalizeCategory(category: string): string {
  return CATEGORY_ALIASES[category] || category;
}

export function normalizeDatabase(data: DatabaseSchema): { data: DatabaseSchema; changed: boolean } {
  let changed = false;
  const next = data;

  for (const key of EMPTY_COLLECTIONS) {
    if (!Array.isArray(next[key])) {
      (next as any)[key] = [];
      changed = true;
    }
  }

  const settings = { ...DEFAULT_SETTINGS, ...(next.settings || {}) };
  if (!Array.isArray(settings.shelfCategories) || settings.shelfCategories.length === 0) {
    settings.shelfCategories = [...DEFAULT_SETTINGS.shelfCategories];
    changed = true;
  }
  if (!Array.isArray(settings.shelfTypes) || settings.shelfTypes.length === 0) {
    settings.shelfTypes = [...DEFAULT_SETTINGS.shelfTypes];
    changed = true;
  }
  next.settings = settings;

  const occupiedShelfIds = new Set(
    next.bookings
      .filter((b) => ['ACTIVE', 'PAID', 'PAYMENT_PENDING', 'PENDING_APPROVAL', 'APPROVED'].includes(b.status))
      .map((b) => b.shelfId)
  );

  next.shelves = next.shelves.map((shelf: Shelf) => {
    const normalizedCats = (shelf.allowedCategories || []).map(normalizeCategory);
    const catsChanged = normalizedCats.some((c, i) => c !== shelf.allowedCategories[i]);
    const shouldBook = occupiedShelfIds.has(shelf.id) && shelf.availabilityStatus !== 'BOOKED';
    const shouldFree = !occupiedShelfIds.has(shelf.id) && shelf.availabilityStatus === 'BOOKED';
    if (catsChanged || shouldBook || shouldFree) {
      changed = true;
      return {
        ...shelf,
        allowedCategories: normalizedCats,
        availabilityStatus: shouldBook ? 'BOOKED' : shouldFree ? 'AVAILABLE' : shelf.availabilityStatus,
      };
    }
    return catsChanged ? { ...shelf, allowedCategories: normalizedCats } : shelf;
  });

  next.shops = next.shops.map((shop) => {
    if (shop.listingStatus) return shop;
    changed = true;
    return {
      ...shop,
      listingStatus: shop.verificationStatus === 'VERIFIED' ? 'PUBLISHED' : 'DRAFT',
    };
  });

  next.shelves = next.shelves.map((shelf) => {
    if (shelf.listingStatus && shelf.verificationStatus) return shelf;
    const shop = next.shops.find((s) => s.id === shelf.shopId);
    const verified = shelf.verificationStatus === 'VERIFIED' || shelf.hostVerificationStatus === 'VERIFIED' || shop?.verificationStatus === 'VERIFIED';
    changed = true;
    return {
      ...shelf,
      verificationStatus: shelf.verificationStatus || (verified ? 'VERIFIED' : 'PENDING'),
      listingStatus: shelf.listingStatus || (verified ? 'PUBLISHED' : 'DRAFT'),
    };
  });

  const demoPassword = 'Password123!';
  const demoEmails = ['admin@shelfy.co.tz', 'vendor@shelfy.co.tz', 'host@shelfy.co.tz', 'agent@shelfy.co.tz'];
  next.users = next.users.map((user) => {
    if (!demoEmails.includes(user.email)) return user;
    try {
      if (user.passwordHash && bcrypt.compareSync(demoPassword, user.passwordHash)) return user;
    } catch {
      // rehash below
    }
    changed = true;
    return {
      ...user,
      passwordHash: bcrypt.hashSync(demoPassword, 10),
      emailVerifiedAt: user.emailVerifiedAt || new Date().toISOString(),
      status: user.status === 'PENDING' ? 'ACTIVE' : user.status,
      updatedAt: new Date().toISOString(),
    };
  });

  if (!next.fieldVisits.some((v) => v.id === 'fv_2')) {
    next.fieldVisits.push({
      id: 'fv_2',
      shopId: 'shop_1',
      shopName: 'Juma Mini Market — Mikocheni',
      shopAddress: 'Old Bagamoyo Road, Mikocheni B',
      shopCity: 'Dar es Salaam',
      shelfId: 'shelf_1',
      shelfName: 'Eye-Level Prime Front Bay A1',
      agentId: 'usr_agent_1',
      agentName: 'Baraka John',
      scheduledAt: '2026-08-18T09:00:00.000Z',
      status: 'SCHEDULED',
      notes: 'Follow-up restock verification after first month of vendor placement.',
      createdAt: new Date().toISOString(),
    });
    changed = true;
  }

  for (const booking of next.bookings.filter((b) => b.paymentStatus === 'PAID')) {
    const payment = next.payments.find((p) => p.bookingId === booking.id);
    if (capturePaymentInLedger(next, booking, payment?.id || `pay_for_${booking.id}`)) {
      changed = true;
    }
  }

  if (next.schemaVersion !== SEED_SCHEMA_VERSION) {
    next.schemaVersion = SEED_SCHEMA_VERSION;
    changed = true;
  }

  return { data: next, changed };
}

class DatabaseEngine {
  private data: DatabaseSchema;
  private driver: 'file' | 'postgres' | 'prisma' = 'file';
  private pool: Pool | null = null;
  private writeChain: Promise<void> = Promise.resolve();
  public readonly ready: Promise<void>;

  constructor() {
    this.data = normalizeDatabase(buildCompleteSeedData()).data;
    this.ready = this.init();
  }

  private async init() {
    if (process.env.DATABASE_URL) {
      const internal = process.env.DATABASE_URL.includes('railway.internal') || process.env.DATABASE_URL.includes('sslmode=disable');
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: internal ? false : { rejectUnauthorized: false },
      });
      await this.ensurePostgres();
      await this.tryMigrate();

      const prisma = getPrisma();
      if (prisma) {
        try {
          const count = await relationalUserCount(prisma);
          if (count === 0) {
            const fromBlob = await this.loadFromPostgres();
            const source = normalizeDatabase(fromBlob || buildCompleteSeedData()).data;
            await importSchemaToPrisma(prisma, source);
          }
          this.data = normalizeDatabase(await loadSchemaFromPrisma(prisma)).data;
          this.driver = 'prisma';
          console.log('🗄️  Shelfy database driver: prisma');
          return;
        } catch (err) {
          console.error('Prisma bootstrap failed, falling back to JSONB document store:', err);
        }
      }

      this.driver = 'postgres';
      const loaded = await this.loadFromPostgres();
      if (loaded) {
        const { data, changed } = normalizeDatabase(loaded);
        this.data = data;
        if (changed) await this.persist(data);
      } else {
        const seeded = normalizeDatabase(buildCompleteSeedData()).data;
        this.data = seeded;
        await this.persist(seeded);
      }
      console.log('🗄️  Shelfy database driver: postgres');
      return;
    }

    this.driver = 'file';
    this.data = this.loadFromFile();
    console.log('🗄️  Shelfy database driver: file');
  }

  private tryMigrate() {
    try {
      execSync('npx prisma migrate deploy', {
        stdio: 'inherit',
        env: process.env,
      });
    } catch (err) {
      console.warn('prisma migrate deploy did not complete. Relational tables may be created on the next release.', err);
    }
  }

  private ensureDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadFromFile(): DatabaseSchema {
    this.ensureDir();
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.users && parsed.shops && parsed.shelves && parsed.shelves.length >= 15) {
          const { data, changed } = normalizeDatabase(parsed as DatabaseSchema);
          if (changed) this.saveFile(data);
          return data;
        }
      } catch (err) {
        console.error('Failed to parse database file, reinitializing seed data:', err);
      }
    }

    const seeded = normalizeDatabase(buildCompleteSeedData()).data;
    this.saveFile(seeded);
    return seeded;
  }

  private async ensurePostgres() {
    if (!this.pool) return;
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS shelfy_store (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  private async loadFromPostgres(): Promise<DatabaseSchema | null> {
    if (!this.pool) return null;
    const result = await this.pool.query('SELECT data FROM shelfy_store WHERE id = $1', ['main']);
    if (!result.rows[0]?.data) return null;
    return result.rows[0].data as DatabaseSchema;
  }

  private saveFile(dataToSave?: DatabaseSchema) {
    try {
      this.ensureDir();
      const target = dataToSave || this.data;
      fs.writeFileSync(DB_FILE, JSON.stringify(target, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist Shelfy database file. Runtime changes may be lost on restart:', err);
    }
  }

  private async persist(dataToSave?: DatabaseSchema) {
    const target = dataToSave || this.data;
    if (this.driver === 'prisma') {
      const prisma = getPrisma();
      if (prisma) {
        await persistSchemaToPrisma(prisma, target);
        return;
      }
    }
    if ((this.driver === 'postgres' || this.driver === 'prisma') && this.pool) {
      await this.pool.query(
        `INSERT INTO shelfy_store (id, data, updated_at)
         VALUES ('main', $1::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [JSON.stringify(target)]
      );
      if (this.driver === 'prisma') return;
      return;
    }
    this.saveFile(target);
  }

  public save() {
    void this.saveAsync();
  }

  public saveAsync(): Promise<void> {
    this.writeChain = this.writeChain
      .then(() => this.persist())
      .catch((err) => {
        console.error('Failed to persist Shelfy database:', err);
      });
    return this.writeChain;
  }

  public async withLock<T>(fn: () => T | Promise<T>): Promise<T> {
    let result!: T;
    this.writeChain = this.writeChain.then(async () => {
      result = await fn();
      await this.persist();
    });
    await this.writeChain;
    return result;
  }

  public get db(): DatabaseSchema {
    return this.data;
  }

  public stats() {
    return {
      driver: this.driver,
      schemaVersion: this.data.schemaVersion || 0,
      users: this.data.users.length,
      shops: this.data.shops.length,
      shelves: this.data.shelves.length,
      bookedShelves: this.data.shelves.filter((s) => s.availabilityStatus === 'BOOKED').length,
      bookings: this.data.bookings.length,
      products: this.data.products.length,
      inventory: this.data.shelfInventory.length,
      payouts: this.data.payouts.length,
      fieldVisits: this.data.fieldVisits.length,
      settingsCategories: this.data.settings.shelfCategories?.length || 0,
      dataFile: this.driver === 'file' ? DB_FILE : this.driver === 'prisma' ? 'postgres:prisma' : 'postgres:shelfy_store',
      ledgerEntries: this.data.ledgerEntries?.length || 0,
    };
  }
}

export const dbEngine = new DatabaseEngine();
