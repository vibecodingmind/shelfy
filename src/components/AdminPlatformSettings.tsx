import React, { useEffect, useState } from 'react';
import {
  Sliders,
  CreditCard,
  UserPlus,
  Loader2,
  RefreshCw,
  Settings2,
  Layers,
} from 'lucide-react';
import { AdminPlatformConfigPanel } from './admin/AdminPlatformConfigPanel.js';
import { AdminGatewaysPanel } from './admin/AdminGatewaysPanel.js';
import { AdminSubscriptionsPanel } from './admin/AdminSubscriptionsPanel.js';
import { PlatformSettings } from '../types/index.js';
import { api } from '../lib/api.js';

type SettingsSection = 'platform' | 'business' | 'gateways' | 'subscriptions' | 'payments' | 'team';

interface AdminPlatformSettingsProps {
  settings: PlatformSettings;
  onUpdateSettings: (patch: Partial<PlatformSettings>) => void;
  onSaved: (msg: string) => void;
}

export const AdminPlatformSettings: React.FC<AdminPlatformSettingsProps> = ({
  settings,
  onUpdateSettings,
  onSaved,
}) => {
  const [section, setSection] = useState<SettingsSection>('platform');
  const [commissionInput, setCommissionInput] = useState(settings.commissionPercentage);
  const [autoApprove, setAutoApprove] = useState(settings.autoApproveBookings);
  const [maintenanceMode, setMaintenanceMode] = useState(settings.maintenanceMode ?? false);
  const [minWithdrawal, setMinWithdrawal] = useState(settings.minWithdrawalTzs ?? 20000);
  const [freeCancelDays, setFreeCancelDays] = useState(settings.freeCancelDays ?? 7);
  const [cancelFee, setCancelFee] = useState(settings.cancellationFeePercent ?? 10);

  const [integrations, setIntegrations] = useState<any>(null);
  const [paymentsOverview, setPaymentsOverview] = useState<{ payments: any[]; attempts: any[] } | null>(null);
  const [loadingIntegrations, setLoadingIntegrations] = useState(false);
  const [reconcileBusy, setReconcileBusy] = useState(false);

  const [agentName, setAgentName] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [agentResult, setAgentResult] = useState<string | null>(null);

  useEffect(() => {
    setCommissionInput(settings.commissionPercentage);
    setAutoApprove(settings.autoApproveBookings);
    setMaintenanceMode(settings.maintenanceMode ?? false);
    setMinWithdrawal(settings.minWithdrawalTzs ?? 20000);
    setFreeCancelDays(settings.freeCancelDays ?? 7);
    setCancelFee(settings.cancellationFeePercent ?? 10);
  }, [settings]);

  useEffect(() => {
    if (section !== 'payments' && section !== 'gateways') return;
    setLoadingIntegrations(true);
    void Promise.all([api.getAdminIntegrations(), section === 'payments' ? api.getAdminPaymentsOverview() : null])
      .then(([intRes, payRes]) => {
        if (intRes.success && intRes.data) setIntegrations(intRes.data);
        if (payRes?.success && payRes.data) setPaymentsOverview(payRes.data);
      })
      .finally(() => setLoadingIntegrations(false));
  }, [section]);

  const saveBusiness = () => {
    onUpdateSettings({
      commissionPercentage: commissionInput,
      autoApproveBookings: autoApprove,
      maintenanceMode,
      minWithdrawalTzs: minWithdrawal,
      freeCancelDays,
      cancellationFeePercent: cancelFee,
    });
    onSaved('Platform business rules saved.');
  };

  const tabs: { id: SettingsSection; label: string; icon: React.ElementType }[] = [
    { id: 'platform', label: 'Platform config', icon: Settings2 },
    { id: 'business', label: 'Business rules', icon: Sliders },
    { id: 'gateways', label: 'Payment gateways', icon: CreditCard },
    { id: 'subscriptions', label: 'Subscriptions', icon: Layers },
    { id: 'payments', label: 'Payments ops', icon: RefreshCw },
    { id: 'team', label: 'Invite agent', icon: UserPlus },
  ];

  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSection(t.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                section === t.id
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                  : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-slate-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {section === 'platform' && <AdminPlatformConfigPanel onSaved={onSaved} />}

      {section === 'business' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl space-y-5">
          <h2 className="text-lg font-bold text-white">Platform business settings</h2>
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">Commission (%)</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={5}
                max={25}
                value={commissionInput}
                onChange={(e) => setCommissionInput(Number(e.target.value))}
                className="flex-1 accent-emerald-500"
              />
              <span className="text-lg font-mono font-bold text-amber-400">{commissionInput}%</span>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={autoApprove} onChange={(e) => setAutoApprove(e.target.checked)} className="accent-emerald-500" />
            Auto-approve bookings (skip host approval before payment)
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={maintenanceMode}
              onChange={(e) => setMaintenanceMode(e.target.checked)}
              className="accent-rose-500"
            />
            Maintenance mode (block new bookings — enforce in API as needed)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Min withdrawal (TZS)</label>
              <input
                type="number"
                value={minWithdrawal}
                onChange={(e) => setMinWithdrawal(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Free cancel window (days)</label>
              <input
                type="number"
                value={freeCancelDays}
                onChange={(e) => setFreeCancelDays(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Cancellation fee (%)</label>
              <input
                type="number"
                value={cancelFee}
                onChange={(e) => setCancelFee(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={saveBusiness}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
          >
            Save business rules
          </button>
        </div>
      )}

      {section === 'gateways' && (
        <div className="max-w-2xl space-y-4">
          {integrations?.azamPayCallbackUrl && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 space-y-2">
              <div className="font-bold text-white text-sm">Azam Pay URLs (register in Azam portal)</div>
              <div>
                <span className="text-slate-500">Callback:</span>{' '}
                <code className="text-emerald-300 break-all">{integrations.azamPayCallbackUrl}</code>
              </div>
              <div>
                <span className="text-slate-500">Return:</span>{' '}
                <code className="text-emerald-300 break-all">{integrations.azamPayReturnUrl}</code>
              </div>
              <div>
                <span className="text-slate-500">Active environment:</span>{' '}
                <span className="text-amber-400 font-bold">{integrations.azampay?.environment || settings.azamPayEnvironment}</span>
              </div>
            </div>
          )}
          {loadingIntegrations && !integrations ? (
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
          ) : (
            <AdminGatewaysPanel onNotify={onSaved} />
          )}
        </div>
      )}

      {section === 'subscriptions' && <AdminSubscriptionsPanel />}

      {section === 'payments' && (
        <div className="space-y-4 max-w-3xl">
          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              disabled={reconcileBusy}
              onClick={async () => {
                setReconcileBusy(true);
                const res = await api.runPaymentReconcileJob();
                setReconcileBusy(false);
                onSaved(res.success ? `Reconcile: ${JSON.stringify(res.data)}` : res.error?.message || 'Failed');
                const payRes = await api.getAdminPaymentsOverview();
                if (payRes.success && payRes.data) setPaymentsOverview(payRes.data);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500 text-slate-950 text-xs font-bold disabled:opacity-50"
            >
              {reconcileBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Run payment reconcile job
            </button>
            <span className="text-[11px] text-slate-500">Azam Pay settles via callback; job is a no-op unless extended.</span>
          </div>
          {loadingIntegrations && !paymentsOverview ? (
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
          ) : (
            <>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <h3 className="text-sm font-bold text-white mb-3">Recent payments</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto text-xs">
                  {(paymentsOverview?.payments || []).map((p) => (
                    <div key={p.id} className="flex justify-between gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                      <span className="font-mono text-slate-300">{p.id}</span>
                      <span className="text-emerald-400">{p.status}</span>
                      <span className="text-slate-400">TZS {p.amountTzs?.toLocaleString()}</span>
                    </div>
                  ))}
                  {!paymentsOverview?.payments?.length && <p className="text-slate-500">No payments yet.</p>}
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <h3 className="text-sm font-bold text-white mb-3">Payment attempts (audit)</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto text-[11px] font-mono text-slate-400">
                  {(paymentsOverview?.attempts || []).map((a) => (
                    <div key={a.id} className="border-b border-slate-800 pb-1">
                      {a.status} · {a.paymentId} · {a.createdAt}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {section === 'team' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md space-y-4">
          <h2 className="text-lg font-bold text-white">Invite field agent</h2>
          <input
            placeholder="Full name"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
          />
          <input
            placeholder="Email"
            type="email"
            value={agentEmail}
            onChange={(e) => setAgentEmail(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
          />
          <input
            placeholder="Phone (optional)"
            value={agentPhone}
            onChange={(e) => setAgentPhone(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
          />
          <button
            type="button"
            onClick={async () => {
              setAgentResult(null);
              const res = await api.inviteFieldAgent({ name: agentName, email: agentEmail, phone: agentPhone });
              if (res.success && res.data) {
                const temp = (res.data as any).temporaryPassword;
                setAgentResult(temp ? `Agent created. Temporary password: ${temp}` : 'Agent invited.');
                setAgentName('');
                setAgentEmail('');
                setAgentPhone('');
                onSaved('Field agent invited.');
              } else {
                setAgentResult(res.error?.message || 'Invite failed.');
              }
            }}
            className="w-full py-3 rounded-xl bg-blue-500 text-slate-950 font-bold text-xs"
          >
            Create agent account
          </button>
          {agentResult && <p className="text-xs text-slate-300">{agentResult}</p>}
        </div>
      )}
    </div>
  );
};
