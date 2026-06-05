'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Store, Search, MapPin, Star, Filter, ArrowRight } from 'lucide-react'

const CITIES = ['All Cities', 'Dar es Salaam', 'Arusha', 'Mwanza', 'Dodoma', 'Mbeya', 'Morogoro']
const CATEGORIES = ['All Categories', 'Supermarket', 'Pharmacy', 'Hardware Store', 'Electronics Shop', 'Clothing Store', 'General Store']
const CATEGORY_ICON: Record<string, string> = {
  Supermarket: '🛒', Pharmacy: '💊', 'Hardware Store': '🔧',
  'Electronics Shop': '📱', 'Clothing Store': '👗', 'General Store': '🏬',
}

export default function BrowsePage() {
  const [shelves, setShelves] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [city, setCity] = useState('All Cities')
  const [category, setCategory] = useState('All Categories')
  const [maxPrice, setMaxPrice] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchShelves()
  }, [city, category, maxPrice])

  async function fetchShelves() {
    setLoading(true)
    const params = new URLSearchParams()
    if (city !== 'All Cities') params.set('city', city)
    if (category !== 'All Categories') params.set('category', category)
    if (maxPrice) params.set('maxPrice', maxPrice)
    const res = await fetch(`/api/shelves?${params}`)
    const data = await res.json()
    setShelves(data.shelves ?? [])
    setLoading(false)
  }

  const filtered = shelves.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.area?.toLowerCase().includes(search.toLowerCase()) ||
    s.city?.toLowerCase().includes(search.toLowerCase()) ||
    s.category?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <Store size={18} className="text-white" />
            </div>
            <span className="font-bold text-xl">Shelfy</span>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">TZ</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-600 hover:text-green-600 font-medium">Login</Link>
            <Link href="/register" className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium">Get Started</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Browse Shelf Spaces</h1>
          <p className="text-gray-500">Find the perfect location for your products across Tanzania</p>
        </div>

        {/* Search + Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 shadow-sm">
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="flex-1 min-w-64 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by store name, area or category..."
                className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition"
              />
            </div>

            {/* City */}
            <select
              value={city}
              onChange={e => setCity(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-500 bg-white"
            >
              {CITIES.map(c => <option key={c}>{c}</option>)}
            </select>

            {/* Category */}
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-500 bg-white"
            >
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>

            {/* Max Price */}
            <input
              type="number"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              placeholder="Max price (TZS)"
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-500 w-44"
            />
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-gray-500 mb-5">
          {loading ? 'Loading...' : `${filtered.length} shelf space${filtered.length !== 1 ? 's' : ''} available`}
        </p>

        {/* Shelf Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                <div className="h-36 bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-5 bg-gray-200 rounded w-1/3 mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Search size={48} className="text-gray-200 mx-auto mb-4" />
            <h3 className="text-gray-600 font-semibold mb-2">No shelf spaces found</h3>
            <p className="text-gray-400 text-sm">Try adjusting your filters or search terms</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(shelf => (
              <Link
                key={shelf.id}
                href={`/shelf/${shelf.id}`}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition group"
              >
                {/* Image / Icon area */}
                <div className="h-36 bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-5xl relative">
                  {CATEGORY_ICON[shelf.category] ?? '🏬'}
                  {!shelf.available && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-white text-sm font-semibold bg-red-500 px-3 py-1 rounded-full">Booked</span>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-semibold text-gray-900 text-sm group-hover:text-green-600 transition leading-tight">{shelf.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ml-2 ${shelf.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {shelf.available ? 'Available' : 'Booked'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-gray-400 text-xs mb-2">
                    <MapPin size={11} />{shelf.area}, {shelf.city}
                  </div>

                  <div className="text-xs text-gray-500 mb-2 bg-gray-50 inline-block px-2 py-0.5 rounded-full">
                    {shelf.category}
                  </div>

                  {shelf.rating > 0 && (
                    <div className="flex items-center gap-1 mb-2">
                      <Star size={12} className="text-amber-400 fill-amber-400" />
                      <span className="text-xs font-medium text-gray-700">{shelf.rating}</span>
                      <span className="text-xs text-gray-400">({shelf.reviewCount} reviews)</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                    <div>
                      <span className="font-bold text-gray-900">TZS {shelf.price?.toLocaleString()}</span>
                      <span className="text-gray-400 text-xs">/month</span>
                    </div>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">{shelf.size}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* CTA for hosts */}
        <div className="mt-12 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Own a shop? Earn from unused shelf space.</h2>
          <p className="text-gray-500 text-sm mb-5">List your available shelves and start receiving monthly income from vendors.</p>
          <Link href="/register?role=host" className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition">
            List Your Shelf Space <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  )
}
