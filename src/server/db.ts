/**
 * Shelfy 🇹🇿 — Database Engine & File Persistence
 */

import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
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

interface DatabaseSchema {
  users: User[];
  vendorProfiles: VendorProfile[];
  hostProfiles: HostProfile[];
  shops: Shop[];
  shelves: Shelf[];
  products: Product[];
  shelfInventory: ShelfInventory[];
  bookings: Booking[];
  payments: Payment[];
  payouts: Payout[];
  fieldVisits: FieldVisit[];
  shelfReports: ShelfReport[];
  notifications: Notification[];
  messages: Message[];
  auditLogs: AuditLog[];
  reviews: Review[];
  disputes: Dispute[];
  settings: PlatformSettings;
}

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
        if (parsed.users && parsed.shops && parsed.shelves) {
          return parsed as DatabaseSchema;
        }
      } catch (err) {
        console.error('Failed to parse database file, reinitializing seed data:', err);
      }
    }

    const seeded = this.generateSeedData();
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

  private generateSeedData(): DatabaseSchema {
    const passwordHash = bcrypt.hashSync('Password123!', 10);
    const now = new Date().toISOString();

    // 1. Users
    const users: User[] = [
      {
        id: 'usr_admin',
        name: 'Shelfy Admin',
        email: 'admin@shelfy.co.tz',
        phone: '+255 700 000 001',
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'usr_vendor_1',
        name: 'Amina Salum (Kilimanjaro Organics)',
        email: 'vendor@shelfy.co.tz',
        phone: '+255 754 123 456',
        passwordHash,
        role: 'VENDOR',
        status: 'ACTIVE',
        avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'usr_host_1',
        name: 'Juma Mkwawa',
        email: 'host@shelfy.co.tz',
        phone: '+255 713 987 654',
        passwordHash,
        role: 'HOST',
        status: 'ACTIVE',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'usr_agent_1',
        name: 'Baraka John',
        email: 'agent@shelfy.co.tz',
        phone: '+255 782 555 111',
        passwordHash,
        role: 'FIELD_AGENT',
        status: 'ACTIVE',
        avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'usr_vendor_2',
        name: 'Neema Joseph (Serengeti Teas & Spices)',
        email: 'neema@serengetitea.co.tz',
        phone: '+255 768 222 333',
        passwordHash,
        role: 'VENDOR',
        status: 'ACTIVE',
        avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'usr_host_2',
        name: 'Hassan Rashid',
        email: 'hassan@kariakoomart.co.tz',
        phone: '+255 745 444 888',
        passwordHash,
        role: 'HOST',
        status: 'ACTIVE',
        avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150',
        createdAt: now,
        updatedAt: now,
      },
    ];

    // 2. Profiles
    const vendorProfiles: VendorProfile[] = [
      {
        id: 'vp_1',
        userId: 'usr_vendor_1',
        businessName: 'Kilimanjaro Organics Ltd',
        businessRegistration: 'TIN-109-882-311',
        description: 'Premium organic juices, natural honey, and local dried fruit snacks produced in Arusha.',
        category: 'Food & Beverages',
        address: 'Njiro Road, Plot 42',
        city: 'Arusha',
        region: 'Arusha',
        country: 'Tanzania',
        verificationStatus: 'VERIFIED',
      },
      {
        id: 'vp_2',
        userId: 'usr_vendor_2',
        businessName: 'Serengeti Teas & Spices',
        businessRegistration: 'TIN-401-229-871',
        description: 'Authentic Tanzanian spices, herbal infusion teas, and clove blends from Zanzibar.',
        category: 'Food & Beverages',
        address: 'Msimbazi Street 12',
        city: 'Dar es Salaam',
        region: 'Dar es Salaam',
        country: 'Tanzania',
        verificationStatus: 'VERIFIED',
      },
    ];

    const hostProfiles: HostProfile[] = [
      {
        id: 'hp_1',
        userId: 'usr_host_1',
        businessName: 'Juma Mini Markets & Retail',
        businessRegistration: 'BRELA-882910',
        description: 'Chain of prime neighborhood retail supermarkets across Dar es Salaam & Mwanza with high daily foot traffic.',
        phone: '+255 713 987 654',
        verificationStatus: 'VERIFIED',
      },
      {
        id: 'hp_2',
        userId: 'usr_host_2',
        businessName: 'Kariakoo Express Supermart',
        businessRegistration: 'BRELA-331092',
        description: 'High volume wholesale and retail shopping center in Kariakoo commercial hub.',
        phone: '+255 745 444 888',
        verificationStatus: 'VERIFIED',
      },
    ];

    // 3. Shops
    const shops: Shop[] = [
      {
        id: 'shop_1',
        hostId: 'usr_host_1',
        hostName: 'Juma Mkwawa',
        name: 'Juma Mini Market — Mikocheni',
        description: 'Modern neighborhood supermarket located near residential estates with 1,200+ daily visitors.',
        address: 'Old Bagamoyo Road, Mikocheni B',
        city: 'Dar es Salaam',
        region: 'Dar es Salaam',
        latitude: -6.7644,
        longitude: 39.2483,
        photos: [
          'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800',
          'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800',
        ],
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
        footTrafficScore: 9,
        shopType: 'SUPERMARKET',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'shop_2',
        hostId: 'usr_host_1',
        hostName: 'Juma Mkwawa',
        name: 'Mwanza Lake Super Mart',
        description: 'Prime retail center in central Mwanza overlooking Lake Victoria, serving families and office workers.',
        address: 'Station Road, Near Clock Tower',
        city: 'Mwanza',
        region: 'Mwanza',
        latitude: -2.5164,
        longitude: 32.9000,
        photos: [
          'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800',
        ],
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
        footTrafficScore: 8,
        shopType: 'SUPERMARKET',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'shop_3',
        hostId: 'usr_host_2',
        hostName: 'Hassan Rashid',
        name: 'Kariakoo Mega Commercial Store',
        description: 'Massive foot traffic location in the heart of Kariakoo market district.',
        address: 'Swahili Street, Kariakoo',
        city: 'Dar es Salaam',
        region: 'Dar es Salaam',
        latitude: -6.8183,
        longitude: 39.2747,
        photos: [
          'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=800',
        ],
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
        footTrafficScore: 10,
        shopType: 'CONVENIENCE',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'shop_4',
        hostId: 'usr_host_1',
        hostName: 'Juma Mkwawa',
        name: 'Arusha Clock Tower Retail',
        description: 'Tourist and local retail center near Safari hotels in central Arusha.',
        address: 'Sokoine Road, Arusha',
        city: 'Arusha',
        region: 'Arusha',
        latitude: -3.3869,
        longitude: 36.6830,
        photos: [
          'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800',
        ],
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
        footTrafficScore: 8,
        shopType: 'BOUTIQUE',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'shop_5',
        hostId: 'usr_host_2',
        hostName: 'Hassan Rashid',
        name: 'Stone Town Spice & Souvenir Mart',
        description: 'High foot-traffic tourist & local boutique shop in Zanzibar Stone Town.',
        address: 'Gizenga Street, Stone Town',
        city: 'Zanzibar',
        region: 'Zanzibar Urban/West',
        latitude: -6.1622,
        longitude: 39.1921,
        photos: [
          'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=800',
        ],
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
        footTrafficScore: 9,
        shopType: 'SPECIALTY',
        createdAt: now,
        updatedAt: now,
      },
    ];

    // 4. Shelves
    const shelves: Shelf[] = [
      {
        id: 'shelf_1',
        shopId: 'shop_1',
        shopName: 'Juma Mini Market — Mikocheni',
        shopCity: 'Dar es Salaam',
        shopAddress: 'Old Bagamoyo Road, Mikocheni B',
        shopLatitude: -6.7644,
        shopLongitude: 39.2483,
        hostVerificationStatus: 'VERIFIED',
        name: 'Eye-Level Premium Shelf A1',
        description: 'Direct line-of-sight display shelf right next to the entrance and beverage cooler with high customer dwell time.',
        widthCm: 120,
        heightCm: 45,
        depthCm: 40,
        shelfType: 'EYE_LEVEL',
        locationInsideShop: 'Aisle 1 - Main Entrance Section',
        monthlyPriceTzs: 75000,
        availabilityStatus: 'AVAILABLE',
        allowedCategories: ['Food & Beverages', 'Health & Beauty', 'Snacks'],
        photos: [
          'https://images.unsplash.com/photo-1583258292688-d02132382025?w=1000',
          'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=1000',
          'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1000',
          'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=1000',
          'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1000',
        ],
        status: 'ACTIVE',
        avgRating: 4.94,
        reviewCount: 28,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'shelf_2',
        shopId: 'shop_1',
        shopName: 'Juma Mini Market — Mikocheni',
        shopCity: 'Dar es Salaam',
        shopAddress: 'Old Bagamoyo Road, Mikocheni B',
        shopLatitude: -6.7644,
        shopLongitude: 39.2483,
        hostVerificationStatus: 'VERIFIED',
        name: 'Counter Checkout Display Box B2',
        description: 'High impulse purchase checkout counter space, ideal for small packaged items, cosmetics & premium snacks.',
        widthCm: 60,
        heightCm: 30,
        depthCm: 30,
        shelfType: 'COUNTER_DISPLAY',
        locationInsideShop: 'Cashier Checkout Bay 1',
        monthlyPriceTzs: 95000,
        availabilityStatus: 'AVAILABLE',
        allowedCategories: ['Food & Beverages', 'Confectionery', 'Snacks', 'Cosmetics'],
        photos: [
          'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=1000',
          'https://images.unsplash.com/photo-1583258292688-d02132382025?w=1000',
          'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=1000',
          'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1000',
          'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=1000',
        ],
        status: 'ACTIVE',
        avgRating: 5.0,
        reviewCount: 19,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'shelf_3',
        shopId: 'shop_2',
        shopName: 'Mwanza Lake Super Mart',
        shopCity: 'Mwanza',
        shopAddress: 'Station Road, Near Clock Tower',
        shopLatitude: -2.5164,
        shopLongitude: 32.9000,
        hostVerificationStatus: 'VERIFIED',
        name: 'Top Display Rack C1',
        description: 'Spacious upper shelf unit with overhead LED illumination in high-density Mwanza lakeside store.',
        widthCm: 150,
        heightCm: 50,
        depthCm: 45,
        shelfType: 'TOP_SHELF',
        locationInsideShop: 'Aisle 3 - Packaged Foods Section',
        monthlyPriceTzs: 60000,
        availabilityStatus: 'AVAILABLE',
        allowedCategories: ['Food & Beverages', 'Household Goods', 'Dry Foods'],
        photos: [
          'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1000',
          'https://images.unsplash.com/photo-1583258292688-d02132382025?w=1000',
          'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=1000',
          'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=1000',
          'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1000',
        ],
        status: 'ACTIVE',
        avgRating: 4.82,
        reviewCount: 14,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'shelf_4',
        shopId: 'shop_3',
        shopName: 'Kariakoo Mega Commercial Store',
        shopCity: 'Dar es Salaam',
        shopAddress: 'Swahili Street, Kariakoo',
        shopLatitude: -6.8183,
        shopLongitude: 39.2747,
        hostVerificationStatus: 'VERIFIED',
        name: 'Entrance Stand Glass Case D1',
        description: 'Maximum exposure glass case directly facing swarming Kariakoo market pedestrian traffic.',
        widthCm: 100,
        heightCm: 120,
        depthCm: 50,
        shelfType: 'ENTRANCE_DISPLAY',
        locationInsideShop: 'Front Glass Lobby',
        monthlyPriceTzs: 120000,
        availabilityStatus: 'AVAILABLE',
        allowedCategories: ['Cosmetics', 'Health & Beauty', 'Fashion', 'Electronics'],
        photos: [
          'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=1000',
          'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=1000',
          'https://images.unsplash.com/photo-1583258292688-d02132382025?w=1000',
          'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1000',
          'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=1000',
        ],
        status: 'ACTIVE',
        avgRating: 4.96,
        reviewCount: 42,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'shelf_5',
        shopId: 'shop_4',
        shopName: 'Arusha Clock Tower Retail',
        shopCity: 'Arusha',
        shopAddress: 'Sokoine Road, Arusha',
        shopLatitude: -3.3869,
        shopLongitude: 36.6830,
        hostVerificationStatus: 'VERIFIED',
        name: 'Eye-Level Organic & Specialty Bay E1',
        description: 'Dedicated organic & specialty section attracting safari tourists and local expatriates in Arusha.',
        widthCm: 100,
        heightCm: 40,
        depthCm: 40,
        shelfType: 'EYE_LEVEL',
        locationInsideShop: 'Aisle 1 - Premium Row',
        monthlyPriceTzs: 80000,
        availabilityStatus: 'AVAILABLE',
        allowedCategories: ['Food & Beverages', 'Spices', 'Organic Goods'],
        photos: [
          'https://images.unsplash.com/photo-1583258292688-d02132382025?w=1000',
          'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=1000',
          'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1000',
          'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=1000',
          'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=1000',
        ],
        status: 'ACTIVE',
        avgRating: 4.88,
        reviewCount: 16,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'shelf_6',
        shopId: 'shop_5',
        shopName: 'Stone Town Spice & Souvenir Mart',
        shopCity: 'Zanzibar',
        shopAddress: 'Gizenga Street, Stone Town',
        shopLatitude: -6.1622,
        shopLongitude: 39.1921,
        hostVerificationStatus: 'VERIFIED',
        name: 'Chilled Beverage Case F1',
        description: 'Temperature controlled refrigerated shelf unit perfect for cold brew teas, bottled juices & probiotic drinks.',
        widthCm: 90,
        heightCm: 40,
        depthCm: 50,
        shelfType: 'REFRIGERATED',
        locationInsideShop: 'Cooler Wall Bay 2',
        monthlyPriceTzs: 110000,
        availabilityStatus: 'AVAILABLE',
        allowedCategories: ['Food & Beverages', 'Dairy', 'Juices'],
        photos: [
          'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=1000',
          'https://images.unsplash.com/photo-1583258292688-d02132382025?w=1000',
          'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=1000',
          'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1000',
          'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=1000',
        ],
        status: 'ACTIVE',
        avgRating: 5.0,
        reviewCount: 23,
        createdAt: now,
        updatedAt: now,
      },
    ];

    // 5. Products
    const products: Product[] = [
      {
        id: 'prod_1',
        vendorId: 'usr_vendor_1',
        vendorName: 'Kilimanjaro Organics Ltd',
        name: 'Kilimanjaro Pure Mango Juice (500ml)',
        description: '100% natural organic mango nectar harvested from Mount Kilimanjaro foothills.',
        category: 'Food & Beverages',
        sku: 'KIL-JUICE-MNG-500',
        priceTzs: 3500,
        images: ['https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800'],
        status: 'ACTIVE',
        stockQuantity: 240,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod_2',
        vendorId: 'usr_vendor_1',
        vendorName: 'Kilimanjaro Organics Ltd',
        name: 'Raw Acacia Wild Honey (350g)',
        description: 'Pure, unprocessed wild acacia forest honey bottled in glass jars.',
        category: 'Food & Beverages',
        sku: 'KIL-HNY-ACA-350',
        priceTzs: 12000,
        images: ['https://images.unsplash.com/photo-1587049352847-4a222e784d38?w=800'],
        status: 'ACTIVE',
        stockQuantity: 85,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod_3',
        vendorId: 'usr_vendor_2',
        vendorName: 'Serengeti Teas & Spices',
        name: 'Zanzibar Organic Clove Tea (20 Bags)',
        description: 'Aromatic black tea infused with premium aromatic cloves from Pemba Island.',
        category: 'Food & Beverages',
        sku: 'SER-TEA-CLV-20',
        priceTzs: 7500,
        images: ['https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800'],
        status: 'ACTIVE',
        stockQuantity: 150,
        createdAt: now,
        updatedAt: now,
      },
    ];

    // 6. Bookings
    const bookings: Booking[] = [
      {
        id: 'bk_101',
        vendorId: 'usr_vendor_1',
        vendorName: 'Amina Salum',
        vendorBusinessName: 'Kilimanjaro Organics Ltd',
        shelfId: 'shelf_1',
        shelfName: 'Eye-Level Premium Shelf A1',
        shopName: 'Juma Mini Market — Mikocheni',
        shopCity: 'Dar es Salaam',
        hostId: 'usr_host_1',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
        durationMonths: 3,
        monthlyPriceTzs: 75000,
        totalPriceTzs: 225000,
        platformFeeTzs: 22500, // 10%
        hostEarningsTzs: 202500,
        status: 'ACTIVE',
        paymentStatus: 'PAID',
        notes: 'Placing Kilimanjaro Mango Juice & Raw Acacia Honey on display.',
        createdAt: now,
        updatedAt: now,
      },
    ];

    // 7. Inventory
    const shelfInventory: ShelfInventory[] = [
      {
        id: 'inv_1',
        shelfId: 'shelf_1',
        productId: 'prod_1',
        productName: 'Kilimanjaro Pure Mango Juice (500ml)',
        productSku: 'KIL-JUICE-MNG-500',
        vendorId: 'usr_vendor_1',
        quantity: 36,
        minStockLevel: 10,
        stockStatus: 'IN_STOCK',
        lastUpdated: now,
      },
      {
        id: 'inv_2',
        shelfId: 'shelf_1',
        productId: 'prod_2',
        productName: 'Raw Acacia Wild Honey (350g)',
        productSku: 'KIL-HNY-ACA-350',
        vendorId: 'usr_vendor_1',
        quantity: 8,
        minStockLevel: 12,
        stockStatus: 'LOW_STOCK',
        lastUpdated: now,
      },
    ];

    // 8. Payments
    const payments: Payment[] = [
      {
        id: 'pay_101',
        bookingId: 'bk_101',
        vendorId: 'usr_vendor_1',
        amountTzs: 225000,
        currency: 'TZS',
        provider: 'PESAPAL',
        transactionReference: 'PESA-TZ-9821033',
        pesapalTrackingId: 'pesapal-ref-881239',
        status: 'PAID',
        paidAt: now,
        createdAt: now,
      },
    ];

    // 9. Payouts
    const payouts: Payout[] = [
      {
        id: 'payout_101',
        hostId: 'usr_host_1',
        hostName: 'Juma Mkwawa',
        hostBusinessName: 'Juma Mini Markets & Retail',
        grossAmountTzs: 225000,
        commissionTzs: 22500,
        netAmountTzs: 202500,
        status: 'COMPLETED',
        payoutReference: 'BANK-CRDB-902183',
        paidAt: now,
        createdAt: now,
      },
    ];

    // 10. Field Visits
    const fieldVisits: FieldVisit[] = [
      {
        id: 'visit_1',
        agentId: 'usr_agent_1',
        agentName: 'Baraka John',
        shopId: 'shop_1',
        shopName: 'Juma Mini Market — Mikocheni',
        shopAddress: 'Old Bagamoyo Road, Mikocheni B',
        shopCity: 'Dar es Salaam',
        shelfId: 'shelf_1',
        shelfName: 'Eye-Level Premium Shelf A1',
        scheduledAt: new Date().toISOString(),
        status: 'SCHEDULED',
        createdAt: now,
      },
      {
        id: 'visit_2',
        agentId: 'usr_agent_1',
        agentName: 'Baraka John',
        shopId: 'shop_3',
        shopName: 'Kariakoo Mega Commercial Store',
        shopAddress: 'Swahili Street, Kariakoo',
        shopCity: 'Dar es Salaam',
        shelfId: 'shelf_4',
        shelfName: 'Entrance Stand Glass Case D1',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        status: 'SCHEDULED',
        createdAt: now,
      },
    ];

    // 11. Shelf Reports
    const shelfReports: ShelfReport[] = [
      {
        id: 'rep_1',
        visitId: 'visit_1',
        agentId: 'usr_agent_1',
        agentName: 'Baraka John',
        shelfId: 'shelf_1',
        shopId: 'shop_1',
        stockLevelPercent: 70,
        shelfCondition: 'EXCELLENT',
        notes: 'Shelf is clean and well illuminated. Raw Acacia Honey is running low (8 items remaining).',
        photos: ['https://images.unsplash.com/photo-1583258292688-d02132382025?w=800'],
        aiAnalysis: {
          visibleProductsCount: 14,
          estimatedStockPercent: 72,
          emptySpacesDetected: true,
          conditionScore: 9,
          detectedIssues: ['Low stock on jar products on top tier'],
          summary: 'Shelf is in excellent physical condition with clear branding visibility. Replenishment recommended for Acacia Honey jars.',
        },
        createdAt: now,
      },
    ];

    // 12. Notifications
    const notifications: Notification[] = [
      {
        id: 'notif_1',
        userId: 'usr_vendor_1',
        title: 'Booking Active 🎉',
        message: 'Your booking for Eye-Level Premium Shelf A1 at Juma Mini Market is now active.',
        type: 'SUCCESS',
        createdAt: now,
      },
      {
        id: 'notif_2',
        userId: 'usr_host_1',
        title: 'Payment Received TZS 202,500',
        message: 'Net payout of TZS 202,500 for Booking #bk_101 has been calculated and processed.',
        type: 'INFO',
        createdAt: now,
      },
      {
        id: 'notif_3',
        userId: 'usr_vendor_1',
        title: 'Low Stock Alert ⚠️',
        message: 'Raw Acacia Wild Honey (350g) on Shelf A1 is down to 8 units. Consider restocking soon.',
        type: 'WARNING',
        createdAt: now,
      },
    ];

    // 13. Messages
    const messages: Message[] = [
      {
        id: 'msg_1',
        senderId: 'usr_vendor_1',
        senderName: 'Amina Salum',
        senderRole: 'VENDOR',
        receiverId: 'usr_host_1',
        bookingId: 'bk_101',
        content: 'Hello Juma, our driver will deliver 3 boxes of Kilimanjaro Mango Juice tomorrow at 9 AM.',
        createdAt: now,
      },
      {
        id: 'msg_2',
        senderId: 'usr_host_1',
        senderName: 'Juma Mkwawa',
        senderRole: 'HOST',
        receiverId: 'usr_vendor_1',
        bookingId: 'bk_101',
        content: 'Asante Amina! Our floor manager will receive the delivery and set up the display.',
        createdAt: now,
      },
    ];

    // 14. Audit Logs
    const auditLogs: AuditLog[] = [
      {
        id: 'log_1',
        userId: 'usr_admin',
        userName: 'Shelfy Admin',
        userRole: 'ADMIN',
        action: 'HOST_VERIFIED',
        resource: 'HostProfile',
        resourceId: 'hp_1',
        details: 'Approved host registration for Juma Mini Markets',
        timestamp: now,
      },
      {
        id: 'log_2',
        userId: 'usr_vendor_1',
        userName: 'Amina Salum',
        userRole: 'VENDOR',
        action: 'PAYMENT_CONFIRMED',
        resource: 'Payment',
        resourceId: 'pay_101',
        details: 'PesaPal payment of TZS 225,000 completed successfully.',
        timestamp: now,
      },
    ];

    // 15. Reviews & Disputes
    const reviews: Review[] = [
      {
        id: 'rev_1',
        bookingId: 'bk_101',
        reviewerId: 'usr_vendor_1',
        reviewerName: 'Amina Salum',
        reviewerRole: 'VENDOR',
        targetId: 'shelf_1',
        rating: 5,
        comment: 'Great shelf location! Excellent foot traffic and staff are very helpful with restocking.',
        createdAt: now,
      },
    ];

    const disputes: Dispute[] = [];

    // 16. Platform Settings
    const settings: PlatformSettings = {
      commissionPercentage: 10,
      autoApproveBookings: false,
      pesapalEnvironment: 'sandbox',
      currency: 'TZS',
      maintenanceMode: false,
    };

    return {
      users,
      vendorProfiles,
      hostProfiles,
      shops,
      shelves,
      products,
      shelfInventory,
      bookings,
      payments,
      payouts,
      fieldVisits,
      shelfReports,
      notifications,
      messages,
      auditLogs,
      reviews,
      disputes,
      settings,
    };
  }
}

export const dbEngine = new DatabaseEngine();
