'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Store, Camera, CheckCircle, MapPin, Package, Upload } from 'lucide-react'

export default function FieldAgentDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [reports, setReports]   = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess]   = useState(false)

  const [form, setForm] = useState({
    shelfId: '', bookingId: '', stockBefore: '', stockAfter: '',
    condition: 'GOOD', agentNotes: '', photo: null as File | null,
  })

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (session?.user.role !== 'FIELD_AGENT' && status === 'authenticated') router.push('/dashboard/vendor')
  }, [session, status])

  useEffect(() => {
    fetch('/api/reports').then(r => r.json()).then(d => { setReports(d.reports ?? []); setLoading(false) })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => { if (v !== null) fd.append(k, v as any) })
    const res = await fetch('/api/reports', { method: 'POST', body: fd })
    if (res.ok) { setSuccess(true); setReports(prev => [await res.json().then((d:any) => d.report), ...prev]) }
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2"><div className="w-7 h-7 bg-green-600 rounded-lg flex items-center justify-center"><Store size={15} className="text-white" /></div><span className="font-bold">Shelfy</span><span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Field Agent</span></Link>
          <Link href="/api/auth/signout" className="text-sm text-gray-500">Logout</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="page-header">
          <div><h1>Field Agent Dashboard</h1><p className="text-gray-500 text-sm mt-1">Submit shelf visit reports</p></div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Submit Report */}
          <div className="card p-6">
            <h3 className="flex items-center gap-2 mb-5"><Camera size={18} className="text-green-600" /> Submit Visit Report</h3>

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 flex items-center gap-2">
                <CheckCircle size={18} className="text-green-600" />
                <span className="text-green-800 text-sm font-medium">Report submitted! AI analysis complete. Vendor notified.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Booking ID</label>
                <input className="input" required placeholder="booking-001" value={form.bookingId} onChange={e => setForm({...form, bookingId: e.target.value})} />
              </div>
              <div>
                <label className="label">Shelf ID</label>
                <input className="input" required placeholder="shelf-001" value={form.shelfId} onChange={e => setForm({...form, shelfId: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Stock Before Visit</label>
                  <input type="number" className="input" required placeholder="48" value={form.stockBefore} onChange={e => setForm({...form, stockBefore: e.target.value})} />
                </div>
                <div>
                  <label className="label">Stock After Visit</label>
                  <input type="number" className="input" required placeholder="12" value={form.stockAfter} onChange={e => setForm({...form, stockAfter: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="label">Shelf Condition</label>
                <select className="input" value={form.condition} onChange={e => setForm({...form, condition: e.target.value})}>
                  <option value="GOOD">Good — Clean and well-stocked</option>
                  <option value="NEEDS_ATTENTION">Needs Attention — Minor issues</option>
                  <option value="CRITICAL">Critical — Urgent action needed</option>
                </select>
              </div>
              <div>
                <label className="label">Agent Notes</label>
                <textarea className="input resize-none" rows={2} placeholder="Anything unusual? Vendor needs to know?" value={form.agentNotes} onChange={e => setForm({...form, agentNotes: e.target.value})} />
              </div>
              <div>
                <label className="label">Shelf Photo (triggers AI analysis)</label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-green-400 transition">
                  <Upload size={24} className="text-gray-300 mb-2" />
                  <span className="text-sm text-gray-500">{form.photo ? form.photo.name : 'Tap to upload photo'}</span>
                  <input type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={e => setForm({...form, photo: e.target.files?.[0] ?? null})} />
                </label>
              </div>
              <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
                {submitting ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{form.photo ? 'Uploading & Analyzing...' : 'Submitting...'}</> : <><Camera size={16} /> Submit Report</>}
              </button>
              {form.photo && <p className="text-xs text-green-600 text-center flex items-center justify-center gap-1">✨ AI will analyze this photo automatically</p>}
            </form>
          </div>

          {/* Recent Reports */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100"><h3>My Recent Reports</h3></div>
            {loading ? (
              <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
            ) : reports.length === 0 ? (
              <div className="p-8 text-center"><Package size={32} className="text-gray-200 mx-auto mb-3" /><p className="text-gray-500 text-sm">No reports submitted yet.</p></div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
                {reports.map((r: any) => (
                  <div key={r.id} className="px-5 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1 text-xs text-gray-500"><MapPin size={10} />{r.shelf?.area ?? 'N/A'}</div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.condition==='GOOD'?'badge-green':r.condition==='NEEDS_ATTENTION'?'badge-amber':'badge-red'}`}>{r.condition?.replace('_',' ')}</span>
                    </div>
                    <div className="text-sm font-medium">{r.booking?.productName}</div>
                    <div className="text-xs text-gray-500 mt-1">{r.unitsSold} units sold · Stock: {r.stockBefore} → {r.stockAfter}</div>
                    {r.aiAnalysis && <div className="mt-2 text-xs bg-green-50 text-green-800 rounded-lg p-2">✨ {r.aiAnalysis.slice(0, 100)}...</div>}
                    <div className="text-xs text-gray-400 mt-1">{new Date(r.visitDate).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
