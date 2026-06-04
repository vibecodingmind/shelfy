import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Store, Users, Package, DollarSign, TrendingUp, AlertCircle, Calendar } from 'lucide-react'

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'ADMIN') redirect('/dashboard/vendor')

  const [totalVendors, totalHosts, totalShelves, activeBookings, revenueResult, recentBookings, pendingBookings] = await Promise.all([
    prisma.user.count({ where: { role: 'VENDOR' } }),
    prisma.user.count({ where: { role: 'HOST' } }),
    prisma.shelf.count(),
    prisma.booking.count({ where: { status: { in: ['ACTIVE','APPROVED'] } } }),
    prisma.payment.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }),
    prisma.booking.findMany({
      take: 10, orderBy: { createdAt: 'desc' },
      include: {
        shelf:  { select: { name: true, city: true, category: true } },
        vendor: { select: { name: true, businessName: true } },
        payment: { select: { status: true, method: true } },
      },
    }),
    prisma.booking.count({ where: { status: 'PENDING' } }),
  ])

  const totalRevenue = revenueResult._sum.amount ?? 0
  const platformCut  = totalRevenue * 0.10

  const STATUS_BADGE: Record<string,string> = {
    ACTIVE: 'badge-green', APPROVED: 'badge-green',
    PENDING: 'badge-amber', COMPLETED: 'badge-blue',
    CANCELLED: 'badge-red', REJECTED: 'badge-red',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2"><div className="w-7 h-7 bg-green-600 rounded-lg flex items-center justify-center"><Store size={15} className="text-white" /></div><span className="font-bold">Shelfy</span><span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Admin</span></Link>
          <Link href="/api/auth/signout" className="text-sm text-gray-500 hover:text-gray-700">Logout</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="page-header">
          <div><h1>Admin Dashboard</h1><p className="text-gray-500 text-sm mt-1">Platform overview — Shelfy Tanzania</p></div>
          <span className="badge-purple">Admin Access</span>
        </div>

        {/* Platform Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Vendors', value: totalVendors, icon: <Package size={18} className="text-green-600" />, bg: 'bg-green-50' },
            { label: 'Total Hosts', value: totalHosts, icon: <Store size={18} className="text-blue-600" />, bg: 'bg-blue-50' },
            { label: 'Total Shelves', value: totalShelves, icon: <Store size={18} className="text-purple-600" />, bg: 'bg-purple-50' },
            { label: 'Active Bookings', value: activeBookings, icon: <Calendar size={18} className="text-amber-600" />, bg: 'bg-amber-50' },
            { label: 'Total Revenue (TZS)', value: totalRevenue.toLocaleString(), icon: <TrendingUp size={18} className="text-emerald-600" />, bg: 'bg-emerald-50' },
            { label: 'Platform Earnings (TZS)', value: platformCut.toLocaleString(), icon: <DollarSign size={18} className="text-rose-600" />, bg: 'bg-rose-50' },
          ].map(({ label, value, icon, bg }) => (
            <div key={label} className="stat-card"><div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center`}>{icon}</div><div className="text-xl font-bold">{value}</div><div className="text-xs text-gray-500">{label}</div></div>
          ))}
        </div>

        {/* Revenue Breakdown */}
        <div className="card p-6 mb-6">
          <h3 className="mb-4">Revenue Breakdown</h3>
          <div className="space-y-3">
            {[
              { label: 'Gross Bookings', amount: totalRevenue, pct: 100, color: 'bg-green-500' },
              { label: 'Host Payouts (90%)', amount: totalRevenue * 0.9, pct: 90, color: 'bg-blue-400' },
              { label: 'Shelfy Cut (10%)', amount: platformCut, pct: 10, color: 'bg-amber-400' },
            ].map(({ label, amount, pct, color }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">{label}</span><span className="font-semibold">TZS {amount.toLocaleString()}</span></div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} /></div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="card overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3>Recent Bookings</h3>
            {pendingBookings > 0 && <span className="badge-amber flex items-center gap-1"><AlertCircle size={12} /> {pendingBookings} pending</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>{['Vendor','Product','Shelf','City','Amount','Status'].map(h => <th key={h} className="px-5 py-3 text-left font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentBookings.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3 font-medium">{b.vendor.businessName ?? b.vendor.name}</td>
                    <td className="px-5 py-3 text-gray-600">{b.productName}</td>
                    <td className="px-5 py-3 text-gray-600">{b.shelf.name}</td>
                    <td className="px-5 py-3 text-gray-500">{b.shelf.city}</td>
                    <td className="px-5 py-3 font-medium">TZS {b.totalAmount.toLocaleString()}</td>
                    <td className="px-5 py-3"><span className={STATUS_BADGE[b.status] ?? 'badge-blue'}>{b.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: 'Manage Users', href: '/dashboard/admin/users', icon: <Users size={20} />, color: 'bg-blue-50 text-blue-700' },
            { label: 'All Shelves', href: '/dashboard/admin/shelves', icon: <Store size={20} />, color: 'bg-green-50 text-green-700' },
            { label: 'Process Payouts', href: '/dashboard/admin/payouts', icon: <DollarSign size={20} />, color: 'bg-amber-50 text-amber-700' },
          ].map(({ label, href, icon, color }) => (
            <Link key={label} href={href} className={`card p-5 flex items-center gap-3 hover:shadow-md transition ${color}`}>
              {icon}<span className="font-semibold">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
