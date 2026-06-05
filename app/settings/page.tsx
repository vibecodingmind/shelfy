'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardNav from '@/components/DashboardNav'
import { User, Lock, Bell, CheckCircle } from 'lucide-react'

export default function SettingsPage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [tab, setTab] = useState<'profile' | 'password' | 'notifications'>('profile')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  const [profile, setProfile] = useState({
    name: session?.user.name ?? '',
    phone: session?.user.phone ?? '',
    businessName: session?.user.businessName ?? '',
    city: '',
  })
  const [passwords, setPasswords] = useState({ current: '', newPw: '', confirm: '' })
  const [pwError, setPwError] = useState('')

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await new Promise(r => setTimeout(r, 800))
    setSaved(true)
    setLoading(false)
    setTimeout(() => setSaved(false), 3000)
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    if (passwords.newPw !== passwords.confirm) { setPwError('Passwords do not match'); return }
    if (passwords.newPw.length < 6) { setPwError('Password must be at least 6 characters'); return }
    setLoading(true)
    await new Promise(r => setTimeout(r, 800))
    setSaved(true)
    setLoading(false)
    setPasswords({ current: '', newPw: '', confirm: '' })
    setTimeout(() => setSaved(false), 3000)
  }

  if (!session) { router.push('/login'); return null }

  const initial = session.user.name?.[0]?.toUpperCase() ?? '?'

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />

      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Account Settings</h1>

        {saved && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <CheckCircle size={18} className="text-green-600" />
            <span className="text-green-800 font-medium text-sm">Changes saved successfully!</span>
          </div>
        )}

        <div className="grid md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1">
            {/* Avatar */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-3 shadow-md">
                {initial}
              </div>
              <div className="font-semibold text-gray-900 text-sm">{session.user.name}</div>
              <div className="text-xs text-gray-400 mt-0.5">{session.user.email}</div>
              <div className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium mt-2 inline-block capitalize">
                {session.user.role.toLowerCase().replace('_', ' ')}
              </div>
            </div>

            {/* Nav */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {[
                { id: 'profile', icon: <User size={15} />, label: 'Profile' },
                { id: 'password', icon: <Lock size={15} />, label: 'Password' },
                { id: 'notifications', icon: <Bell size={15} />, label: 'Notifications' },
              ].map(({ id, icon, label }) => (
                <button
                  key={id}
                  onClick={() => setTab(id as any)}
                  className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm transition border-l-2 ${
                    tab === id ? 'border-green-500 bg-green-50 text-green-700 font-semibold' : 'border-transparent text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="md:col-span-3">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">

              {tab === 'profile' && (
                <>
                  <h2 className="font-bold text-gray-900 mb-5">Profile Information</h2>
                  <form onSubmit={saveProfile} className="space-y-4">
                    <F label="Full Name"><input className={inp} value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} placeholder="Your full name" /></F>
                    <F label="Business / Shop Name"><input className={inp} value={profile.businessName} onChange={e => setProfile({ ...profile, businessName: e.target.value })} placeholder="Your business name" /></F>
                    <F label="Email Address"><input className={inp + ' bg-gray-50 cursor-not-allowed'} value={session.user.email} readOnly /></F>
                    <F label="Phone Number (M-Pesa)"><input className={inp} value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} placeholder="+255 7XX XXX XXX" /></F>
                    <F label="City">
                      <select className={inp} value={profile.city} onChange={e => setProfile({ ...profile, city: e.target.value })}>
                        {['Dar es Salaam','Arusha','Mwanza','Dodoma','Mbeya','Morogoro'].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </F>
                    <button type="submit" disabled={loading} className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-green-700 transition disabled:opacity-60 flex items-center gap-2">
                      {loading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</> : 'Save Changes'}
                    </button>
                  </form>
                </>
              )}

              {tab === 'password' && (
                <>
                  <h2 className="font-bold text-gray-900 mb-5">Change Password</h2>
                  {pwError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">{pwError}</div>}
                  <form onSubmit={savePassword} className="space-y-4">
                    <F label="Current Password"><input type="password" className={inp} value={passwords.current} onChange={e => setPasswords({ ...passwords, current: e.target.value })} placeholder="••••••••" /></F>
                    <F label="New Password"><input type="password" className={inp} value={passwords.newPw} onChange={e => setPasswords({ ...passwords, newPw: e.target.value })} placeholder="Min. 6 characters" /></F>
                    <F label="Confirm New Password"><input type="password" className={inp} value={passwords.confirm} onChange={e => setPasswords({ ...passwords, confirm: e.target.value })} placeholder="Repeat new password" /></F>
                    <button type="submit" disabled={loading} className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-green-700 transition disabled:opacity-60 flex items-center gap-2">
                      {loading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Updating...</> : 'Update Password'}
                    </button>
                  </form>
                </>
              )}

              {tab === 'notifications' && (
                <>
                  <h2 className="font-bold text-gray-900 mb-5">Notification Preferences</h2>
                  <div className="space-y-4">
                    {[
                      { label: 'New booking requests', sub: 'Get notified when a vendor wants to book your shelf', checked: true },
                      { label: 'Booking approved / rejected', sub: 'Get notified when a host responds to your booking', checked: true },
                      { label: 'Field agent reports', sub: 'Get notified when a new shelf report is available', checked: true },
                      { label: 'Restock alerts', sub: 'Get notified when your products are running low', checked: true },
                      { label: 'Payment confirmations', sub: 'Get notified when payments are processed', checked: true },
                      { label: 'Monthly payout processed', sub: 'Get notified when your payout is sent', checked: false },
                    ].map(({ label, sub, checked }) => (
                      <label key={label} className="flex items-start gap-4 cursor-pointer group">
                        <div className="relative mt-0.5">
                          <input type="checkbox" defaultChecked={checked} className="sr-only peer" />
                          <div className="w-10 h-6 bg-gray-200 peer-checked:bg-green-600 rounded-full transition" />
                          <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition peer-checked:translate-x-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-800">{label}</div>
                          <div className="text-xs text-gray-400">{sub}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                  <button className="mt-6 bg-green-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-green-700 transition">
                    Save Preferences
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition'
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-xs font-semibold text-gray-600 block mb-1.5">{label}</label>{children}</div>
}
