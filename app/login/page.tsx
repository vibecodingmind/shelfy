'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Store, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router       = useRouter()
  const params       = useSearchParams()
  const [form, setForm]     = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [showPw, setShowPw] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')

    const res = await signIn('credentials', {
      email: form.email, password: form.password, redirect: false,
    })

    if (res?.error) {
      setError('Invalid email or password')
      setLoading(false)
    } else {
      // Redirect based on role — server will handle it via session
      router.push(params.get('callbackUrl') ?? '/dashboard/vendor')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center"><Store size={22} className="text-white" /></div>
            <span className="font-bold text-2xl">Shelfy</span>
          </Link>
          <h2 className="text-xl font-bold">Welcome back</h2>
          <p className="text-gray-500 text-sm mt-1">Login to your Shelfy account</p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</div>}
        {params.get('payment') === 'success' && <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3 mb-4">✅ Payment successful! Login to see your booking.</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email Address</label>
            <input type="email" required placeholder="you@company.co.tz" className="input"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} required placeholder="••••••••" className="input pr-10"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Logging in...</> : 'Login to Shelfy'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account?{' '}
          <Link href="/register" className="text-green-600 font-semibold hover:underline">Sign up free</Link>
        </p>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center mb-3">Quick access (demo)</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Vendor', email: 'amina@azamfoods.co.tz' },
              { label: 'Host', email: 'juma@nakumatt.co.tz' },
              { label: 'Admin', email: 'admin@shelfy.co.tz' },
              { label: 'Field Agent', email: 'agent@shelfy.co.tz' },
            ].map(({ label, email }) => (
              <button key={label} onClick={() => setForm({ email, password: label === 'Admin' ? 'admin123' : 'shelfy123' })}
                className="text-xs border border-gray-200 rounded-lg py-1.5 px-2 hover:bg-gray-50 transition text-gray-600">
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
