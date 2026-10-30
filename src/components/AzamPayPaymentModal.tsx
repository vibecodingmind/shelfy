/**
 * Shelfy — Azam Pay MNO checkout (USSD push to phone).
 */

import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, Loader2, AlertTriangle, Smartphone } from 'lucide-react';
import { Booking } from '../types/index.js';
import { api } from '../lib/api.js';

const MNO_OPTIONS = ['Mpesa', 'Tigo', 'Airtel', 'Halopesa', 'Azampesa'] as const;

interface AzamPayPaymentModalProps {
  isOpen: boolean;
  booking: Booking | null;
  onClose: () => void;
  onPaymentSuccess: (verifiedData: unknown) => void;
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export const AzamPayPaymentModal: React.FC<AzamPayPaymentModalProps> = ({
  isOpen,
  booking,
  onClose,
  onPaymentSuccess,
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [provider, setProvider] = useState<(typeof MNO_OPTIONS)[number]>('Mpesa');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [awaitingPhone, setAwaitingPhone] = useState(true);
  const [statusHint, setStatusHint] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPaymentId(null);
      setAwaitingPhone(true);
      setStatusHint(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !paymentId || awaitingPhone) return;
    let cancelled = false;
    const poll = async () => {
      const res = await api.syncPayment(paymentId);
      if (cancelled || !res.success || !res.data?.payment) return;
      if (res.data.payment.status === 'PAID') {
        onPaymentSuccess(res.data);
        onClose();
      }
    };
    const id = window.setInterval(poll, 5000);
    void poll();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [isOpen, paymentId, awaitingPhone, onClose, onPaymentSuccess]);

  if (!isOpen || !booking) return null;

  const handlePayWithAzam = async () => {
    setBusy(true);
    setErrorMessage(null);

    const res = await api.initiateAzamPaySession(booking.id, phoneNumber.trim(), provider);
    if (!res.success || !res.data?.paymentId) {
      setErrorMessage(
        res.error?.message || 'Could not start Azam Pay checkout. Check your mobile number and try again.'
      );
      setBusy(false);
      return;
    }

    setPaymentId(res.data.paymentId);
    setAwaitingPhone(false);
    setStatusHint(res.data.message || 'Approve the payment prompt on your phone.');
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-6 sm:p-8 relative shadow-2xl max-h-[92vh] overflow-y-auto safe-bottom">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-sky-500 via-emerald-500 to-teal-400" />

        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <div className="text-lg font-extrabold text-white flex items-center gap-2">
            Pay with Azam Pay
            <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded font-mono border border-sky-500/30">
              M-Pesa · Tigo · Airtel
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Tanzania mobile money via Azam Pay. You approve the charge on your handset — Shelfy never sees your PIN.
          </p>
        </div>

        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-2 mb-5 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">Shelf</span>
            <span className="font-bold text-white">{booking.shelfName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Period</span>
            <span className="text-slate-300">
              {booking.startDate} → {booking.endDate}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-slate-800 font-mono">
            <span className="text-slate-400">Total</span>
            <span className="text-emerald-400 font-bold">TZS {booking.totalPriceTzs.toLocaleString()}</span>
          </div>
        </div>

        {awaitingPhone ? (
          <div className="space-y-3 mb-5">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Mobile number
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">+255</div>
              <input
                type="tel"
                inputMode="numeric"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(digitsOnly(e.target.value).slice(0, 10))}
                placeholder="754123456"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-16 pr-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Wallet</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as (typeof MNO_OPTIONS)[number])}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              {MNO_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="mb-5 p-4 rounded-2xl border border-sky-500/30 bg-sky-500/10 text-sm text-sky-100 flex gap-3">
            <Smartphone className="w-6 h-6 shrink-0 text-sky-300" />
            <div>
              <p className="font-semibold text-white">Check your phone</p>
              <p className="text-xs text-sky-100/90 mt-1 leading-relaxed">{statusHint}</p>
              <p className="text-[11px] text-slate-400 mt-2">This screen updates automatically when Azam Pay confirms payment.</p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 mb-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {awaitingPhone && (
          <button
            type="button"
            disabled={busy || phoneNumber.length < 9}
            onClick={handlePayWithAzam}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-sky-500 via-emerald-500 to-teal-400 text-slate-950 font-black text-sm hover:opacity-95 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Sending Azam Pay request…
              </>
            ) : (
              <>Pay with Azam Pay</>
            )}
          </button>
        )}

        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 mt-4">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Booking activates only after Azam Pay server callback confirms funds</span>
        </div>
      </div>
    </div>
  );
};
