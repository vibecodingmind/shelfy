import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [
    totalVendors, totalHosts, totalShelves,
    activeBookings, totalBookings,
    revenueResult, pendingPayouts,
    recentBookings, openDisputes,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'VENDOR' } }),
    prisma.user.count({ where: { role: 'HOST' } }),
    prisma.shelf.count(),
    prisma.booking.count({ where: { status: { in: ['ACTIVE', 'APPROVED'] } } }),
    prisma.booking.count(),
    prisma.payment.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }),
    prisma.payout.aggregate({ where: { status: 'PENDING' }, _sum: { amount: true } }),
    prisma.booking.findMany({
      take: 10, orderBy: { createdAt: 'desc' },
      include: {
        shelf:  { select: { name: true, city: true } },
        vendor: { select: { name: true, businessName: true } },
        payment: { select: { status: true, method: true } },
      },
    }),
    prisma.booking.count({ where: { status: 'PENDING' } }),
  ])

  return NextResponse.json({
    totalVendors, totalHosts, totalShelves,
    activeBookings, totalBookings,
    totalRevenue: revenueResult._sum.amount ?? 0,
    pendingPayouts: pendingPayouts._sum.amount ?? 0,
    platformCut: (revenueResult._sum.amount ?? 0) * 0.10,
    recentBookings,
    openDisputes,
  })
}
