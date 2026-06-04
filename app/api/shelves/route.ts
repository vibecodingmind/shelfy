import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/shelves — public, with filters
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const city     = searchParams.get('city')
  const category = searchParams.get('category')
  const minPrice = searchParams.get('minPrice')
  const maxPrice = searchParams.get('maxPrice')
  const search   = searchParams.get('search')
  const hostId   = searchParams.get('hostId')

  const shelves = await prisma.shelf.findMany({
    where: {
      ...(city     && { city }),
      ...(category && { category }),
      ...(hostId   && { hostId }),
      ...(minPrice && { price: { gte: parseFloat(minPrice) } }),
      ...(maxPrice && { price: { lte: parseFloat(maxPrice) } }),
      ...(search   && {
        OR: [
          { name:     { contains: search, mode: 'insensitive' } },
          { city:     { contains: search, mode: 'insensitive' } },
          { area:     { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } },
        ],
      }),
    },
    include: {
      host: { select: { id: true, name: true, businessName: true, phone: true } },
      _count: { select: { bookings: true } },
    },
    orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json({ shelves })
}

// POST /api/shelves — host only
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'HOST') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { name, city, area, category, size, price, description, features } = body

  if (!name || !city || !area || !category || !size || !price) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const shelf = await prisma.shelf.create({
    data: {
      hostId: session.user.id,
      name, city, area, category, size,
      price: parseFloat(price),
      description: description ?? '',
      features: features ?? [],
      photos: [],
    },
  })

  return NextResponse.json({ shelf }, { status: 201 })
}
