import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Store, MapPin, Star, CheckCircle, Shield, ArrowLeft, Package } from 'lucide-react'
import BookingForm from './booking-form'

const CATEGORY_ICON: Record<string, string> = {
  Supermarket: '🛒', Pharmacy: '💊', 'Hardware Store': '🔧',
  'Electronics Shop': '📱', 'Clothing Store': '👗', 'General Store': '🏬',
}

export default async function ShelfDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)

  const shelf = await prisma.shelf.findUnique({
    where: { id: params.id },
    include: {
      host: { select: { id: true, name: true, businessName: true, phone: true, city: true } },
      reviews: {
        include: { vendor: { select: { name: true, businessName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  })

  if (!shelf) notFound()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center"><Store size={18} className="text-white" /></div>
            <span className="font-bold text-xl">Shelfy</span>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">TZ</span>
          </Link>
          <div className="flex items-center gap-3">
            {session ? (
              <>
                <Link href={session.user.role === 'HOST' ? '/dashboard/host' : '/dashboard/vendor'} className="text-sm text-gray-600 hover:text-green-600 font-medium">Dashboard</Link>
                <Link href="/api/auth/signout" className="text-sm text-gray-400 hover:text-red-500">Logout</Link>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm text-gray-600 hover:text-green-600 font-medium">Login</Link>
                <Link href="/register" className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium">Get Started</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link href="/browse" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-green-600 transition mb-6">
          <ArrowLeft size={15} /> Back to Browse
        </Link>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left — Shelf Info */}
          <div className="lg:col-span-2 space-y-5">
            {/* Hero */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="h-56 bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-8xl">
                {CATEGORY_ICON[shelf.category] ?? '🏬'}
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{shelf.name}</h1>
                    <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                      <MapPin size={14} />{shelf.area}, {shelf.city}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${shelf.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {shelf.available ? 'Available' : 'Fully Booked'}
                  </span>
                </div>

                {shelf.reviewCount > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={16} className={s <= Math.round(shelf.rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
                    ))}
                    <span className="font-semibold text-gray-900">{shelf.rating}</span>
                    <span className="text-gray-400 text-sm">({shelf.reviewCount} reviews)</span>
                  </div>
                )}

                <p className="text-gray-600 leading-relaxed">{shelf.description}</p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 mb-4">Shelf Details</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Category', shelf.category],
                  ['Size', shelf.size],
                  ['City', shelf.city],
                  ['Area', shelf.area],
                ].map(([k, v]) => (
                  <div key={k} className="bg-gray-50 rounded-xl p-4">
                    <div className="text-xs text-gray-400 mb-1">{k}</div>
                    <div className="font-semibold text-gray-900">{v}</div>
                  </div>
                ))}
              </div>

              {shelf.features && shelf.features.length > 0 && (
                <div className="mt-5">
                  <h3 className="font-semibold text-gray-900 mb-3">Features</h3>
                  <div className="flex flex-wrap gap-2">
                    {shelf.features.map(f => (
                      <span key={f} className="flex items-center gap-1.5 bg-green-50 text-green-700 text-sm px-3 py-1.5 rounded-full">
                        <CheckCircle size={13} /> {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Host Info */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 mb-4">About the Host</h2>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-2xl font-bold text-green-700">
                  {shelf.host.name[0]}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{shelf.host.businessName ?? shelf.host.name}</div>
                  <div className="text-sm text-gray-500">{shelf.host.city}</div>
                  {shelf.host.phone && (
                    <div className="text-sm text-green-600 mt-1">📞 {shelf.host.phone}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Policies */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 mb-4">Booking Policies</h2>
              <div className="space-y-2">
                {[
                  'Minimum booking period: 1 month',
                  'Full refund if cancelled within 48 hours of booking',
                  'Vendor is responsible for product delivery and restocking',
                  'Payment secured via PesaPal — M-Pesa, Tigo Pesa, Airtel Money accepted',
                ].map(p => (
                  <div key={p} className="flex items-start gap-2 text-sm text-gray-600">
                    <Shield size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                    {p}
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews */}
            {shelf.reviews.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-bold text-gray-900 mb-4">Reviews</h2>
                <div className="space-y-4">
                  {shelf.reviews.map(r => (
                    <div key={r.id} className="border-b border-gray-50 last:border-0 pb-4 last:pb-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} size={13} className={s <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
                          ))}
                        </div>
                        <span className="text-sm font-medium text-gray-700">{r.vendor.businessName ?? r.vendor.name}</span>
                      </div>
                      {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right — Booking Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 sticky top-24">
              <div className="mb-5">
                <span className="text-3xl font-extrabold text-gray-900">TZS {shelf.price.toLocaleString()}</span>
                <span className="text-gray-400"> / month</span>
                <div className="text-xs text-gray-400 mt-1">+ 10% platform fee at checkout</div>
              </div>

              {session?.user.role === 'VENDOR' ? (
                shelf.available ? (
                  <BookingForm shelfId={shelf.id} shelfPrice={shelf.price} shelfName={shelf.name} userId={session.user.id} />
                ) : (
                  <div className="text-center py-6">
                    <Package size={32} className="text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm font-medium">This shelf is currently booked.</p>
                    <Link href="/browse" className="mt-3 inline-block text-green-600 text-sm font-semibold hover:underline">Browse other shelves</Link>
                  </div>
                )
              ) : session ? (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center text-sm text-amber-700">
                  Only vendors can book shelf space. <Link href="/register?role=vendor" className="font-semibold underline">Register as vendor</Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <Link href={`/login?callbackUrl=/shelf/${shelf.id}`} className="block w-full bg-green-600 text-white text-center py-3 rounded-xl font-semibold hover:bg-green-700 transition">
                    Login to Book
                  </Link>
                  <Link href="/register?role=vendor" className="block w-full border-2 border-green-600 text-green-700 text-center py-3 rounded-xl font-semibold hover:bg-green-50 transition">
                    Register as Vendor
                  </Link>
                </div>
              )}

              {/* Add-ons summary */}
              <div className="mt-5 pt-5 border-t border-gray-100 space-y-3">
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-lg">📊</span>
                  <div>
                    <div className="font-medium text-gray-800">Add Shelf Monitoring</div>
                    <div className="text-gray-400 text-xs">+TZS 30,000/month</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-lg">🚚</span>
                  <div>
                    <div className="font-medium text-gray-800">Add Logistics Service</div>
                    <div className="text-gray-400 text-xs">+TZS 15,000/delivery</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
