import Link from 'next/link'
import { ArrowRight, Store, Package, Shield, TrendingUp, Clock, MapPin, Star } from 'lucide-react'
import { prisma } from '@/lib/prisma'

async function getFeaturedShelves() {
  return prisma.shelf.findMany({
    where: { available: true },
    orderBy: { rating: 'desc' },
    take: 6,
    include: { host: { select: { businessName: true } } },
  })
}

const CATEGORY_ICON: Record<string, string> = {
  Supermarket: '🛒', Pharmacy: '💊', 'Hardware Store': '🔧',
  'Electronics Shop': '📱', 'Clothing Store': '👗', 'General Store': '🏬',
}

export default async function HomePage() {
  const shelves = await getFeaturedShelves()

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <Store size={18} className="text-white" />
            </div>
            <span className="font-bold text-xl">Shelfy</span>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">TZ</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/browse" className="hidden sm:block text-sm text-gray-600 hover:text-green-600 font-medium transition">Browse Shelves</Link>
            <Link href="/login" className="text-sm text-gray-600 hover:text-green-600 font-medium transition">Login</Link>
            <Link href="/register" className="btn-primary text-sm !py-2 !px-4">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-green-50 via-emerald-50 to-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block bg-green-100 text-green-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-6">🇹🇿 Built for Tanzania's SMEs</span>
          <h1 className="text-5xl font-extrabold text-gray-900 mb-6 leading-tight">
            Rent shelf space.<br /><span className="text-green-600">Grow your business.</span>
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Shelfy connects vendors with shop owners who have unused shelf space. Get your products in front of more customers — without the cost of a new branch.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register?role=vendor" className="btn-primary px-8 py-3.5 text-base shadow-lg shadow-green-200">Start as Vendor <ArrowRight size={18} /></Link>
            <Link href="/register?role=host" className="btn-outline px-8 py-3.5 text-base">List Your Shelf Space</Link>
          </div>
          <p className="text-sm text-gray-400 mt-4">Free to join · Pay only when you book · M-Pesa accepted</p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-10 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-3 gap-6 text-center">
          {[['142+', 'Active Vendors'], ['67+', 'Host Shops'], ['6', 'Cities']].map(([n, l]) => (
            <div key={l}>
              <div className="text-3xl font-extrabold text-green-600">{n}</div>
              <div className="text-sm text-gray-500 mt-1">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-center mb-3">How Shelfy Works</h2>
          <p className="text-center text-gray-500 mb-12 text-sm">Simple, transparent, built for Tanzanian businesses</p>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-green-50 rounded-2xl p-6 border border-green-100">
              <h3 className="text-green-800 mb-5 flex items-center gap-2"><Package size={20} /> For Vendors</h3>
              {[['1','Browse shelves by city, store type & budget'],['2','Book & pay via M-Pesa, Tigo Pesa, or card'],['3','Deliver products to the host shop'],['4','Get AI-powered weekly sales reports']].map(([n,t]) => (
                <div key={n} className="flex gap-3 mb-3"><span className="w-6 h-6 bg-green-600 text-white rounded-full text-xs flex items-center justify-center flex-shrink-0 font-bold">{n}</span><span className="text-gray-700 text-sm">{t}</span></div>
              ))}
            </div>
            <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
              <h3 className="text-blue-800 mb-5 flex items-center gap-2"><Store size={20} /> For Hosts</h3>
              {[['1','List available shelf space with photos & pricing'],['2','Review and approve vendor requests'],['3','Vendors deliver products — you run your store'],['4','Receive monthly payouts to M-Pesa']].map(([n,t]) => (
                <div key={n} className="flex gap-3 mb-3"><span className="w-6 h-6 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center flex-shrink-0 font-bold">{n}</span><span className="text-gray-700 text-sm">{t}</span></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Shelves */}
      {shelves.length > 0 && (
        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2>Available Shelf Spaces</h2>
              <Link href="/browse" className="text-green-600 font-medium text-sm hover:underline flex items-center gap-1">View all <ArrowRight size={15} /></Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {shelves.map((shelf) => (
                <Link key={shelf.id} href={`/shelf/${shelf.id}`} className="card hover:shadow-lg transition overflow-hidden group">
                  <div className="h-36 bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-5xl">
                    {CATEGORY_ICON[shelf.category] ?? '🏬'}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="text-sm group-hover:text-green-600 transition">{shelf.name}</h3>
                      <span className="badge-green ml-2 flex-shrink-0">Available</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400 text-xs mb-2"><MapPin size={11} />{shelf.area}, {shelf.city}</div>
                    {shelf.rating > 0 && (
                      <div className="flex items-center gap-1 mb-2">
                        <Star size={12} className="text-amber-400 fill-amber-400" />
                        <span className="text-xs font-medium">{shelf.rating}</span>
                        <span className="text-xs text-gray-400">({shelf.reviewCount})</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <div><span className="font-bold text-sm">TZS {shelf.price.toLocaleString()}</span><span className="text-gray-400 text-xs">/mo</span></div>
                      <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">{shelf.size}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Add-on Services */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center mb-3">Full-Service Add-ons</h2>
          <p className="text-center text-gray-500 text-sm mb-10">Optional services vendors can add to any booking</p>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="card p-6"><div className="text-3xl mb-4">📊</div><h3 className="mb-2">Shelf Monitoring</h3><p className="text-sm text-gray-500 mb-4">Field agents visit weekly, count stock, take photos. AI generates a professional report sent to you automatically.</p><div className="text-green-600 font-bold">TZS 30,000 <span className="text-gray-400 font-normal text-sm">/month per shelf</span></div></div>
            <div className="card p-6"><div className="text-3xl mb-4">🚚</div><h3 className="mb-2">Logistics Service</h3><p className="text-sm text-gray-500 mb-4">Ship products via intercity bus — we collect from the terminal and deliver to your shelf. Photo confirmation on delivery.</p><div className="text-green-600 font-bold">TZS 15,000 <span className="text-gray-400 font-normal text-sm">/delivery</span></div></div>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center mb-10">Why Choose Shelfy?</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: <Shield className="text-green-600" size={28} />, title: 'Secure Payments', desc: 'PesaPal-powered. M-Pesa, Tigo Pesa, Airtel Money & cards.' },
              { icon: <TrendingUp className="text-green-600" size={28} />, title: 'AI Sales Reports', desc: 'Weekly field visits + AI photo analysis = sales data without leaving your desk.' },
              { icon: <Clock className="text-green-600" size={28} />, title: 'Book in Minutes', desc: 'Browse, book and confirm shelf space in under 5 minutes.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="text-center p-6 rounded-2xl border border-gray-100 hover:shadow-md transition">
                <div className="flex justify-center mb-4">{icon}</div>
                <h3 className="mb-2">{title}</h3>
                <p className="text-sm text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-green-600">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-white mb-4">Ready to grow your business?</h2>
          <p className="text-green-100 mb-8">Join 200+ businesses already using Shelfy to expand across Tanzania.</p>
          <Link href="/register" className="bg-white text-green-700 px-8 py-3.5 rounded-xl font-bold hover:bg-green-50 transition inline-block">Create Free Account</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10 px-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-6 h-6 bg-green-600 rounded-md flex items-center justify-center"><Store size={14} className="text-white" /></div>
          <span className="text-white font-bold">Shelfy</span>
        </div>
        <p className="text-sm">The shelf space marketplace for Tanzania.</p>
        <p className="text-xs mt-2 text-gray-600">Payments powered by PesaPal · © 2026 Shelfy Tanzania</p>
      </footer>
    </div>
  )
}
