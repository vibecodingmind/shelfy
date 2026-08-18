import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { BookingReceipt } from '../types/index.js';
import { api } from '../lib/api.js';
import { useI18n } from '../i18n/context.js';

interface ReceiptViewProps {
  bookingId: string;
  open: boolean;
  onClose: () => void;
}

export const ReceiptView: React.FC<ReceiptViewProps> = ({ bookingId, open, onClose }) => {
  const { t } = useI18n();
  const [receipt, setReceipt] = useState<BookingReceipt | null>(null);

  useEffect(() => {
    if (!open) return;
    api.getBookingReceipt(bookingId).then((res) => {
      if (res.success && res.data) setReceipt(res.data);
    });
  }, [bookingId, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white text-slate-900 rounded-2xl max-w-md w-full p-6 relative shadow-2xl">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
          <X className="w-5 h-5" />
        </button>
        {!receipt ? (
          <p className="text-sm text-slate-500 py-8 text-center">Loading receipt…</p>
        ) : (
          <>
            <div className="text-center border-b border-slate-200 pb-4 mb-4">
              <div className="text-2xl font-black text-emerald-600">🇹🇿 shelfy</div>
              <div className="text-xs text-slate-500">Booking receipt · {receipt.receiptNumber}</div>
            </div>
            <dl className="text-xs space-y-2">
              <div className="flex justify-between"><dt className="text-slate-500">Vendor</dt><dd className="font-semibold">{receipt.vendorBusinessName || receipt.vendorName}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Shelf</dt><dd className="font-semibold">{receipt.shelfName}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Shop</dt><dd>{receipt.shopName}, {receipt.shopCity}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Period</dt><dd>{receipt.startDate} → {receipt.endDate}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Duration</dt><dd>{receipt.durationMonths} month(s)</dd></div>
              <div className="flex justify-between border-t border-slate-200 pt-2 mt-2"><dt className="font-bold">Total</dt><dd className="font-black text-emerald-700">TZS {receipt.totalPriceTzs.toLocaleString()}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Platform fee</dt><dd>TZS {receipt.platformFeeTzs.toLocaleString()}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Payment</dt><dd className="font-semibold">{receipt.paymentStatus}</dd></div>
              {receipt.transactionReference && (
                <div className="flex justify-between"><dt className="text-slate-500">Reference</dt><dd className="font-mono text-[10px]">{receipt.transactionReference}</dd></div>
              )}
            </dl>
            <button
              type="button"
              onClick={() => window.print()}
              className="mt-6 w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> Print / {t('viewReceipt')}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
