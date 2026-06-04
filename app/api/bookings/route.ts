import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calcPlatformFee, calcHostPayout } from '@/lib/pesapal'

// GET /api/bookings — vendor sees own, host sees their shelf bookings, admin sees all
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { role, id } = session.user

  const bookings = await prisma.booking.findMany({
    where: role === 'ADMIN'  ? {} :
           role === 'VENDOR' ? { vendorId: id } :
           role === 'HOST'   ? { shelf: { hostId: id } } : { id: 'none' },
    include: {
      shelf:  { include: { host: { select: { name: true, businessName: true, phone: true } } } },
      vendor: { select: { id: true, name: true, businessName: true, phone: true, email: true } },
      payment: true,
      fieldReports: { orderBy: { visitDate: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ bookings })
}

// POST /api/bookings — vendor creates booking
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'VENDOR') {
    return NextResponse.json({ error: 'Only vendors can book shelves' }, { status: 401 })
  }

  const body = await req.json()
  const { shelfId, startDate, endDate, productName, productCategory, addOnMonitoring, addOnLogistics, notes } = body

  if (!shelfId || !startDate || !endDate || !productName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const shelf = await prisma.shelf.findUnique({ where: { id: shelfId } })
  if (!shelf) return NextResponse.json({ error: 'Shelf not found' }, { status: 404 })
  if (!shelf.available) return NextResponse.json({ error: 'Shelf not available' }, { status: 409 })

  // Calculate duration in months
  const start = new Date(startDate)
  const end   = new Date(endDate)
  const months = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)))

  let subtotal = shelf.price * months
  if (addOnMonitoring) subtotal += 30000 * months
  if (addOnLogistics)  subtotal += 15000

  const platformFee = calcPlatformFee(subtotal)
  const hostPayout  = calcHostPayout(subtotal)
  const total       = subtotal + platformFee

  const booking = await prisma.booking.create({
    data: {
      shelfId, vendorId: session.user.id,
      startDate: start, endDate: end,
      status: 'PENDING',
      totalAmount: total, platformFee, hostPayout,
      productName, productCategory,
      addOnMonitoring: addOnMonitoring ?? false,
      addOnLogistics: addOnLogistics ?? false,
      notes,
    },
    include: { shelf: true },
  })

  // Create notification for host
  await prisma.notification.create({
    data: {
      userId: shelf.hostId,
      type: 'NEW_BOOKING',
      title: 'New Booking Request',
      message: `${session.user.name} wants to book "${shelf.name}" for ${months} month(s). Product: ${productName}`,
      link: '/dashboard/host',
    },
  })

  return NextResponse.json({ booking }, { status: 201 })
}
