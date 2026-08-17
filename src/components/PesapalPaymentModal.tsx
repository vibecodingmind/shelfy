/**
 * Shelfy — PesaPal checkout (hosted page).
 * M-Pesa/Tigo/Airtel OTP is sent by PesaPal after redirect — not from this modal.
 */

import React, { useState } from 'react';
import { X, ShieldCheck, Loader2, AlertTriangle, ExternalLink } from 'lucide-react';
import { Booking } from '../types/index.js';
import { api } from '../lib/api.js';

interface PesapalPaymentModalProps {
  isOpen: boolean;
  booking: Booking | null;
  onClose: () => void;
  onPaymentSuccess: (verifiedData: any) => void;
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export const PesapalPaymentModal: React.FC<PesapalPaymentModalProps> = ({
  isOpen,
  booking,
  onClose,
  onPaymentSuccess,
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !booking) return null;

  const handleContinueToPesapal = async () => {
    setBusy(true);
    setErrorMessage(null);

    const res = await api.initiatePesapalSession(booking.id, phoneNumber.trim());
    if (!res.success || !res.data?.redirectUrl) {
      setErrorMessage(
        res.error?.message ||
          'Could not start PesaPal checkout. Check your mobile number and try again.'
      );
      setBusy(false);
      return;
    }

    // OTP / STK push is triggered on PesaPal's hosted page after you pick M-Pesa and confirm.
    window.location.href = res.data.redirectUrl;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-6 sm:p-8 relative shadow-2xl max-h-[92vh] overflow-y-auto safe-bottom">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-amber-400 to-teal-400" />

        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <div className="text-lg font-extrabold text-white flex items-center gap-2">
            Pay with PesaPal
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono border border-emerald-500/30">
              LIVE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            M-Pesa, Tigo Pesa, Airtel Money, and cards are completed on PesaPal&apos;s secure page.
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

        <div className="space-y-3 mb-5">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Mobile number (for M-Pesa / mobile money)
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
          <p className="text-[11px] text-slate-500 leading-relaxed">
            After you continue, PesaPal opens in this window. Choose <strong className="text-slate-300">M-Pesa</strong>{' '}
            (or your wallet), confirm your number, then approve the <strong className="text-slate-300">OTP/PIN prompt on your phone</strong>.
            Shelfy does not send that OTP — Vodacom/Tigo/Airtel sends it during PesaPal checkout.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 mb-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <button
          type="button"
          disabled={busy || phoneNumber.length < 9}
          onClick={handleContinueToPesapal}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-400 text-slate-950 font-black text-sm hover:opacity-95 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {busy ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Connecting to PesaPal…
            </>
          ) : (
            <>
              <ExternalLink className="w-4 h-4" />
              Continue to PesaPal
            </>
          )}
        </button>

        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 mt-4">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Payment confirmed only after PesaPal verifies funds</span>
        </div>
      </div>
    </div>
  );
};
