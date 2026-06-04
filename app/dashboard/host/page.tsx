import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Store, Plus, DollarSign, Bell, Package, MapPin } from 'lucide-react'

export default async function HostDashboard() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'HOST') redirect(`/dashboard/${session.user.role.toLowerCase().replace('_','-')}`)

  const shelves  = await prisma.shelf.findMany({ where: { hostId: session.user.id }, orderBy: { createdAt: 'desc' } })
  const bookings = await prisma.booking.findMany({
    where: { shelf: { hostId: session.user.id } },
    include: { shelf: true, vendor: { select: { name: true, businessName: true, phone: true, email: true } }, payment: true },
    orderBy: { createdAt: 'desc' },
  })

  const earnings = bookings.filter(b => ['ACTIVE','APPROVED','COMPLETED'].includes(b.status)).reduce((s, b) => s + b.hostPayout, 0)
  const active   = bookings.filter(b => ['ACTIVE','APPROVED'].includes(b.status))
  const pending  = bookings.filter(b => b.status === 'PENDING')
  const CATEGORY_ICON: Record<string,string> = { Supermarket:'🛒', Pharmacy:'💊', 'Hardware Store':'🔧', 'Electronics Shop':'📱', 'Clothing Store':'👗', 'General Store':'🏬' }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2"><div className="w-7 h-7 bg-green-600 rounded-lg flex items-center justify-center"><Store size={15} className="text-white" /></div><span className="font-bold">Shelfy</span></Link>
          <Link href="/api/auth/signout" className="text-sm text-gray-500 hover:text-gray-700">Logout</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="page-header">
          <div><h1>Host Dashboard</h1><p className="text-gray-500 text-sm mt-1">Welcome back, {session.user.name} 👋</p></div>
          <Link href="/dashboard/host/add-shelf" className="btn-primary"><Plus size={16} /> Add Shelf Space</Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Monthly Earnings', value: `TZS ${earnings.toLocaleString()}`, icon: <DollarSign size={18} className="text-green-600" />, bg: 'bg-green-50' },
            { label: 'Active Listings', value: shelves.length, icon: <Store size={18} className="text-blue-600" />, bg: 'bg-blue-50' },
            { label: 'Active Bookings', value: active.length, icon: <Package size={18} className="text-purple-600" />, bg: 'bg-purple-50' },
            { label: 'Pending Requests', value: pending.length, icon: <Bell size={18} className="text-amber-600" />, bg: 'bg-amber-50' },
          ].map(({ label, value, icon, bg }) => (
            <div key={label} className="stat-card"><div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center`}>{icon}</div><div className="text-2xl font-bold">{value}</div><div className="text-xs text-gray-500">{label}</div></div>
          ))}
        </div>

        {pending.length > 0 && (
          <div className="card overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="flex items-center gap-2"><Bell size={16} className="text-amber-500" /> Pending Requests</h3>
              <span className="badge-amber">{pending.length} awaiting</span>
            </div>
            {pending.map(b => (
              <div key={b.id} className="px-6 py-4 border-b border-gray-50 last:border-0">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <div className="font-medium text-sm">{b.vendor.businessName ?? b.vendor.name}</div>
                    <div className="text-xs text-gray-500">{b.productName} · {b.shelf.name}</div>
                    <div className="text-xs text-gray-400">{new Date(b.startDate).toLocaleDateString()} → {new Date(b.endDate).toLocaleDateString()}</div>
                    {b.vendor.phone && <div className="text-xs text-green-600">📞 {b.vendor.phone}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">TZS {b.hostPayout.toLocaleString()}</span>
                    <ApproveButton bookingId={b.id} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="card overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100"><h3>All Bookings</h3></div>
          {bookings.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">No bookings yet.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {bookings.map(b => (
                <div key={b.id} className="px-6 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-xl flex-shrink-0">{CATEGORY_ICON[b.shelf.category]??'🏬'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{b.vendor.businessName ?? b.vendor.name}</div>
                    <div className="text-xs text-gray-500">{b.productName} · {b.shelf.name}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-sm">TZS {b.hostPayout.toLocaleString()}</div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.status==='ACTIVE'||b.status==='APPROVED'?'badge-green':b.status==='PENDING'?'badge-amber':'badge-red'}`}>{b.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between"><h3>My Shelf Listings</h3><span className="text-xs text-gray-400">{shelves.length} total</span></div>
          {shelves.length === 0 ? (
            <div className="p-12 text-center"><Store size={40} className="text-gray-200 mx-auto mb-4" /><p className="text-gray-500 text-sm mb-4">No shelves listed yet.</p><Link href="/dashboard/host/add-shelf" className="btn-primary inline-flex">Add Your First Shelf</Link></div>
          ) : (
            <div className="divide-y divide-gray-50">
              {shelves.map(s => (
                <div key={s.id} className="px-6 py-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-2xl flex-shrink-0">{CATEGORY_ICON[s.category]??'🏬'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{s.name}</div>
                    <div className="text-xs text-gray-500">{s.category} · {s.size}</div>
                    <div className="flex items-center gap-1 text-xs text-gray-400"><MapPin size={10} />{s.area}, {s.city}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-sm">TZS {s.price.toLocaleString()}<span className="text-xs text-gray-400 font-normal">/mo</span></div>
                    <span className={s.available?'badge-green':'badge-red'}>{s.available?'Available':'Booked'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Client component for approve button
function ApproveButton({ bookingId }: { bookingId: string }) {
  return (
    <Link href={`/api/bookings/${bookingId}/approve`} className="btn-primary text-xs !py-1.5 !px-3">Approve</Link>
  )
}
