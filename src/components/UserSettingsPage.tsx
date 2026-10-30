import React, { useEffect, useState } from 'react';
import { ArrowLeft, UserRound, Lock, Bell } from 'lucide-react';
import { User, VendorProfile, HostProfile } from '../types/index.js';
import { api } from '../lib/api.js';

type SettingsTab = 'profile' | 'security' | 'notifications';

interface UserSettingsPageProps {
  user: User;
  vendorProfile?: VendorProfile | null;
  hostProfile?: HostProfile | null;
  onUpdated: () => void;
  onBack: () => void;
}

export const UserSettingsPage: React.FC<UserSettingsPageProps> = ({
  user,
  vendorProfile,
  hostProfile,
  onUpdated,
  onBack,
}) => {
  const [tab, setTab] = useState<SettingsTab>('profile');
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [businessName, setBusinessName] = useState(vendorProfile?.businessName || hostProfile?.businessName || '');
  const [payoutPhone, setPayoutPhone] = useState(hostProfile?.payoutPhone || hostProfile?.phone || '');
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [securityMsg, setSecurityMsg] = useState('');

  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [notifMsg, setNotifMsg] = useState('');

  useEffect(() => {
    setName(user.name);
    setPhone(user.phone || '');
    setBusinessName(vendorProfile?.businessName || hostProfile?.businessName || '');
    setPayoutPhone(hostProfile?.payoutPhone || hostProfile?.phone || '');
  }, [user, vendorProfile, hostProfile]);

  useEffect(() => {
    if (tab !== 'notifications') return;
    void api.getNotificationPreferences().then((res) => {
      if (res.success && res.data) setPrefs(res.data);
    });
  }, [tab]);

  const saveProfile = async () => {
    setSaving(true);
    setProfileMsg('');
    const body: Record<string, unknown> = { name, phone };
    if (user.role === 'VENDOR') {
      body.vendorProfile = { businessName };
    }
    if (user.role === 'HOST') {
      body.hostProfile = { businessName, payoutPhone, phone: phone || hostProfile?.phone };
    }
    const res = await api.updateMe(body);
    setSaving(false);
    if (res.success) {
      setProfileMsg('Profile saved.');
      onUpdated();
    } else {
      setProfileMsg(res.error?.message || 'Could not save profile.');
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityMsg('');
    const res = await api.changePassword(currentPassword, newPassword);
    if (res.success) {
      setSecurityMsg('Password updated.');
      setCurrentPassword('');
      setNewPassword('');
    } else {
      setSecurityMsg(res.error?.message || 'Could not change password.');
    }
  };

  const savePrefs = async () => {
    const res = await api.updateNotificationPreferences(prefs);
    setNotifMsg(res.success ? 'Notification preferences saved.' : res.error?.message || 'Save failed.');
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: 'profile', label: 'Profile', icon: UserRound },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 md:py-10 pb-24 md:pb-10">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--shelfy-muted)] hover:text-[var(--shelfy-fg)] mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <h1 className="text-2xl font-extrabold text-[var(--shelfy-fg)] mb-4">Account settings</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border ${
                tab === t.id
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                  : 'border-[var(--shelfy-border)] text-[var(--shelfy-muted)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-[var(--shelfy-border)] bg-[var(--shelfy-card-bg)] p-5 space-y-4">
        {tab === 'profile' && (
          <>
            <div>
              <label className="text-xs font-semibold text-[var(--shelfy-muted)] block mb-1">Email</label>
              <input value={user.email} disabled className="w-full opacity-60 bg-[var(--shelfy-elevated)] border border-[var(--shelfy-border)] rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--shelfy-muted)] block mb-1">Display name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[var(--shelfy-input-bg)] border border-[var(--shelfy-border)] rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--shelfy-muted)] block mb-1">Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-[var(--shelfy-input-bg)] border border-[var(--shelfy-border)] rounded-xl px-3 py-2 text-sm"
              />
            </div>
            {(user.role === 'VENDOR' || user.role === 'HOST') && (
              <div>
                <label className="text-xs font-semibold text-[var(--shelfy-muted)] block mb-1">Business name</label>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full bg-[var(--shelfy-input-bg)] border border-[var(--shelfy-border)] rounded-xl px-3 py-2 text-sm"
                />
              </div>
            )}
            {user.role === 'HOST' && (
              <div>
                <label className="text-xs font-semibold text-[var(--shelfy-muted)] block mb-1">Payout mobile money number</label>
                <input
                  value={payoutPhone}
                  onChange={(e) => setPayoutPhone(e.target.value)}
                  placeholder="0754 123 456"
                  className="w-full bg-[var(--shelfy-input-bg)] border border-[var(--shelfy-border)] rounded-xl px-3 py-2 text-sm"
                />
                <p className="text-[11px] text-[var(--shelfy-muted)] mt-1">Used when admins process host withdrawals.</p>
              </div>
            )}
            <button
              type="button"
              disabled={saving}
              onClick={saveProfile}
              className="w-full py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm disabled:opacity-50"
            >
              Save profile
            </button>
            {profileMsg && <p className="text-xs text-emerald-400">{profileMsg}</p>}
          </>
        )}

        {tab === 'security' && (
          <form onSubmit={savePassword} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[var(--shelfy-muted)] block mb-1">Current password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-[var(--shelfy-input-bg)] border border-[var(--shelfy-border)] rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--shelfy-muted)] block mb-1">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-[var(--shelfy-input-bg)] border border-[var(--shelfy-border)] rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <button type="submit" className="w-full py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm">
              Update password
            </button>
            {securityMsg && <p className="text-xs text-slate-400">{securityMsg}</p>}
          </form>
        )}

        {tab === 'notifications' && (
          <>
            {[
              ['emailEnabled', 'Email notifications'],
              ['smsEnabled', 'SMS notifications'],
              ['bookingAlerts', 'Booking alerts'],
              ['expiryReminders', 'Expiry reminders'],
              ['savedSearchAlerts', 'Saved search alerts'],
              ['marketingEmails', 'Marketing emails'],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between text-sm">
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={Boolean(prefs[key])}
                  onChange={(e) => setPrefs((p) => ({ ...p, [key]: e.target.checked }))}
                  className="accent-emerald-500"
                />
              </label>
            ))}
            <button type="button" onClick={savePrefs} className="w-full py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm">
              Save preferences
            </button>
            {notifMsg && <p className="text-xs text-emerald-400">{notifMsg}</p>}
          </>
        )}
      </div>
    </main>
  );
};
