#!/usr/bin/env node
/**
 * Set platform admin email + password in Postgres (run on VPS only).
 * Usage:
 *   PLATFORM_ADMIN_EMAIL=hello@shelfy.co.tz \
 *   PLATFORM_ADMIN_PASSWORD='your-secret' \
 *   node scripts/vps/set-platform-admin.mjs
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const email = (process.env.PLATFORM_ADMIN_EMAIL || 'hello@shelfy.co.tz').trim().toLowerCase();
const password = process.env.PLATFORM_ADMIN_PASSWORD?.trim();
if (!password) {
  console.error('PLATFORM_ADMIN_PASSWORD is required.');
  process.exit(1);
}
if (!process.env.DATABASE_URL?.trim()) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

const prisma = new PrismaClient();
const hash = bcrypt.hashSync(password, 10);
const now = new Date();

try {
  let admin =
    (await prisma.user.findFirst({ where: { role: 'ADMIN', email } })) ||
    (await prisma.user.findFirst({ where: { role: 'ADMIN', email: 'admin@shelfy.co.tz' } })) ||
    (await prisma.user.findFirst({ where: { role: 'ADMIN' } }));

  const taken = await prisma.user.findUnique({ where: { email } });
  if (taken && (!admin || taken.id !== admin.id)) {
    console.error(`Email ${email} is already used by ${taken.role} (${taken.id}).`);
    process.exit(1);
  }

  if (admin) {
    await prisma.user.update({
      where: { id: admin.id },
      data: {
        email,
        passwordHash: hash,
        status: 'ACTIVE',
        emailVerifiedAt: admin.emailVerifiedAt ?? now,
        failedLoginCount: 0,
        lockedUntil: null,
        updatedAt: now,
      },
    });
    console.log(`Updated admin ${admin.id} → ${email}`);
  } else {
    await prisma.user.create({
      data: {
        id: 'usr_admin',
        name: 'Shelfy Admin',
        email,
        phone: '+255 700 000 001',
        passwordHash: hash,
        role: 'ADMIN',
        status: 'ACTIVE',
        emailVerifiedAt: now,
        failedLoginCount: 0,
        createdAt: now,
        updatedAt: now,
      },
    });
    console.log(`Created admin ${email}`);
  }
} finally {
  await prisma.$disconnect();
}
