import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPesapalStatus } from '@/lib/pesapal'

// PesaPal redirects here after payment
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const bookingId        = searchParams.get('bookingId')
  const orderTrackingId  = searchParams.get('OrderTrackingId')

  if (!bookingId || !orderTrackingId) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/vendor?payment=error`)
  }

  try {
    const status = await getPesapalStatus(orderTrackingId)

    if (status.payment_status_description === 'Completed') {
      await prisma.payment.updateMany({
        where: { bookingId },
        data: { status: 'COMPLETED', pesapalTxn: orderTrackingId, paidAt: new Date() },
      })
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'APPROVED' },
      })
      await prisma.shelf.update({
        where: { id: (await prisma.booking.findUnique({ where: { id: bookingId } }))!.shelfId },
        data: { available: false },
      })
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/vendor?payment=success&bookingId=${bookingId}`)
    } else {
      await prisma.payment.updateMany({
        where: { bookingId },
        data: { status: 'FAILED' },
      })
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/vendor?payment=failed`)
    }
  } catch (err) {
    console.error('Payment callback error:', err)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/vendor?payment=error`)
  }
}

// PesaPal IPN webhook
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const orderTrackingId  = searchParams.get('OrderTrackingId')
  const merchantRef      = searchParams.get('OrderMerchantReference') // this is our bookingId

  if (!orderTrackingId || !merchantRef) return NextResponse.json({ ok: false })

  const status = await getPesapalStatus(orderTrackingId)
  if (status.payment_status_description === 'Completed') {
    await prisma.payment.updateMany({
      where: { bookingId: merchantRef },
      data: { status: 'COMPLETED', paidAt: new Date() },
    })
    await prisma.booking.update({ where: { id: merchantRef }, data: { status: 'APPROVED' } })
  }

  return NextResponse.json({ ok: true })
}
