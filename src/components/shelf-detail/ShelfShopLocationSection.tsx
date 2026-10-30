import React from 'react';
import { MapPin, ExternalLink } from 'lucide-react';
import { Shelf, Shop } from '../../types/index.js';
import {
  formatShopAddressLines,
  openStreetMapUrl,
  hasValidShopCoords,
  resolveShopCoords,
} from '../../lib/shopMapLocation.js';
import { formatInStoreLabelDisplay } from '../../lib/shelfInStoreLabel.js';
import { ShopLocationMap } from './ShopLocationMap.js';

interface ShelfShopLocationSectionProps {
  shelf: Shelf;
  shop: Shop | null;
  shopsById: Map<string, Shop>;
}

export const ShelfShopLocationSection: React.FC<ShelfShopLocationSectionProps> = ({
  shelf,
  shop,
  shopsById,
}) => {
  const coords = resolveShopCoords(shop, shelf, shopsById);
  const addressLines = formatShopAddressLines(shop, shelf);
  const inStore = formatInStoreLabelDisplay(shelf);
  const mapsUrl = coords ? openStreetMapUrl(coords.latitude, coords.longitude) : null;

  return (
    <section className="border-b border-[var(--shelfy-border)] pb-8 space-y-4 scroll-mt-28" id="shop-location">
      <h2 className="text-[22px] font-semibold flex items-center gap-2">
        <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        Where you&apos;ll find the shop
      </h2>

      {addressLines.length > 0 && (
        <p className="text-sm text-[var(--shelfy-fg)] leading-relaxed">{addressLines.join(' · ')}</p>
      )}

      <p className="text-sm text-[var(--shelfy-muted)]">
        <span className="font-semibold text-[var(--shelfy-fg)]">Shelf inside:</span> {inStore}
      </p>

      {coords ? (
        <>
          <ShopLocationMap
            latitude={coords.latitude}
            longitude={coords.longitude}
            shopName={shop?.name || shelf.shopName}
          />
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Open in OpenStreetMap
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </>
      ) : (
        <p className="text-sm text-[var(--shelfy-muted)] italic">
          Map pin pending verification. The host has provided address details; exact coordinates will appear once
          confirmed.
        </p>
      )}
    </section>
  );
};
