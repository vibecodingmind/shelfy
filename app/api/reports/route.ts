import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { analyzeShelfPhoto } from '@/lib/anthropic'
import { writeFile } from 'fs/promises'
import path from 'path'

// GET /api/reports — field agent sees assigned, vendor sees own shelf reports
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const bookingId = searchParams.get('bookingId')

  const reports = await prisma.fieldReport.findMany({
    where: {
      ...(bookingId && { bookingId }),
      ...(session.user.role === 'FIELD_AGENT' && { agentId: session.user.id }),
    },
    include: {
      shelf:   { select: { name: true, city: true, area: true } },
      booking: { select: { productName: true, vendor: { select: { name: true, email: true, phone: true } } } },
      agent:   { select: { name: true } },
    },
    orderBy: { visitDate: 'desc' },
  })

  return NextResponse.json({ reports })
}

// POST /api/reports — field agent submits report with optional photo
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'FIELD_AGENT') {
    return NextResponse.json({ error: 'Only field agents can submit reports' }, { status: 401 })
  }

  const formData = await req.formData()
  const shelfId    = formData.get('shelfId') as string
  const bookingId  = formData.get('bookingId') as string
  const stockBefore = parseInt(formData.get('stockBefore') as string)
  const stockAfter  = parseInt(formData.get('stockAfter') as string)
  const condition   = formData.get('condition') as string
  const agentNotes  = formData.get('agentNotes') as string
  const photoFile   = formData.get('photo') as File | null

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { shelf: true },
  })
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  let photoPath = ''
  let aiAnalysis = ''

  // Save photo if provided
  if (photoFile) {
    const bytes  = await photoFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filename = `report-${Date.now()}-${photoFile.name.replace(/\s/g, '_')}`
    const uploadDir = process.env.UPLOAD_DIR ?? '/tmp'
    const fullPath  = path.join(uploadDir, filename)
    await writeFile(fullPath, buffer)
    photoPath = `${process.env.NEXT_PUBLIC_UPLOAD_URL}/${filename}`

    // Run AI analysis on the photo
    try {
      const base64 = buffer.toString('base64')
      const mediaType = photoFile.type as 'image/jpeg' | 'image/png'
      const result = await analyzeShelfPhoto(base64, mediaType, {
        productName:   booking.productName,
        shelfLocation: `${booking.shelf.area}, ${booking.shelf.city}`,
        previousStock: stockBefore,
      })
      aiAnalysis = result.report
    } catch (err) {
      console.error('AI analysis failed:', err)
      aiAnalysis = 'AI analysis unavailable for this report.'
    }
  }

  const unitsSold = Math.max(0, stockBefore - stockAfter)

  const report = await prisma.fieldReport.create({
    data: {
      shelfId, bookingId, agentId: session.user.id,
      visitDate: new Date(),
      photos: photoPath ? [photoPath] : [],
      stockBefore, stockAfter, unitsSold,
      condition: (condition as any) ?? 'GOOD',
      aiAnalysis, agentNotes,
    },
  })

  // Notify vendor
  await prisma.notification.create({
    data: {
      userId: booking.vendorId,
      type: 'FIELD_REPORT',
      title: '📊 New Shelf Report Available',
      message: `Your shelf at ${booking.shelf.name} was visited. ${unitsSold} units sold. ${aiAnalysis.slice(0, 100)}...`,
      link: '/dashboard/vendor',
    },
  })

  return NextResponse.json({ report }, { status: 201 })
}
