import React from 'react';
import { Store } from 'lucide-react';
import { Shop, Shelf } from '../../types/index.js';
import { formatShopType } from '../shelfFacts.js';

interface ShelfDetailHostCardProps {
  shelf: Shelf;
  shop: Shop | null;
}

export const ShelfDetailHostCard: React.FC<ShelfDetailHostCardProps> = ({ shelf, shop }) => {
  const shopPhotos = shop?.photos?.length ? shop.photos : [];

  return (
    <div id="overview" className="flex flex-col gap-4 border-b border-[var(--shelfy-border)] pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--shelfy-fg)]">{shelf.shopName || shop?.name || 'Retail shop'}</h2>
          <p className="text-sm text-emerald-600 dark:text-emerald-400/90 mt-0.5 font-semibold">
            {shop?.hostName ? `Hosted by ${shop.hostName}` : 'Shop host'}
          </p>
          <p className="text-xs sm:text-sm text-[var(--shelfy-muted)] mt-1">
            {[shop?.city || shelf.shopCity, shop?.region].filter(Boolean).join(' • ')}
            {shelf.shopAddress || shop?.address ? ` • ${shelf.shopAddress || shop?.address}` : ''}
            {shop?.shopType ? ` • ${formatShopType(shop.shopType)}` : ''}
            {shop?.footTrafficScore ? ` • Foot traffic ${shop.footTrafficScore}/10` : ''}
          </p>
          <p className="text-[11px] text-[var(--shelfy-muted)] mt-1">
            {shop?.verificationStatus === 'VERIFIED' || shelf.hostVerificationStatus === 'VERIFIED'
              ? 'Verified shop'
              : 'Verification pending'}
            {shelf.listingStatus ? ` · Listing ${shelf.listingStatus}` : ''}
          </p>
        </div>
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-500 shrink-0">
          <Store className="w-7 h-7" />
        </div>
      </div>

      {shopPhotos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {shopPhotos.slice(0, 6).map((url, i) => (
            <img
              key={i}
              src={url}
              alt=""
              className="shrink-0 w-28 h-20 rounded-xl object-cover border border-[var(--shelfy-border)]"
            />
          ))}
        </div>
      )}
    </div>
  );
};
