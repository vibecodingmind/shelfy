import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { matchShelves } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { productType, targetCustomer, budget, city } = await req.json()

  const shelves = await prisma.shelf.findMany({
    where: { available: true, ...(city && { city }) },
    select: { id: true, name: true, category: true, area: true, price: true, rating: true },
  })

  const matches = await matchShelves({ productType, targetCustomer, budget, city, shelves })

  // Fetch full shelf details for matched IDs
  const matchedIds = matches.map((m) => m.shelfId)
  const fullShelves = await prisma.shelf.findMany({
    where: { id: { in: matchedIds } },
    include: { host: { select: { name: true, businessName: true } } },
  })

  const results = matches.map((m) => ({
    ...m,
    shelf: fullShelves.find((s) => s.id === m.shelfId),
  }))

  return NextResponse.json({ results })
}
