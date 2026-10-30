import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  hasValidShopCoords,
  OPENSTREETMAP_TILE_ATTRIBUTION,
  OPENSTREETMAP_TILE_URL,
} from '../../lib/shopMapLocation.js';

function shopMarkerIcon(): L.DivIcon {
  return L.divIcon({
    className: 'shelfy-shop-pin',
    html: '<div style="width:18px;height:18px;background:#10b981;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

interface ShopLocationMapProps {
  latitude: number;
  longitude: number;
  shopName?: string;
  interactive?: boolean;
  onCoordsChange?: (lat: number, lng: number) => void;
  className?: string;
  heightClassName?: string;
}

export const ShopLocationMap: React.FC<ShopLocationMapProps> = ({
  latitude,
  longitude,
  shopName,
  interactive = false,
  onCoordsChange,
  className = '',
  heightClassName = 'h-[300px]',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || !hasValidShopCoords(latitude, longitude)) return;
    if (mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [latitude, longitude],
      zoom: 15,
      zoomControl: interactive,
      scrollWheelZoom: interactive,
      dragging: interactive,
    });

    L.tileLayer(OPENSTREETMAP_TILE_URL, {
      attribution: OPENSTREETMAP_TILE_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([latitude, longitude], {
      icon: shopMarkerIcon(),
      draggable: interactive,
    }).addTo(map);

    if (interactive && onCoordsChange) {
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onCoordsChange(pos.lat, pos.lng);
      });
      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        onCoordsChange(e.latlng.lat, e.latlng.lng);
      });
    }

    mapRef.current = map;
    markerRef.current = marker;

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(containerRef.current);
    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [interactive, onCoordsChange]);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker || !hasValidShopCoords(latitude, longitude)) return;
    const next = L.latLng(latitude, longitude);
    if (marker.getLatLng().distanceTo(next) > 1) {
      marker.setLatLng(next);
    }
    map.setView(next, map.getZoom(), { animate: false });
  }, [latitude, longitude]);

  if (!hasValidShopCoords(latitude, longitude)) {
    return null;
  }

  return (
    <div
      className={`rounded-2xl overflow-hidden border border-[var(--shelfy-border)] ${heightClassName} ${className}`}
      aria-label={shopName ? `Map showing ${shopName}` : 'Shop location map'}
    >
      <div ref={containerRef} className="w-full h-full leaflet-container" />
    </div>
  );
};
