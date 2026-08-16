export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function gpsWithinRadius(input: {
  shopLat: number;
  shopLng: number;
  userLat: number;
  userLng: number;
  maxMeters?: number;
}): { ok: boolean; meters: number; maxMeters: number } {
  const maxMeters = input.maxMeters ?? 250;
  const meters = haversineMeters(input.shopLat, input.shopLng, input.userLat, input.userLng);
  return { ok: meters <= maxMeters, meters, maxMeters };
}
