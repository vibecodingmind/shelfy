import React, { useEffect, useState } from 'react';
import { ArrowLeft, UserRound, Lock, Bell, ImagePlus } from 'lucide-react';
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

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      reject(new Error('Use a JPEG, PNG, or WebP image.'));
      return;
    }
    if (file.size > 2_000_000) {
      reject(new Error('Image must be under 2 MB.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });
}

async function storedImageUrl(value: string, kind: string): Promise<string> {
  if (!value) return '';
  if (!value.startsWith('data:')) return value;
  const uploaded = await api.uploadImage(value, kind);
  if (!uploaded.success || !uploaded.data?.url) {
    throw new Error(uploaded.error?.message || 'Upload failed.');
  }
  return uploaded.data.url;
}

export const UserSettingsPage: React.FC<UserSettingsPageProps> = ({
  user,
  vendorProfile,
  hostProfile,
  onUpdated,
  onBack,
}) => {
  const business = user.role === 'VENDOR' || user.role === 'HOST';
  const [tab, setTab] = useState<SettingsTab>('profile');
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [avatarPreview, setAvatarPreview] = useState(user.avatarUrl || '');
  const [businessName, setBusinessName] = useState(vendorProfile?.businessName || hostProfile?.businessName || '');
  const [description, setDescription] = useState(vendorProfile?.description || hostProfile?.description || '');
  const [businessRegistration, setBusinessRegistration] = useState(
    vendorProfile?.businessRegistration || hostProfile?.businessRegistration || ''
  );
  const [category, setCategory] = useState(vendorProfile?.category || '');
  const [address, setAddress] = useState(vendorProfile?.address || '');
  const [city, setCity] = useState(vendorProfile?.city || '');
  const [region, setRegion] = useState(vendorProfile?.region || '');
  const [logoPreview, setLogoPreview] = useState(vendorProfile?.logoUrl || hostProfile?.logoUrl || '');
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
    setAvatarPreview(user.avatarUrl || '');
    setBusinessName(vendorProfile?.businessName || hostProfile?.businessName || '');
    setDescription(vendorProfile?.description || hostProfile?.description || '');
    setBusinessRegistration(vendorProfile?.businessRegistration || hostProfile?.businessRegistration || '');
    setCategory(vendorProfile?.category || '');
    setAddress(vendorProfile?.address || '');
    setCity(vendorProfile?.city || '');
    setRegion(vendorProfile?.region || '');
    setLogoPreview(vendorProfile?.logoUrl || hostProfile?.logoUrl || '');
    setPayoutPhone(hostProfile?.payoutPhone || hostProfile?.phone || '');
  }, [user, vendorProfile, hostProfile]);

  useEffect(() => {
    if (tab !== 'notifications') return;
    void api.getNotificationPreferences().then((res) => {
      if (res.success && res.data) setPrefs(res.data);
    });
  }, [tab]);

  const checklist = [
    { label: 'Display name', done: Boolean(name.trim()) },
    { label: 'Phone', done: Boolean(phone.trim()) },
    { label: 'Profile photo', done: Boolean(avatarPreview) },
    ...(business
      ? [
          { label: 'Business name', done: Boolean(businessName.trim()) },
          { label: 'Business description', done: Boolean(description.trim()) },
          { label: 'Business logo', done: Boolean(logoPreview) },
        ]
      : []),
  ];

  const onPickAvatar = async (file?: File) => {
    if (!file) return;
    setProfileMsg('');
    try {
      setAvatarPreview(await readImageFile(file));
    } catch (err) {
      setProfileMsg(err instanceof Error ? err.message : 'Could not use that image.');
    }
  };

  const onPickLogo = async (file?: File) => {
    if (!file) return;
    setProfileMsg('');
    try {
      setLogoPreview(await readImageFile(file));
    } catch (err) {
      setProfileMsg(err instanceof Error ? err.message : 'Could not use that image.');
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    setProfileMsg('');
    try {
      const avatarUrl = await storedImageUrl(avatarPreview, 'avatar');
      const body: Record<string, unknown> = { name, phone, avatarUrl };
      if (user.role === 'VENDOR') {
        body.vendorProfile = {
          businessName,
          description,
          businessRegistration,
          category,
          address,
          city,
          region,
          logoUrl: await storedImageUrl(logoPreview, 'logo'),
        };
      }
      if (user.role === 'HOST') {
        body.hostProfile = {
          businessName,
          description,
          businessRegistration,
          payoutPhone,
          phone: phone || hostProfile?.phone,
          logoUrl: await storedImageUrl(logoPreview, 'logo'),
        };
      }
      const res = await api.updateMe(body);
      if (res.success) {
        setProfileMsg('Profile saved.');
        onUpdated();
      } else {
        setProfileMsg(res.error?.message || 'Could not save profile.');
      }
    } catch (err) {
      setProfileMsg(err instanceof Error ? err.message : 'Could not save profile.');
    }
    setSaving(false);
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

  const tabs: { id: SettingsTab; label: string; icon: React.ElementType } = [
    { id: 'profile', label: 'Profile', icon: UserRound },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  const fieldClass = 'w-full bg-[var(--shelfy-input-bg)] border border-[var(--shelfy-border)] rounded-xl px-3 py-2 text-sm';

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

      <h1 className="text-2xl font-extrabold text-[var(--shelfy-fg)] mb-1">Account settings</h1>
      <p className="text-xs text-[var(--shelfy-muted)] mb-4">
        {user.role === 'ADMIN' ? 'Admin' : user.role === 'HOST' ? 'Space owner' : user.role === 'FIELD_AGENT' ? 'Field agent' : 'Vendor'} account. Role changes are not available here.
      </p>

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
            <div className="rounded-xl border border-[var(--shelfy-border)] p-3 text-xs">
              <div className="font-bold mb-2">Profile checklist</div>
              <ul className="space-y-1">
                {checklist.map((item) => (
                  <li key={item.label} className={item.done ? 'text-emerald-400' : 'text-[var(--shelfy-muted)]'}>
                    {item.done ? 'Done' : 'Missing'}: {item.label}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center gap-4">
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="w-16 h-16 rounded-full object-cover border border-[var(--shelfy-border)]" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[var(--shelfy-elevated)] border border-[var(--shelfy-border)] flex items-center justify-center text-xs text-[var(--shelfy-muted)]">
                  No photo
                </div>
              )}
              <div className="space-y-2">
                <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer">
                  <ImagePlus className="w-4 h-4" />
                  {avatarPreview ? 'Replace photo' : 'Upload photo'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => void onPickAvatar(e.target.files?.[0])}
                  />
                </label>
                {avatarPreview && (
                  <button type="button" onClick={() => setAvatarPreview('')} className="block text-xs text-rose-400 font-semibold">
                    Remove photo
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--shelfy-muted)] block mb-1">Email</label>
              <input value={user.email} disabled className={`${fieldClass} opacity-60`} />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--shelfy-muted)] block mb-1">Display name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--shelfy-muted)] block mb-1">Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={fieldClass} />
            </div>

            {business && (
              <>
                <div className="pt-2 border-t border-[var(--shelfy-border)]">
                  <div className="text-sm font-bold mb-2">Business</div>
                  <div className="flex items-center gap-4 mb-3">
                    {logoPreview ? (
                      <img src={logoPreview} alt="" className="w-16 h-16 rounded-xl object-cover border border-[var(--shelfy-border)]" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-[var(--shelfy-elevated)] border border-[var(--shelfy-border)] flex items-center justify-center text-[10px] text-center text-[var(--shelfy-muted)] px-1">
                        No logo
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer">
                        <ImagePlus className="w-4 h-4" />
                        {logoPreview ? 'Replace logo' : 'Upload logo'}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => void onPickLogo(e.target.files?.[0])}
                        />
                      </label>
                      {logoPreview && (
                        <button type="button" onClick={() => setLogoPreview('')} className="block text-xs text-rose-400 font-semibold">
                          Remove logo
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--shelfy-muted)] block mb-1">Business name</label>
                  <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className={fieldClass} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--shelfy-muted)] block mb-1">Description</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={`${fieldClass} min-h-20`} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--shelfy-muted)] block mb-1">Registration number</label>
                  <input value={businessRegistration} onChange={(e) => setBusinessRegistration(e.target.value)} className={fieldClass} />
                </div>
              </>
            )}

            {user.role === 'VENDOR' && (
              <>
                <div>
                  <label className="text-xs font-semibold text-[var(--shelfy-muted)] block mb-1">Category</label>
                  <input value={category} onChange={(e) => setCategory(e.target.value)} className={fieldClass} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--shelfy-muted)] block mb-1">Address</label>
                  <input value={address} onChange={(e) => setAddress(e.target.value)} className={fieldClass} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[var(--shelfy-muted)] block mb-1">City</label>
                    <input value={city} onChange={(e) => setCity(e.target.value)} className={fieldClass} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[var(--shelfy-muted)] block mb-1">Region</label>
                    <input value={region} onChange={(e) => setRegion(e.target.value)} className={fieldClass} />
                  </div>
                </div>
              </>
            )}

            {user.role === 'HOST' && (
              <div>
                <label className="text-xs font-semibold text-[var(--shelfy-muted)] block mb-1">Payout mobile money number</label>
                <input
                  value={payoutPhone}
                  onChange={(e) => setPayoutPhone(e.target.value)}
                  placeholder="0754 123 456"
                  className={fieldClass}
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
              {saving ? 'Saving…' : 'Save profile'}
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
                className={fieldClass}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--shelfy-muted)] block mb-1">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={fieldClass}
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
