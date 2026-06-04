import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Package, MapPin, Search, TrendingUp, Users, Store, Bell, CheckCircle, AlertCircle } from 'lucide-react'

export default async function VendorDashboard({ searchParams }: { searchParams: { payment?: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'VENDOR') redirect(`/dashboard/${session.user.role.toLowerCase().replace('_', '-')}`)

  const bookings = await prisma.booking.findMany({
    where: { vendorId: session.user.id },
    include: {
      shelf: { include: { host: { select: { name: true, businessName: true, phone: true } } } },
      payment: true,
      fieldReports: { orderBy: { visitDate: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  })

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id, read: false },
    orderBy: { createdAt: 'desc' }, take: 5,
  })

  const active  = bookings.filter(b => ['ACTIVE','APPROVED'].includes(b.status))
  const pending = bookings.filter(b => b.status === 'PENDING')
  const cities  = [...new Set(bookings.map(b => b.shelf.city))]

  const CATEGORY_ICON: Record<string, string> = { Supermarket:'🛒', Pharmacy:'💊', 'Hardware Store':'🔧', 'Electronics Shop':'📱', 'Clothing Store':'👗', 'General Store':'🏬' }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <nav className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-green-600 rounded-lg flex items-center justify-center"><Store size={15} className="text-white" /></div>
            <span className="font-bold">Shelfy</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/browse" className="btn-primary text-sm !py-2 !px-4"><Search size={15} /> Browse Shelves</Link>
            <Link href="/api/auth/signout" className="text-sm text-gray-500 hover:text-gray-700">Logout</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Payment status banner */}
        {searchParams.payment === 'success' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <CheckCircle className="text-green-600" size={20} />
            <span className="text-green-800 font-medium">Payment successful! Your shelf booking is now active.</span>
          </div>
        )}
        {searchParams.payment === 'failed' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="text-red-600" size={20} />
            <span className="text-red-800 font-medium">Payment failed. Please try again or contact support.</span>
          </div>
        )}

        {/* Header */}
        <div className="page-header">
          <div>
            <h1>Vendor Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Welcome back, {session.user.name} 👋</p>
          </div>
          <Link href="/browse" className="btn-primary"><Search size={16} /> Browse Shelves</Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Active Bookings', value: active.length, icon: <Store size={18} className="text-green-600" />, bg: 'bg-green-50' },
            { label: 'Pending Approval', value: pending.length, icon: <Bell size={18} className="text-amber-600" />, bg: 'bg-amber-50' },
            { label: 'Cities Reached', value: cities.length, icon: <MapPin size={18} className="text-blue-600" />, bg: 'bg-blue-50' },
            { label: 'Total Bookings', value: bookings.length, icon: <TrendingUp size={18} className="text-purple-600" />, bg: 'bg-purple-50' },
          ].map(({ label, value, icon, bg }) => (
            <div key={label} className="stat-card">
              <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center`}>{icon}</div>
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>

        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="card mb-6 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <Bell size={16} className="text-amber-500" />
              <h3>Notifications</h3>
            </div>
            {notifications.map(n => (
              <div key={n.id} className="px-6 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition">
                <div className="font-medium text-sm text-gray-900">{n.title}</div>
                <div className="text-xs text-gray-500 mt-0.5">{n.message}</div>
              </div>
            ))}
          </div>
        )}

        {/* Active Bookings */}
        <div className="card overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3>My Bookings</h3>
          </div>
          {bookings.length === 0 ? (
            <div className="p-12 text-center">
              <Package size={40} className="text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 text-sm mb-4">No bookings yet.</p>
              <Link href="/browse" className="btn-primary inline-flex">Browse Available Shelves</Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {bookings.map(b => {
                const lastReport = b.fieldReports[0]
                return (
                  <div key={b.id} className="px-6 py-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-2xl flex-shrink-0">
                        {CATEGORY_ICON[b.shelf.category] ?? '🏬'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="font-medium text-sm">{b.shelf.name}</div>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${
                            b.status === 'ACTIVE' || b.status === 'APPROVED' ? 'badge-green' :
                            b.status === 'PENDING' ? 'badge-amber' :
                            b.status === 'CANCELLED' ? 'badge-red' : 'badge-blue'
                          }`}>{b.status}</span>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mb-1"><MapPin size={10} />{b.shelf.area}, {b.shelf.city}</div>
                        <div className="text-xs text-gray-400">{b.productName} · {new Date(b.startDate).toLocaleDateString()} → {new Date(b.endDate).toLocaleDateString()}</div>
                        {lastReport && (
                          <div className="mt-2 bg-green-50 rounded-lg p-2 text-xs text-green-800">
                            📊 Latest report ({new Date(lastReport.visitDate).toLocaleDateString()}): {lastReport.unitsSold} units sold · {lastReport.aiAnalysis?.slice(0, 80)}...
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-bold text-sm">TZS {b.totalAmount.toLocaleString()}</div>
                        {b.payment?.status !== 'COMPLETED' && b.status === 'PENDING' && (
                          <form action="/api/payments/checkout" method="POST">
                            <input type="hidden" name="bookingId" value={b.id} />
                            <button type="submit" className="mt-2 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition">Pay Now</button>
                          </form>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Expand CTA */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3>Ready to expand to more cities?</h3>
            <p className="text-sm text-green-700 mt-0.5">Browse shelves in Dar es Salaam, Arusha, Mwanza and more.</p>
          </div>
          <Link href="/browse" className="btn-primary flex-shrink-0">Browse Shelves</Link>
        </div>
      </div>
    </div>
  )
}
