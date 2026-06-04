import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { submitPesapalOrder, registerIPN, getPesapalToken } from '@/lib/pesapal'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookingId } = await req.json()

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { vendor: true, shelf: true },
  })

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  if (booking.vendorId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Get PesaPal token and register IPN
  const token = await getPesapalToken()
  const ipnId = await registerIPN(token)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const callbackUrl = `${appUrl}/api/payments/callback?bookingId=${bookingId}`

  const { redirectUrl, orderTrackingId } = await submitPesapalOrder({
    bookingId,
    amount: booking.totalAmount,
    description: `Shelfy shelf rental: ${booking.shelf.name} — ${booking.productName}`,
    callbackUrl,
    customerEmail: booking.vendor.email,
    customerPhone: booking.vendor.phone ?? '',
    customerName: booking.vendor.name,
    ipnId,
  })

  // Create pending payment record
  await prisma.payment.upsert({
    where: { bookingId },
    update: { pesapalRef: orderTrackingId, ipnId, status: 'PENDING' },
    create: {
      bookingId, amount: booking.totalAmount,
      method: 'MPESA', status: 'PENDING',
      pesapalRef: orderTrackingId, ipnId,
    },
  })

  return NextResponse.json({ redirectUrl, orderTrackingId })
}
