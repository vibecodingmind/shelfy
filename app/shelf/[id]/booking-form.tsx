'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, CheckCircle } from 'lucide-react'

interface BookingFormProps {
  shelfId: string
  shelfPrice: number
  shelfName: string
  userId: string
}

export default function BookingForm({ shelfId, shelfPrice, shelfName }: BookingFormProps) {
  const router = useRouter()
  const [step, setStep] = useState<'form' | 'paying' | 'done'>('form')
  const [form, setForm] = useState({
    productName: '',
    productCategory: '',
    duration: 1,
    addOnMonitoring: false,
    addOnLogistics: false,
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const subtotal = shelfPrice * form.duration
    + (form.addOnMonitoring ? 30000 * form.duration : 0)
    + (form.addOnLogistics ? 15000 : 0)
  const platformFee = Math.round(subtotal * 0.1)
  const total = subtotal + platformFee

  const CATEGORIES = ['Food & Beverages', 'Health & Beauty', 'Household Items', 'Electronics', 'Clothing & Fashion', 'Agriculture', 'Other']

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const startDate = new Date()
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + form.duration)

    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shelfId,
        startDate,
        endDate,
        productName: form.productName,
        productCategory: form.productCategory,
        addOnMonitoring: form.addOnMonitoring,
        addOnLogistics: form.addOnLogistics,
        notes: form.notes,
      }),
    })

    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to create booking'); setLoading(false); return }

    // Redirect to PesaPal
    setStep('paying')
    const payRes = await fetch('/api/payments/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: data.booking.id }),
    })
    const payData = await payRes.json()

    if (payData.redirectUrl) {
      window.location.href = payData.redirectUrl
    } else {
      // If no PesaPal keys yet, show success
      setStep('done')
      setTimeout(() => router.push('/dashboard/vendor?payment=success'), 2000)
    }
    setLoading(false)
  }

  if (step === 'paying') return (
    <div className="text-center py-6">
      <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-3" />
      <p className="text-sm text-gray-600 font-medium">Redirecting to PesaPal...</p>
    </div>
  )

  if (step === 'done') return (
    <div className="text-center py-6">
      <CheckCircle size={40} className="text-green-500 mx-auto mb-3" />
      <p className="text-sm text-gray-700 font-medium">Booking submitted!</p>
      <p className="text-xs text-gray-400 mt-1">Redirecting to dashboard...</p>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3">{error}</div>}

      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1.5">Your Product Name *</label>
        <input
          required
          value={form.productName}
          onChange={e => setForm({ ...form, productName: e.target.value })}
          placeholder="e.g. Azam Juice, Bella Cream..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1.5">Product Category</label>
        <select
          value={form.productCategory}
          onChange={e => setForm({ ...form, productCategory: e.target.value })}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500 bg-white"
        >
          <option value="">Select category</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1.5">Duration</label>
        <select
          value={form.duration}
          onChange={e => setForm({ ...form, duration: parseInt(e.target.value) })}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500 bg-white"
        >
          {[1,2,3,6,12].map(m => <option key={m} value={m}>{m} month{m > 1 ? 's' : ''}</option>)}
        </select>
      </div>

      {/* Add-ons */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-600 block">Add-on Services</label>
        <label className="flex items-start gap-3 p-3 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50 transition">
          <input type="checkbox" className="mt-0.5" checked={form.addOnMonitoring} onChange={e => setForm({ ...form, addOnMonitoring: e.target.checked })} />
          <div>
            <div className="text-sm font-medium text-gray-800">📊 Shelf Monitoring</div>
            <div className="text-xs text-gray-400">Weekly field visit + AI report · +TZS 30,000/mo</div>
          </div>
        </label>
        <label className="flex items-start gap-3 p-3 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50 transition">
          <input type="checkbox" className="mt-0.5" checked={form.addOnLogistics} onChange={e => setForm({ ...form, addOnLogistics: e.target.checked })} />
          <div>
            <div className="text-sm font-medium text-gray-800">🚚 Logistics Service</div>
            <div className="text-xs text-gray-400">Bus terminal pickup & delivery · +TZS 15,000</div>
          </div>
        </label>
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1.5">Notes (optional)</label>
        <textarea
          value={form.notes}
          onChange={e => setForm({ ...form, notes: e.target.value })}
          placeholder="Any special requirements..."
          rows={2}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500 resize-none transition"
        />
      </div>

      {/* Price breakdown */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Shelf rental ({form.duration}mo)</span>
          <span>TZS {(shelfPrice * form.duration).toLocaleString()}</span>
        </div>
        {form.addOnMonitoring && (
          <div className="flex justify-between text-gray-600"><span>Monitoring</span><span>TZS {(30000 * form.duration).toLocaleString()}</span></div>
        )}
        {form.addOnLogistics && (
          <div className="flex justify-between text-gray-600"><span>Logistics</span><span>TZS 15,000</span></div>
        )}
        <div className="flex justify-between text-gray-600"><span>Platform fee (10%)</span><span>TZS {platformFee.toLocaleString()}</span></div>
        <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-200">
          <span>Total</span><span>TZS {total.toLocaleString()}</span>
        </div>
      </div>

      <button type="submit" disabled={loading} className="w-full bg-green-600 text-white py-3.5 rounded-xl font-bold hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-60">
        {loading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</> : <><Shield size={16} /> Book & Pay via PesaPal</>}
      </button>
      <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1"><Shield size={10} /> Secured by PesaPal · M-Pesa · Tigo Pesa · Airtel Money</p>
    </form>
  )
}
