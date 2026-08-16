/**
 * Shelfy 🇹🇿 — Database Engine & File Persistence
 */

import fs from 'fs';
import path from 'path';
import {
  User,
  VendorProfile,
  HostProfile,
  Shop,
  Shelf,
  Product,
  ShelfInventory,
  Booking,
  Payment,
  Payout,
  FieldVisit,
  ShelfReport,
  Notification,
  Message,
  AuditLog,
  Review,
  Dispute,
  PlatformSettings,
} from '../types/index.js';
import { buildCompleteSeedData, DatabaseSchema } from './seedData.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'shelfy.json');

class DatabaseEngine {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadOrInitialize();
  }

  private ensureDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadOrInitialize(): DatabaseSchema {
    this.ensureDir();
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.users && parsed.shops && parsed.shelves && parsed.shelves.length >= 30) {
          const data = parsed as DatabaseSchema;
          if (Array.isArray(data.fieldVisits) && !data.fieldVisits.some((v) => v.id === 'fv_2')) {
            data.fieldVisits.push({
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
            this.saveData(data);
          }
          return data;
        }
      } catch (err) {
        console.error('Failed to parse database file, reinitializing seed data:', err);
      }
    }

    const seeded = buildCompleteSeedData();
    this.saveData(seeded);
    return seeded;
  }

  private saveData(dataToSave?: DatabaseSchema) {
    this.ensureDir();
    const target = dataToSave || this.data;
    fs.writeFileSync(DB_FILE, JSON.stringify(target, null, 2), 'utf-8');
  }

  public save() {
    this.saveData();
  }

  public get db(): DatabaseSchema {
    return this.data;
  }
}

export const dbEngine = new DatabaseEngine();
