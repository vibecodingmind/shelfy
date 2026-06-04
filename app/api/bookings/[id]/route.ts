import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PATCH /api/bookings/[id] — approve/reject/cancel
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { status } = await req.json()
  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: { shelf: true, vendor: true },
  })

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  // Only host or admin can approve/reject
  const canChange =
    session.user.role === 'ADMIN' ||
    (session.user.role === 'HOST' && booking.shelf.hostId === session.user.id) ||
    (session.user.role === 'VENDOR' && booking.vendorId === session.user.id && status === 'CANCELLED')

  if (!canChange) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const updated = await prisma.booking.update({
    where: { id: params.id },
    data: { status },
  })

  // Mark shelf unavailable when approved
  if (status === 'APPROVED' || status === 'ACTIVE') {
    await prisma.shelf.update({ where: { id: booking.shelfId }, data: { available: false } })
  }
  if (status === 'CANCELLED' || status === 'COMPLETED' || status === 'REJECTED') {
    await prisma.shelf.update({ where: { id: booking.shelfId }, data: { available: true } })
  }

  // Notify vendor
  await prisma.notification.create({
    data: {
      userId: booking.vendorId,
      type: `BOOKING_${status}`,
      title: `Booking ${status.charAt(0) + status.slice(1).toLowerCase()}`,
      message: `Your booking for "${booking.shelf.name}" has been ${status.toLowerCase()}.`,
      link: '/dashboard/vendor',
    },
  })

  return NextResponse.json({ booking: updated })
}
