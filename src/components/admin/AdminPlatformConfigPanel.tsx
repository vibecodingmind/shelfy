import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Save, Mail, MapPin, LogIn, Cloud, Sparkles, MessageSquare, Globe, Share2 } from 'lucide-react';
import { PlatformIntegrationSettings } from '../../types/index.js';
import { api } from '../../lib/api.js';

type ConfigTab = 'general' | 'email' | 'maps' | 'oauth' | 'storage' | 'ai' | 'sms' | 'social';

const inputClass =
  'w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600';

export const AdminPlatformConfigPanel: React.FC<{ onSaved: (msg: string) => void }> = ({ onSaved }) => {
  const [tab, setTab] = useState<ConfigTab>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<any>(null);

  const [platformName, setPlatformName] = useState('Shelfy');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [appUrl, setAppUrl] = useState('');
  const [timeZone, setTimeZone] = useState('Africa/Dar_es_Salaam');
  const [vendorReg, setVendorReg] = useState(true);
  const [hostReg, setHostReg] = useState(true);

  const [integrations, setIntegrations] = useState<PlatformIntegrationSettings>({});
  const [secrets, setSecrets] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.getAdminPlatformConfig();
    if (res.success && res.data) {
      setConfig(res.data);
      const s = res.data.settings || {};
      setPlatformName(s.platformName || 'Shelfy');
      setSupportEmail(s.supportEmail || '');
      setSupportPhone(s.supportPhone || '');
      setTimeZone(s.timeZone || 'Africa/Dar_es_Salaam');
      setVendorReg(s.vendorRegistrationEnabled !== false);
      setHostReg(s.hostRegistrationEnabled !== false);
      setIntegrations(res.data.integrations || {});
      setAppUrl(res.data.integrations?.appUrl || res.data.appUrl || '');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patchInt = (patch: Partial<PlatformIntegrationSettings>) => {
    setIntegrations((prev) => ({ ...prev, ...patch }));
  };

  const save = async () => {
    setSaving(true);
    const res = await api.updateAdminPlatformConfig({
      settings: {
        platformName,
        supportEmail,
        supportPhone,
        timeZone,
        vendorRegistrationEnabled: vendorReg,
        hostRegistrationEnabled: hostReg,
      },
      integrations: {
        ...integrations,
        appUrl: appUrl.trim() || undefined,
      },
      secrets: Object.fromEntries(Object.entries(secrets).filter(([, v]) => v.trim())),
    });
    setSaving(false);
    if (res.success) {
      setSecrets({});
      onSaved('Platform configuration saved.');
      void load();
    } else {
      onSaved(res.error?.message || 'Save failed.');
    }
  };

  const testEmail = async () => {
    const res = await api.testAdminPlatformEmail(supportEmail || undefined);
    onSaved(res.success ? 'Test email sent.' : res.error?.message || 'Test failed.');
  };

  const tabs: { id: ConfigTab; label: string; icon: React.ElementType }[] = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'maps', label: 'Maps', icon: MapPin },
    { id: 'oauth', label: 'Social login', icon: LogIn },
    { id: 'storage', label: 'Storage', icon: Cloud },
    { id: 'ai', label: 'AI (Gemini)', icon: Sparkles },
    { id: 'sms', label: 'SMS', icon: MessageSquare },
    { id: 'social', label: 'Social links', icon: Share2 },
  ];

  if (loading && !config) {
    return <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />;
  }

  const meta = config?.secretsMeta || {};

  return (
    <div className="space-y-4 max-w-3xl">
      {!config?.encryptionConfigured && (
        <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
          Set <code className="text-amber-200">INTEGRATION_ENCRYPTION_KEY</code> on the server once (bootstrap). After that, all API keys and passwords are stored encrypted from this panel.
        </div>
      )}
      <p className="text-xs text-slate-400">{config?.configurationNote}</p>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border ${
                tab === t.id ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-slate-950 text-slate-300 border-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        {tab === 'general' && (
          <>
            <h3 className="text-sm font-bold text-white">General platform</h3>
            <label className="block text-[11px] text-slate-400">Platform name</label>
            <input className={inputClass} value={platformName} onChange={(e) => setPlatformName(e.target.value)} />
            <label className="block text-[11px] text-slate-400">Public app URL (HTTPS)</label>
            <input className={inputClass} placeholder="https://shelfy.co.tz" value={appUrl} onChange={(e) => setAppUrl(e.target.value)} />
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400">Support email</label>
                <input className={inputClass} value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400">Support phone</label>
                <input className={inputClass} value={supportPhone} onChange={(e) => setSupportPhone(e.target.value)} />
              </div>
            </div>
            <label className="block text-[11px] text-slate-400">Timezone</label>
            <input className={inputClass} value={timeZone} onChange={(e) => setTimeZone(e.target.value)} />
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={vendorReg} onChange={(e) => setVendorReg(e.target.checked)} className="accent-emerald-500" />
              Vendor self-registration
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={hostReg} onChange={(e) => setHostReg(e.target.checked)} className="accent-emerald-500" />
              Host self-registration
            </label>
          </>
        )}

        {tab === 'email' && (
          <>
            <h3 className="text-sm font-bold text-white">Email delivery</h3>
            <p className="text-xs text-slate-500">SMTP is preferred when host is set. Or enable Resend below.</p>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={integrations.resendEnabled ?? false}
                onChange={(e) => patchInt({ resendEnabled: e.target.checked })}
                className="accent-emerald-500"
              />
              Use Resend (when SMTP host is empty)
            </label>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400">From address</label>
                <input
                  className={inputClass}
                  placeholder="Shelfy <hello@shelfy.co.tz>"
                  value={integrations.emailFrom || ''}
                  onChange={(e) => patchInt({ emailFrom: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400">Reply-To</label>
                <input
                  className={inputClass}
                  value={integrations.emailReplyTo || ''}
                  onChange={(e) => patchInt({ emailReplyTo: e.target.value })}
                />
              </div>
            </div>
            <label className="block text-[11px] text-slate-400">SMTP URL (optional, overrides host/port)</label>
            <input
              className={inputClass}
              value={integrations.smtp?.url || ''}
              onChange={(e) => patchInt({ smtp: { ...integrations.smtp, url: e.target.value } })}
            />
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] text-slate-400">SMTP host</label>
                <input
                  className={inputClass}
                  value={integrations.smtp?.host || ''}
                  onChange={(e) => patchInt({ smtp: { ...integrations.smtp, host: e.target.value } })}
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400">Port</label>
                <input
                  type="number"
                  className={inputClass}
                  value={integrations.smtp?.port ?? 587}
                  onChange={(e) => patchInt({ smtp: { ...integrations.smtp, port: Number(e.target.value) } })}
                />
              </div>
            </div>
            <label className="block text-[11px] text-slate-400">SMTP user</label>
            <input
              className={inputClass}
              value={integrations.smtp?.user || ''}
              onChange={(e) => patchInt({ smtp: { ...integrations.smtp, user: e.target.value } })}
            />
            <label className="block text-[11px] text-slate-400">SMTP password {meta.SMTP_PASS ? '(configured — leave blank to keep)' : ''}</label>
            <input
              type="password"
              className={inputClass}
              value={secrets.SMTP_PASS || ''}
              onChange={(e) => setSecrets((s) => ({ ...s, SMTP_PASS: e.target.value }))}
            />
            <label className="block text-[11px] text-slate-400">Resend API key {meta.RESEND_API_KEY ? '(configured)' : ''}</label>
            <input
              type="password"
              className={inputClass}
              value={secrets.RESEND_API_KEY || ''}
              onChange={(e) => setSecrets((s) => ({ ...s, RESEND_API_KEY: e.target.value }))}
            />
            <button type="button" onClick={() => void testEmail()} className="text-xs font-bold text-teal-400 hover:underline">
              Send test email to support address
            </button>
          </>
        )}

        {tab === 'maps' && (
          <>
            <h3 className="text-sm font-bold text-white">Maps</h3>
            <label className="block text-[11px] text-slate-400">Provider</label>
            <select
              className={inputClass}
              value={integrations.maps?.provider || 'osm'}
              onChange={(e) => patchInt({ maps: { ...integrations.maps, provider: e.target.value as any } })}
            >
              <option value="osm">OpenStreetMap (free, default)</option>
              <option value="google">Google Maps</option>
              <option value="mapbox">Mapbox</option>
            </select>
            <label className="block text-[11px] text-slate-400">Browser maps key (public, restrict by domain in Google/Mapbox)</label>
            <input
              className={inputClass}
              value={integrations.maps?.publicBrowserKey || ''}
              onChange={(e) => patchInt({ maps: { ...integrations.maps, publicBrowserKey: e.target.value } })}
            />
            <label className="block text-[11px] text-slate-400">Server Google Maps key {meta.GOOGLE_MAPS_API_KEY ? '(configured)' : ''}</label>
            <input
              type="password"
              className={inputClass}
              value={secrets.GOOGLE_MAPS_API_KEY || ''}
              onChange={(e) => setSecrets((s) => ({ ...s, GOOGLE_MAPS_API_KEY: e.target.value }))}
            />
            <label className="block text-[11px] text-slate-400">Mapbox token {meta.MAPBOX_ACCESS_TOKEN ? '(configured)' : ''}</label>
            <input
              type="password"
              className={inputClass}
              value={secrets.MAPBOX_ACCESS_TOKEN || ''}
              onChange={(e) => setSecrets((s) => ({ ...s, MAPBOX_ACCESS_TOKEN: e.target.value }))}
            />
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400">Default lat</label>
                <input
                  type="number"
                  step="any"
                  className={inputClass}
                  value={integrations.maps?.defaultCenterLat ?? -6.7924}
                  onChange={(e) => patchInt({ maps: { ...integrations.maps, defaultCenterLat: Number(e.target.value) } })}
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400">Default lng</label>
                <input
                  type="number"
                  step="any"
                  className={inputClass}
                  value={integrations.maps?.defaultCenterLng ?? 39.2083}
                  onChange={(e) => patchInt({ maps: { ...integrations.maps, defaultCenterLng: Number(e.target.value) } })}
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400">Zoom</label>
                <input
                  type="number"
                  className={inputClass}
                  value={integrations.maps?.defaultZoom ?? 12}
                  onChange={(e) => patchInt({ maps: { ...integrations.maps, defaultZoom: Number(e.target.value) } })}
                />
              </div>
            </div>
          </>
        )}

        {tab === 'oauth' && (
          <>
            <h3 className="text-sm font-bold text-white">Google sign-in</h3>
            <p className="text-xs text-slate-500 break-all">
              Redirect URI: <code className="text-emerald-300">{config?.googleOAuthRedirectUri}</code>
            </p>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={integrations.oauth?.google?.enabled ?? false}
                onChange={(e) =>
                  patchInt({ oauth: { ...integrations.oauth, google: { ...integrations.oauth?.google, enabled: e.target.checked } } })
                }
                className="accent-emerald-500"
              />
              Enable Google login
            </label>
            <label className="block text-[11px] text-slate-400">OAuth client ID</label>
            <input
              className={inputClass}
              value={integrations.oauth?.google?.clientId || ''}
              onChange={(e) =>
                patchInt({ oauth: { ...integrations.oauth, google: { ...integrations.oauth?.google, enabled: integrations.oauth?.google?.enabled, clientId: e.target.value } } })
              }
            />
            <label className="block text-[11px] text-slate-400">Client secret {meta.GOOGLE_OAUTH_CLIENT_SECRET ? '(configured)' : ''}</label>
            <input
              type="password"
              className={inputClass}
              value={secrets.GOOGLE_OAUTH_CLIENT_SECRET || ''}
              onChange={(e) => setSecrets((s) => ({ ...s, GOOGLE_OAUTH_CLIENT_SECRET: e.target.value }))}
            />
            <h4 className="text-xs font-bold text-slate-400 pt-2">Facebook (app ID only — full flow coming soon)</h4>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={integrations.oauth?.facebook?.enabled ?? false}
                onChange={(e) =>
                  patchInt({ oauth: { ...integrations.oauth, facebook: { ...integrations.oauth?.facebook, enabled: e.target.checked } } })
                }
                className="accent-emerald-500"
              />
              Show Facebook login placeholder
            </label>
            <input
              className={inputClass}
              placeholder="Facebook App ID"
              value={integrations.oauth?.facebook?.appId || ''}
              onChange={(e) =>
                patchInt({ oauth: { ...integrations.oauth, facebook: { ...integrations.oauth?.facebook, enabled: integrations.oauth?.facebook?.enabled, appId: e.target.value } } })
              }
            />
          </>
        )}

        {tab === 'storage' && (
          <>
            <h3 className="text-sm font-bold text-white">File storage</h3>
            <select
              className={inputClass}
              value={integrations.storage?.driver || 'local'}
              onChange={(e) => patchInt({ storage: { ...integrations.storage, driver: e.target.value as 'local' | 's3' } })}
            >
              <option value="local">Local disk (VPS volume)</option>
              <option value="s3">S3-compatible</option>
            </select>
            {integrations.storage?.driver === 's3' && (
              <>
                <input
                  className={inputClass}
                  placeholder="Bucket"
                  value={integrations.storage?.bucket || ''}
                  onChange={(e) => patchInt({ storage: { ...integrations.storage, driver: 's3', bucket: e.target.value } })}
                />
                <input
                  className={inputClass}
                  placeholder="Region"
                  value={integrations.storage?.region || ''}
                  onChange={(e) => patchInt({ storage: { ...integrations.storage, driver: 's3', region: e.target.value } })}
                />
                <input
                  className={inputClass}
                  placeholder="Endpoint (optional)"
                  value={integrations.storage?.endpoint || ''}
                  onChange={(e) => patchInt({ storage: { ...integrations.storage, driver: 's3', endpoint: e.target.value } })}
                />
                <input
                  className={inputClass}
                  placeholder="Public base URL"
                  value={integrations.storage?.publicBaseUrl || ''}
                  onChange={(e) => patchInt({ storage: { ...integrations.storage, driver: 's3', publicBaseUrl: e.target.value } })}
                />
                <input
                  type="password"
                  className={inputClass}
                  placeholder={meta.S3_ACCESS_KEY ? 'Access key (leave blank to keep)' : 'Access key'}
                  value={secrets.S3_ACCESS_KEY || ''}
                  onChange={(e) => setSecrets((s) => ({ ...s, S3_ACCESS_KEY: e.target.value }))}
                />
                <input
                  type="password"
                  className={inputClass}
                  placeholder={meta.S3_SECRET_KEY ? 'Secret key (leave blank to keep)' : 'Secret key'}
                  value={secrets.S3_SECRET_KEY || ''}
                  onChange={(e) => setSecrets((s) => ({ ...s, S3_SECRET_KEY: e.target.value }))}
                />
              </>
            )}
          </>
        )}

        {tab === 'ai' && (
          <>
            <h3 className="text-sm font-bold text-white">Gemini AI</h3>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={integrations.gemini?.enabled !== false}
                onChange={(e) => patchInt({ gemini: { ...integrations.gemini, enabled: e.target.checked } })}
                className="accent-emerald-500"
              />
              Enable Gemini for shelf analysis & insights
            </label>
            <label className="block text-[11px] text-slate-400">API key {meta.GEMINI_API_KEY ? '(configured)' : ''}</label>
            <input
              type="password"
              className={inputClass}
              value={secrets.GEMINI_API_KEY || ''}
              onChange={(e) => setSecrets((s) => ({ ...s, GEMINI_API_KEY: e.target.value }))}
            />
          </>
        )}

        {tab === 'sms' && (
          <>
            <h3 className="text-sm font-bold text-white">SMS notifications</h3>
            <select
              className={inputClass}
              value={integrations.sms?.provider || 'none'}
              onChange={(e) => patchInt({ sms: { ...integrations.sms, provider: e.target.value as any } })}
            >
              <option value="none">Disabled</option>
              <option value="africas_talking">Africa&apos;s Talking</option>
              <option value="twilio">Twilio</option>
            </select>
            {integrations.sms?.provider === 'africas_talking' && (
              <>
                <input
                  className={inputClass}
                  placeholder="Username"
                  value={integrations.sms?.username || ''}
                  onChange={(e) => patchInt({ sms: { ...integrations.sms, provider: 'africas_talking', username: e.target.value } })}
                />
                <input
                  type="password"
                  className={inputClass}
                  placeholder={meta.AFRICASTALKING_API_KEY ? 'API key (leave blank to keep)' : 'API key'}
                  value={secrets.AFRICASTALKING_API_KEY || ''}
                  onChange={(e) => setSecrets((s) => ({ ...s, AFRICASTALKING_API_KEY: e.target.value }))}
                />
              </>
            )}
            {integrations.sms?.provider === 'twilio' && (
              <>
                <input
                  className={inputClass}
                  placeholder="Account SID"
                  value={integrations.sms?.username || ''}
                  onChange={(e) => patchInt({ sms: { ...integrations.sms, provider: 'twilio', username: e.target.value } })}
                />
                <input
                  className={inputClass}
                  placeholder="From number"
                  value={integrations.sms?.from || ''}
                  onChange={(e) => patchInt({ sms: { ...integrations.sms, provider: 'twilio', from: e.target.value } })}
                />
                <input
                  type="password"
                  className={inputClass}
                  placeholder={meta.TWILIO_AUTH_TOKEN ? 'Auth token (leave blank to keep)' : 'Auth token'}
                  value={secrets.TWILIO_AUTH_TOKEN || ''}
                  onChange={(e) => setSecrets((s) => ({ ...s, TWILIO_AUTH_TOKEN: e.target.value }))}
                />
              </>
            )}
          </>
        )}

        {tab === 'social' && (
          <>
            <h3 className="text-sm font-bold text-white">Social & branding</h3>
            {(['facebookUrl', 'instagramUrl', 'twitterUrl', 'linkedInUrl'] as const).map((key) => (
              <div key={key}>
                <label className="block text-[11px] text-slate-400">{key.replace('Url', ' URL')}</label>
                <input
                  className={inputClass}
                  value={(integrations.social as any)?.[key] || ''}
                  onChange={(e) => patchInt({ social: { ...integrations.social, [key]: e.target.value } })}
                />
              </div>
            ))}
            <label className="block text-[11px] text-slate-400">Logo URL</label>
            <input
              className={inputClass}
              value={integrations.branding?.logoUrl || ''}
              onChange={(e) => patchInt({ branding: { ...integrations.branding, logoUrl: e.target.value } })}
            />
          </>
        )}

        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save platform configuration
        </button>
      </div>

      {config?.status && (
        <div className="text-[11px] text-slate-500 grid grid-cols-2 gap-2">
          <span>Email: {config.status.email?.configured ? 'OK' : '—'}</span>
          <span>Gemini: {config.status.gemini?.configured ? 'OK' : '—'}</span>
          <span>Maps: {config.status.maps?.configured ? 'OK' : '—'}</span>
          <span>Google OAuth: {config.status.googleOAuth?.configured ? 'OK' : '—'}</span>
        </div>
      )}
    </div>
  );
};
