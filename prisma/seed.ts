import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Shelfy database...')

  // ── Users ──────────────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('admin123', 12)
  const userPassword  = await bcrypt.hash('shelfy123', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@shelfy.co.tz' },
    update: {},
    create: {
      name: 'Shelfy Admin', email: 'admin@shelfy.co.tz',
      password: adminPassword, role: Role.ADMIN,
      phone: '+255 712 000 001', verified: true,
    },
  })

  const host1 = await prisma.user.upsert({
    where: { email: 'juma@nakumatt.co.tz' },
    update: {},
    create: {
      name: 'Juma Hassan', email: 'juma@nakumatt.co.tz',
      password: userPassword, role: Role.HOST,
      phone: '+255 712 100 001', businessName: 'Nakumatt Kariakoo',
      city: 'Dar es Salaam', verified: true,
    },
  })

  const host2 = await prisma.user.upsert({
    where: { email: 'fatuma@dawa.co.tz' },
    update: {},
    create: {
      name: 'Fatuma Ali', email: 'fatuma@dawa.co.tz',
      password: userPassword, role: Role.HOST,
      phone: '+255 712 100 002', businessName: 'Dawa Plus Pharmacy',
      city: 'Dar es Salaam', verified: true,
    },
  })

  const vendor1 = await prisma.user.upsert({
    where: { email: 'amina@azamfoods.co.tz' },
    update: {},
    create: {
      name: 'Amina Salim', email: 'amina@azamfoods.co.tz',
      password: userPassword, role: Role.VENDOR,
      phone: '+255 712 200 001', businessName: 'Azam Foods Ltd',
      city: 'Dar es Salaam', verified: true,
    },
  })

  const vendor2 = await prisma.user.upsert({
    where: { email: 'david@bellabeauty.co.tz' },
    update: {},
    create: {
      name: 'David Mwangi', email: 'david@bellabeauty.co.tz',
      password: userPassword, role: Role.VENDOR,
      phone: '+255 712 200 002', businessName: 'Bella Beauty',
      city: 'Dar es Salaam', verified: true,
    },
  })

  const agent = await prisma.user.upsert({
    where: { email: 'agent@shelfy.co.tz' },
    update: {},
    create: {
      name: 'Baraka Mwenda', email: 'agent@shelfy.co.tz',
      password: userPassword, role: Role.FIELD_AGENT,
      phone: '+255 712 300 001', city: 'Dar es Salaam', verified: true,
    },
  })

  // ── Shelves ────────────────────────────────────────────────────────────────
  const shelf1 = await prisma.shelf.upsert({
    where: { id: 'shelf-001' },
    update: {},
    create: {
      id: 'shelf-001', hostId: host1.id,
      name: 'Main Entrance Shelf A', city: 'Dar es Salaam', area: 'Kariakoo',
      category: 'Supermarket', size: '2m × 1m', price: 120000,
      description: 'Prime eye-level shelf space near main entrance. Over 800 customers daily. Ideal for FMCG and food products.',
      features: ['High foot traffic', 'Eye-level placement', 'CCTV monitored', 'Air conditioned'],
      available: false, rating: 4.8, reviewCount: 24,
    },
  })

  const shelf2 = await prisma.shelf.upsert({
    where: { id: 'shelf-002' },
    update: {},
    create: {
      id: 'shelf-002', hostId: host2.id,
      name: 'Health & Beauty Shelf', city: 'Dar es Salaam', area: 'Masaki',
      category: 'Pharmacy', size: '1m × 0.5m', price: 75000,
      description: 'Premium shelf in upmarket Masaki pharmacy. Health-conscious customers from Masaki and Oyster Bay residential areas.',
      features: ['Health-conscious customers', 'Premium location', 'Display lighting', 'Daily stock check'],
      available: true, rating: 4.5, reviewCount: 18,
    },
  })

  const shelf3 = await prisma.shelf.upsert({
    where: { id: 'shelf-003' },
    update: {},
    create: {
      id: 'shelf-003', hostId: host1.id,
      name: 'Checkout Zone Shelf', city: 'Dar es Salaam', area: 'Kinondoni',
      category: 'Supermarket', size: '2m × 1.5m', price: 140000,
      description: 'Large premium shelf near checkout. Maximum impulse-buy visibility. High volume location.',
      features: ['Near checkout', 'CCTV monitored', 'High volume', 'Sales reporting'],
      available: true, rating: 4.7, reviewCount: 31,
    },
  })

  // ── Bookings ───────────────────────────────────────────────────────────────
  const booking1 = await prisma.booking.upsert({
    where: { id: 'booking-001' },
    update: {},
    create: {
      id: 'booking-001', shelfId: shelf1.id, vendorId: vendor1.id,
      startDate: new Date('2026-05-01'), endDate: new Date('2026-07-31'),
      status: 'ACTIVE', totalAmount: 396000, platformFee: 36000,
      hostPayout: 360000, productName: 'Azam Juice Range',
      productCategory: 'Beverages', addOnMonitoring: true, addOnLogistics: false,
    },
  })

  // ── Payment for booking ────────────────────────────────────────────────────
  await prisma.payment.upsert({
    where: { bookingId: 'booking-001' },
    update: {},
    create: {
      bookingId: 'booking-001', amount: 396000,
      method: 'MPESA', status: 'COMPLETED',
      pesapalRef: 'PES-2026-001', paidAt: new Date('2026-04-28'),
    },
  })

  // ── Field Report ───────────────────────────────────────────────────────────
  await prisma.fieldReport.create({
    data: {
      shelfId: shelf1.id, bookingId: booking1.id, agentId: agent.id,
      visitDate: new Date('2026-06-01'), photos: [],
      stockBefore: 48, stockAfter: 12, unitsSold: 36,
      condition: 'GOOD',
      aiAnalysis: 'Shelf is well-stocked and organized. 36 units sold since last visit (5 days ago). Sales velocity: ~7 units/day. At this rate, restock needed within 2 days. Product placement is optimal — eye-level and facing outward.',
      agentNotes: 'Products well arranged. Host staff cooperative. Recommend restocking by Thursday.',
      reportSent: true,
    },
  })

  console.log('✅ Seed complete!')
  console.log('')
  console.log('Test accounts:')
  console.log('  Admin:        admin@shelfy.co.tz     / admin123')
  console.log('  Host:         juma@nakumatt.co.tz    / shelfy123')
  console.log('  Vendor:       amina@azamfoods.co.tz  / shelfy123')
  console.log('  Field Agent:  agent@shelfy.co.tz     / shelfy123')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
