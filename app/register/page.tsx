'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { Store, Package, Shield } from 'lucide-react'

export default function RegisterPage() {
  const router  = useRouter()
  const params  = useSearchParams()
  const defaultRole = (params.get('role') ?? 'vendor').toUpperCase()

  const [role, setRole]     = useState(defaultRole)
  const [form, setForm]     = useState({ name: '', email: '', phone: '', password: '', businessName: '', city: 'Dar es Salaam' })
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const CITIES = ['Dar es Salaam','Arusha','Mwanza','Dodoma','Mbeya','Morogoro']

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, role }),
    })
    const data = await res.json()

    if (!res.ok) { setError(data.error ?? 'Registration failed'); setLoading(false); return }

    // Auto-login
    await signIn('credentials', { email: form.email, password: form.password, redirect: false })
    router.push(role === 'HOST' ? '/dashboard/host' : '/dashboard/vendor')
  }

  const roles = [
    { id: 'VENDOR', Icon: Package, label: 'Vendor', sub: 'I sell products' },
    { id: 'HOST',   Icon: Store,   label: 'Host',   sub: 'I own a shop' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center"><Store size={22} className="text-white" /></div>
            <span className="font-bold text-2xl">Shelfy</span>
          </Link>
          <h2 className="text-xl font-bold">Create your account</h2>
          <p className="text-gray-500 text-sm mt-1">Join Tanzania's shelf space marketplace</p>
        </div>

        {/* Role Selector */}
        <div className="grid grid-cols-2 gap-2 mb-6 bg-gray-50 p-1 rounded-xl">
          {roles.map(({ id, Icon, label, sub }) => (
            <button key={id} onClick={() => setRole(id)}
              className={`flex flex-col items-center gap-1 py-3 rounded-lg transition ${role === id ? 'bg-white shadow text-green-700' : 'text-gray-400 hover:text-gray-600'}`}>
              <Icon size={18} />
              <span className="text-sm font-semibold">{label}</span>
              <span className="text-xs opacity-70">{sub}</span>
            </button>
          ))}
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input className="input" required placeholder="Amina Salim" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div>
            <label className="label">Business / Shop Name</label>
            <input className="input" placeholder="Azam Foods Ltd" value={form.businessName} onChange={e => setForm({...form, businessName: e.target.value})} />
          </div>
          <div>
            <label className="label">Email Address</label>
            <input type="email" className="input" required placeholder="you@company.co.tz" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          </div>
          <div>
            <label className="label">Phone (M-Pesa number)</label>
            <input type="tel" className="input" placeholder="+255 7XX XXX XXX" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
          </div>
          <div>
            <label className="label">City</label>
            <select className="input" value={form.city} onChange={e => setForm({...form, city: e.target.value})}>
              {CITIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" className="input" required placeholder="Min. 8 characters" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Creating account...</> : 'Create Account'}
          </button>
        </form>

        <div className="flex items-center gap-2 mt-5 text-xs text-gray-400">
          <Shield size={12} /> Your data is protected and never shared.
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-green-600 font-semibold hover:underline">Login</Link>
        </p>
      </div>
    </div>
  )
}
