import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'shelfy.favoriteShelfIds';

function readIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function writeIds(ids: string[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function useFavoriteShelves() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => readIds());

  useEffect(() => {
    writeIds(favoriteIds);
  }, [favoriteIds]);

  const isFavorite = useCallback(
    (shelfId: string) => favoriteIds.includes(shelfId),
    [favoriteIds]
  );

  const toggleFavorite = useCallback((shelfId: string) => {
    setFavoriteIds((prev) =>
      prev.includes(shelfId) ? prev.filter((id) => id !== shelfId) : [...prev, shelfId]
    );
  }, []);

  return { favoriteIds, isFavorite, toggleFavorite };
}
