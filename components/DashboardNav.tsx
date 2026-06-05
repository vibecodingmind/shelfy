'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import {
  Store, LayoutDashboard, Settings, LogOut,
  ChevronDown, Bell, Package, Shield
} from 'lucide-react'

function getDashboardLink(role: string) {
  if (role === 'HOST') return '/dashboard/host'
  if (role === 'ADMIN') return '/dashboard/admin'
  if (role === 'FIELD_AGENT') return '/dashboard/field-agent'
  return '/dashboard/vendor'
}

function getRoleBadge(role: string) {
  const map: Record<string, { label: string; color: string }> = {
    VENDOR: { label: 'Vendor', color: 'bg-green-100 text-green-700' },
    HOST: { label: 'Host', color: 'bg-blue-100 text-blue-700' },
    ADMIN: { label: 'Admin', color: 'bg-purple-100 text-purple-700' },
    FIELD_AGENT: { label: 'Field Agent', color: 'bg-amber-100 text-amber-700' },
  }
  return map[role] ?? { label: role, color: 'bg-gray-100 text-gray-700' }
}

export default function DashboardNav() {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (!session) return null

  const badge = getRoleBadge(session.user.role)
  const dashboardLink = getDashboardLink(session.user.role)
  const initial = session.user.name?.[0]?.toUpperCase() ?? '?'

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href={dashboardLink} className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
            <Store size={18} className="text-white" />
          </div>
          <span className="font-bold text-xl text-gray-900">Shelfy</span>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium hidden sm:block">TZ</span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
            <Bell size={18} />
          </button>

          {/* Avatar dropdown */}
          <div className="relative" ref={ref}>
            <button
              onClick={() => setOpen(!open)}
              className="flex items-center gap-2 hover:bg-gray-50 rounded-xl px-2 py-1.5 transition"
            >
              {/* Avatar circle */}
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm">
                {initial}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-sm font-semibold text-gray-800 leading-tight">{session.user.name}</div>
                <div className={`text-xs px-1.5 py-0.5 rounded-full font-medium inline-block ${badge.color}`}>{badge.label}</div>
              </div>
              <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown menu */}
            {open && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-lg border border-gray-100 py-2 z-50">
                {/* User info */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="font-semibold text-gray-900 text-sm">{session.user.name}</div>
                  <div className="text-xs text-gray-400 truncate">{session.user.email}</div>
                  {session.user.businessName && (
                    <div className="text-xs text-gray-500 mt-0.5">{session.user.businessName}</div>
                  )}
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <Link href={dashboardLink} onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
                    <LayoutDashboard size={16} className="text-gray-400" /> Dashboard
                  </Link>

                  {session.user.role === 'VENDOR' && (
                    <Link href="/browse" onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
                      <Package size={16} className="text-gray-400" /> Browse Shelves
                    </Link>
                  )}

                  {session.user.role === 'HOST' && (
                    <Link href="/dashboard/host/add-shelf" onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
                      <Store size={16} className="text-gray-400" /> Add Shelf Space
                    </Link>
                  )}

                  {session.user.role === 'ADMIN' && (
                    <Link href="/dashboard/admin" onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
                      <Shield size={16} className="text-gray-400" /> Admin Panel
                    </Link>
                  )}

                  <Link href="/settings" onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
                    <Settings size={16} className="text-gray-400" /> Settings
                  </Link>
                </div>

                {/* Logout */}
                <div className="border-t border-gray-100 pt-1">
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition w-full"
                  >
                    <LogOut size={16} /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
