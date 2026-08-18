import React, { useState } from 'react';
import { ShoppingCart, Trash2, CreditCard } from 'lucide-react';
import { Shelf } from '../types/index.js';
import { api } from '../lib/api.js';
import { useI18n } from '../i18n/context.js';

interface CartItem {
  shelf: Shelf;
  durationMonths: number;
}

interface CheckoutCartProps {
  onCheckoutComplete: (bookingIds: string[]) => void;
}

export const CheckoutCart: React.FC<CheckoutCartProps> = ({ onCheckoutComplete }) => {
  const { t } = useI18n();
  const [items, setItems] = useState<CartItem[]>([]);
  const [quoteTotal, setQuoteTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const addShelf = (shelf: Shelf, durationMonths = 1) => {
    setItems((prev) => {
      if (prev.some((i) => i.shelf.id === shelf.id)) return prev;
      return [...prev, { shelf, durationMonths }];
    });
  };

  const removeShelf = (shelfId: string) => setItems((prev) => prev.filter((i) => i.shelf.id !== shelfId));

  React.useEffect(() => {
    if (!items.length) {
      setQuoteTotal(0);
      return;
    }
    api.quoteBatchCheckout(items.map((i) => ({ shelfId: i.shelf.id, durationMonths: i.durationMonths }))).then((res) => {
      if (res.success && res.data) setQuoteTotal(res.data.grandTotalTzs);
    });
  }, [items]);

  const handleCheckout = async () => {
    setLoading(true);
    const res = await api.createBatchBookings(
      items.map((i) => ({ shelfId: i.shelf.id, durationMonths: i.durationMonths }))
    );
    setLoading(false);
    if (res.success && res.data) {
      setItems([]);
      onCheckoutComplete(res.data.bookings?.map((b: { id: string }) => b.id) || []);
    }
  };

  if (!items.length) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-40 bg-slate-900 border border-emerald-500/40 rounded-2xl shadow-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <ShoppingCart className="w-4 h-4 text-emerald-400" />
        <span className="text-sm font-bold text-white">{t('checkoutCart')} ({items.length})</span>
      </div>
      <div className="space-y-2 max-h-32 overflow-y-auto mb-3">
        {items.map((i) => (
          <div key={i.shelf.id} className="flex items-center justify-between text-xs bg-slate-950 p-2 rounded-lg">
            <span className="text-white truncate">{i.shelf.name}</span>
            <button type="button" onClick={() => removeShelf(i.shelf.id)} className="text-rose-400 ml-2">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-400">Total</span>
        <span className="font-black text-amber-400">TZS {quoteTotal.toLocaleString()}</span>
      </div>
      <button
        type="button"
        disabled={loading}
        onClick={handleCheckout}
        className="w-full py-2.5 bg-emerald-500 text-slate-950 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <CreditCard className="w-4 h-4" /> {loading ? 'Processing…' : t('checkoutCart')}
      </button>
    </div>
  );
};

export function useCheckoutCart() {
  const [cartApi] = useState<{ add: (shelf: Shelf) => void }>({ add: () => {} });
  return cartApi;
}

// Export addToCart helper via module-level ref for LandingPage integration
let globalAddToCart: ((shelf: Shelf) => void) | null = null;
export function registerCartAdd(fn: (shelf: Shelf) => void) {
  globalAddToCart = fn;
}
export function addShelfToCart(shelf: Shelf) {
  globalAddToCart?.(shelf);
}

// Re-export cart with register pattern
export const CheckoutCartWithRegister: React.FC<CheckoutCartProps & { onRegister?: (add: (s: Shelf) => void) => void }> = ({
  onCheckoutComplete,
  onRegister,
}) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const { t } = useI18n();
  const [quoteTotal, setQuoteTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    const add = (shelf: Shelf) => {
      setItems((prev) => (prev.some((i) => i.shelf.id === shelf.id) ? prev : [...prev, { shelf, durationMonths: 1 }]));
    };
    onRegister?.(add);
    registerCartAdd(add);
  }, [onRegister]);

  React.useEffect(() => {
    if (!items.length) {
      setQuoteTotal(0);
      return;
    }
    api.quoteBatchCheckout(items.map((i) => ({ shelfId: i.shelf.id, durationMonths: i.durationMonths }))).then((res) => {
      if (res.success && res.data) setQuoteTotal(res.data.grandTotalTzs);
    });
  }, [items]);

  const removeShelf = (shelfId: string) => setItems((prev) => prev.filter((i) => i.shelf.id !== shelfId));

  const handleCheckout = async () => {
    setLoading(true);
    const res = await api.createBatchBookings(items.map((i) => ({ shelfId: i.shelf.id, durationMonths: i.durationMonths })));
    setLoading(false);
    if (res.success && res.data) {
      setItems([]);
      onCheckoutComplete(res.data.bookings?.map((b: { id: string }) => b.id) || []);
    }
  };

  if (!items.length) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-40 bg-slate-900 border border-emerald-500/40 rounded-2xl shadow-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <ShoppingCart className="w-4 h-4 text-emerald-400" />
        <span className="text-sm font-bold text-white">{t('checkoutCart')} ({items.length})</span>
      </div>
      <div className="space-y-2 max-h-32 overflow-y-auto mb-3">
        {items.map((i) => (
          <div key={i.shelf.id} className="flex items-center justify-between text-xs bg-slate-950 p-2 rounded-lg">
            <span className="text-white truncate">{i.shelf.name}</span>
            <button type="button" onClick={() => removeShelf(i.shelf.id)} className="text-rose-400 ml-2">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-400">Total</span>
        <span className="font-black text-amber-400">TZS {quoteTotal.toLocaleString()}</span>
      </div>
      <button
        type="button"
        disabled={loading}
        onClick={handleCheckout}
        className="w-full py-2.5 bg-emerald-500 text-slate-950 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <CreditCard className="w-4 h-4" /> {loading ? 'Processing…' : t('checkoutCart')}
      </button>
    </div>
  );
};
