'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Store, Plus, ArrowLeft, CheckCircle } from 'lucide-react'

const CITIES = ['Dar es Salaam', 'Arusha', 'Mwanza', 'Dodoma', 'Mbeya', 'Morogoro']
const CATEGORIES = ['Supermarket', 'Pharmacy', 'Hardware Store', 'Electronics Shop', 'Clothing Store', 'General Store']

export default function AddShelfPage() {
  const router = useRouter()
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', city: 'Dar es Salaam', area: '',
    category: 'Supermarket', size: '', price: '',
    description: '', features: '',
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/shelves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        price: parseFloat(form.price),
        features: form.features.split(',').map(f => f.trim()).filter(Boolean),
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to create shelf'); setLoading(false); return }
    setSaved(true)
    setTimeout(() => router.push('/dashboard/host'), 1500)
  }

  if (saved) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <CheckCircle size={56} className="text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Shelf Listed!</h2>
        <p className="text-gray-500 text-sm">Your shelf space is now live on Shelfy.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center"><Store size={18} className="text-white" /></div>
            <span className="font-bold text-xl">Shelfy</span>
          </Link>
          <Link href="/api/auth/signout" className="text-sm text-gray-500 hover:text-gray-700">Logout</Link>
        </div>
      </nav>

      <div className="max-w-xl mx-auto px-4 py-8">
        <Link href="/dashboard/host" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-green-600 transition mb-6">
          <ArrowLeft size={15} /> Back to Dashboard
        </Link>

        <div className="bg-white rounded-2xl border border-gray-100 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">List Shelf Space</h1>
          <p className="text-gray-500 text-sm mb-6">Fill in the details to start earning from your unused shelf space.</p>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Field label="Shelf / Space Name *">
              <input required value={form.name} onChange={set('name')} placeholder="e.g. Main Entrance Shelf A" className={inp} />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="City *">
                <select value={form.city} onChange={set('city')} className={inp}>
                  {CITIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Area / Neighborhood *">
                <input required value={form.area} onChange={set('area')} placeholder="e.g. Kariakoo" className={inp} />
              </Field>
            </div>

            <Field label="Store Category *">
              <select value={form.category} onChange={set('category')} className={inp}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Shelf Size *">
                <input required value={form.size} onChange={set('size')} placeholder="e.g. 2m × 1m" className={inp} />
              </Field>
              <Field label="Price / Month (TZS) *">
                <input required type="number" min="10000" value={form.price} onChange={set('price')} placeholder="80000" className={inp} />
              </Field>
            </div>

            <Field label="Description">
              <textarea
                value={form.description} onChange={set('description')} rows={3}
                placeholder="Describe the shelf — visibility, foot traffic, location in store..."
                className={inp + ' resize-none'}
              />
            </Field>

            <Field label="Features (comma-separated)">
              <input value={form.features} onChange={set('features')} placeholder="CCTV monitored, Air conditioned, High foot traffic" className={inp} />
            </Field>

            {/* Preview */}
            {form.price && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wide">Preview</p>
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {form.category === 'Supermarket' ? '🛒' : form.category === 'Pharmacy' ? '💊' : form.category === 'Hardware Store' ? '🔧' : '🏬'}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-gray-900">{form.name || 'Shelf Name'}</div>
                    <div className="text-xs text-gray-500">{form.area || 'Area'}, {form.city}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm">TZS {parseInt(form.price || '0').toLocaleString()}</div>
                    <div className="text-xs text-gray-400">/month</div>
                  </div>
                </div>
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full bg-green-600 text-white py-3.5 rounded-xl font-bold hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Publishing...</> : <><Plus size={18} /> Publish Shelf Listing</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition bg-white'
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-xs font-semibold text-gray-600 block mb-1.5">{label}</label>{children}</div>
}
