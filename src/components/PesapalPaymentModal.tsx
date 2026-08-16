/**
 * Shelfy 🇹🇿 — Secure PesaPal Payment Gateway Modal
 * Handles transaction initiation, payment method selection (M-Pesa, Tigo, Airtel, Card),
 * USSD push verification simulation, secure callback handling, and instant receipt generation.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Smartphone,
  CreditCard,
  Building,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Receipt,
  Download,
  ArrowRight,
  ExternalLink,
  Lock,
  Sparkles,
  QrCode,
} from 'lucide-react';
import { Booking, Shelf } from '../types/index.js';
import { api } from '../lib/api.js';

interface PesapalPaymentModalProps {
  isOpen: boolean;
  booking: Booking | null;
  shelf?: Shelf | null;
  onClose: () => void;
  onPaymentSuccess: (verifiedData: any) => void;
}

export const PesapalPaymentModal: React.FC<PesapalPaymentModalProps> = ({
  isOpen,
  booking,
  shelf,
  onClose,
  onPaymentSuccess,
}) => {
  if (!isOpen || !booking) return null;

  // Tabs: MOBILE_MONEY, CARD, BANK
  const [paymentTab, setPaymentTab] = useState<'MOBILE_MONEY' | 'CARD' | 'BANK'>('MOBILE_MONEY');
  const [mobileProvider, setMobileProvider] = useState<'M_PESA' | 'TIGO_PESA' | 'AIRTEL_MONEY' | 'HALOPESA'>('M_PESA');
  const [phoneNumber, setPhoneNumber] = useState('0754123456');

  // Card details
  const [cardNumber, setCardNumber] = useState('4000 1234 5678 9010');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('888');
  const [cardHolder, setCardHolder] = useState('AMINA SALUM');

  // Payment Lifecycle States: 'INITIALIZING' | 'READY' | 'PROCESSING_PUSH' | 'VERIFYING' | 'SUCCESS' | 'FAILED'
  const [paymentState, setPaymentState] = useState<'INITIALIZING' | 'READY' | 'PROCESSING_PUSH' | 'VERIFYING' | 'SUCCESS' | 'FAILED'>('INITIALIZING');
  const [sessionData, setSessionData] = useState<any>(null);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ussdTimer, setUssdTimer] = useState<number>(15);

  // Initialize PesaPal session on modal open
  useEffect(() => {
    let isMounted = true;
    const initSession = async () => {
      setPaymentState('INITIALIZING');
      setErrorMessage(null);

      const res = await api.initiatePesapalSession(booking.id);
      if (!isMounted) return;

      if (res.success && res.data) {
        setSessionData(res.data);
        setPaymentState('READY');
      } else {
        setErrorMessage(res.error?.message || 'Failed to initialize PesaPal session. Please try again.');
        setPaymentState('FAILED');
      }
    };

    if (isOpen && booking) {
      initSession();
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, booking?.id]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (paymentState === 'PROCESSING_PUSH' && ussdTimer > 0) {
      timer = setTimeout(() => setUssdTimer((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [paymentState, ussdTimer]);

  const handleStartPayment = () => {
    if (sessionData?.redirectUrl) {
      window.open(sessionData.redirectUrl, '_blank', 'noopener,noreferrer');
    }
    setPaymentState('VERIFYING');
    pollPaymentStatus();
  };

  const pollPaymentStatus = async () => {
    const paymentId = sessionData?.paymentId;
    if (!paymentId) {
      setErrorMessage('No server payment was created. Close and try again.');
      setPaymentState('FAILED');
      return;
    }

    for (let i = 0; i < 12; i += 1) {
      const res = await api.syncPayment(paymentId);
      const paid = res.data?.payment?.status === 'PAID' || res.data?.booking?.paymentStatus === 'PAID';
      if (res.success && paid) {
        setReceiptData({
          receiptNumber: res.data.payment.transactionReference,
          trackingId: res.data.payment.pesapalTrackingId,
          bookingId: booking.id,
          shelfName: booking.shelfName,
          amountTzs: booking.totalPriceTzs,
          paidAt: res.data.payment.paidAt,
        });
        setPaymentState('SUCCESS');
        onPaymentSuccess(res.data);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }

    setErrorMessage('Payment is still pending server-side verification. Complete PesaPal checkout, then reopen this booking. Shelfy will never mark a payment paid just because this window finished.');
    setPaymentState('FAILED');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 relative shadow-2xl overflow-hidden font-sans">
        
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-amber-400 to-teal-400" />
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Branding */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-lg shadow-lg">
              💳
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-white">PesaPal 🇹🇿</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold border border-emerald-500/30">
                  SECURE CHECKOUT
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Official payment gateway for Shelfy Tanzania
              </p>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Total Due</div>
            <div className="text-lg font-mono font-black text-emerald-400">
              TZS {booking.totalPriceTzs.toLocaleString()}
            </div>
          </div>
        </div>

        {/* 1. INITIALIZING STATE */}
        {paymentState === 'INITIALIZING' && (
          <div className="py-16 text-center space-y-4">
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mx-auto" />
            <div className="text-sm font-bold text-white">Initializing PesaPal Secure Session...</div>
            <p className="text-xs text-slate-400">Generating cryptographic transaction reference and payment token.</p>
          </div>
        )}

        {/* 2. READY STATE (Select Method & Enter Details) */}
        {paymentState === 'READY' && (
          <div className="space-y-6">
            
            {/* Booking Summary Box */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Shelf Listing:</span>
                <span className="font-bold text-white">{booking.shelfName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Location:</span>
                <span className="text-slate-300">{booking.shopName} ({booking.shopCity})</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Rental Period:</span>
                <span className="text-slate-300">{booking.startDate} to {booking.endDate} ({booking.durationMonths} mo)</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-800 font-mono">
                <span className="text-slate-400">Ref: <span className="text-slate-500">{sessionData?.transactionReference}</span></span>
                <span className="text-emerald-400 font-bold text-sm">TZS {booking.totalPriceTzs.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment Method Selector Tabs */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">Select Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentTab('MOBILE_MONEY')}
                  className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 ${
                    paymentTab === 'MOBILE_MONEY'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-lg'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-5 h-5" />
                  <span>Mobile Money</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentTab('CARD')}
                  className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 ${
                    paymentTab === 'CARD'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-lg'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  <span>Debit / Credit</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentTab('BANK')}
                  className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 ${
                    paymentTab === 'BANK'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-lg'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Building className="w-5 h-5" />
                  <span>Bank (NMB/CRDB)</span>
                </button>
              </div>
            </div>

            {/* TAB CONTENT: Mobile Money */}
            {paymentTab === 'MOBILE_MONEY' && (
              <div className="space-y-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    Mobile Network Provider (Tanzania)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'M_PESA', label: 'Vodacom M-Pesa', color: 'bg-red-500/20 text-red-300 border-red-500/40' },
                      { id: 'TIGO_PESA', label: 'Tigo Pesa', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
                      { id: 'AIRTEL_MONEY', label: 'Airtel Money', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
                      { id: 'HALOPESA', label: 'Halopesa', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
                    ].map((prov) => (
                      <button
                        key={prov.id}
                        type="button"
                        onClick={() => setMobileProvider(prov.id as any)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                          mobileProvider === prov.id
                            ? `${prov.color} shadow-md`
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {prov.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Phone Number for USSD Push
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">
                      🇹🇿 +255
                    </div>
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="754 123 456"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-20 pr-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    A prompt will appear on your phone asking you to enter your M-Pesa/Tigo PIN.
                  </p>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Card Payment */}
            {paymentTab === 'CARD' && (
              <div className="space-y-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Cardholder Name</label>
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Card Number (Visa / Mastercard)</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Expiry Date</label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="MM/YY"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono text-center focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">CVV / CVC</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      placeholder="•••"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono text-center focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Bank */}
            {paymentTab === 'BANK' && (
              <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs text-slate-300">
                <p>Transfer directly to Shelfy Escrow via NMB or CRDB online banking:</p>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1 font-mono">
                  <div>Bank: <span className="text-white font-bold">CRDB Bank Tanzania</span></div>
                  <div>Account: <span className="text-emerald-400 font-bold">0150-8849-22100</span></div>
                  <div>Reference: <span className="text-amber-400 font-bold">{sessionData?.transactionReference}</span></div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Pay Button */}
            <button
              type="button"
              onClick={handleStartPayment}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-400 text-slate-950 font-black text-sm hover:opacity-95 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              Pay TZS {booking.totalPriceTzs.toLocaleString()} via PesaPal
            </button>

            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>PesaPal PCI-DSS Certified • Escrow Protection Guarantee</span>
            </div>

          </div>
        )}

        {/* 3. PROCESSING USSD PUSH / PIN STATE */}
        {paymentState === 'PROCESSING_PUSH' && (
          <div className="py-12 text-center space-y-6 animate-in fade-in">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 mx-auto flex items-center justify-center relative">
              <Smartphone className="w-10 h-10 text-emerald-400 animate-bounce" />
              <div className="absolute inset-0 rounded-full border border-emerald-400 animate-ping opacity-25" />
            </div>

            <div>
              <div className="text-lg font-bold text-white mb-1">Awaiting Mobile Confirmation...</div>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                We sent an instant USSD authorization push to <span className="font-mono text-emerald-400 font-bold">{phoneNumber}</span>.
                Please check your phone screen and enter your PIN to approve.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 font-mono text-xs text-amber-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Simulating PIN entry: auto-verifying in {ussdTimer}s</span>
            </div>
          </div>
        )}

        {/* 4. VERIFYING CALLBACK */}
        {paymentState === 'VERIFYING' && (
          <div className="py-12 text-center space-y-4 animate-in fade-in">
            <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mx-auto" />
            <div className="text-base font-bold text-white">Verifying PesaPal Callback...</div>
            <p className="text-xs text-slate-400">Confirming bank receipt and activating your shelf booking in the ledger.</p>
          </div>
        )}

        {/* 5. SUCCESS STATE & DIGITAL RECEIPT */}
        {paymentState === 'SUCCESS' && receiptData && (
          <div className="space-y-6 animate-in zoom-in-95">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mx-auto flex items-center justify-center shadow-xl shadow-emerald-500/20">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <h3 className="text-xl font-black text-white">Payment Confirmed! 🇹🇿</h3>
              <p className="text-xs text-emerald-400 font-semibold">Your shelf space is now reserved and ACTIVE.</p>
            </div>

            {/* Official Digital Receipt Box */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-emerald-500/30 space-y-3 font-sans relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">Shelfy Official Payment Receipt</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  PAID
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Receipt No.</span>
                  <span className="font-mono font-semibold text-slate-200">{receiptData.receiptNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Payment Channel</span>
                  <span className="font-semibold text-slate-200">{receiptData.paymentMethod}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Shelf Listing</span>
                  <span className="font-semibold text-slate-200">{receiptData.shelfName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Location</span>
                  <span className="font-semibold text-slate-200">{receiptData.shopName}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-400">Total Paid (TZS):</span>
                <span className="text-base font-mono font-black text-emerald-400">
                  TZS {receiptData.amountTzs.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 transition-all flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4" /> Download Receipt
              </button>

              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5"
              >
                Go to Vendor Dashboard <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
