import { useState, useEffect } from 'react';

const FAVORITES_KEY = 'kol_favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(FAVORITES_KEY);
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch {
        setFavorites([]);
      }
    }
  }, []);

  const addFavorite = (kolId: string) => {
    setFavorites(prev => {
      const updated = [...prev, kolId];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const removeFavorite = (kolId: string) => {
    setFavorites(prev => {
      const updated = prev.filter(id => id !== kolId);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const toggleFavorite = (kolId: string) => {
    if (favorites.includes(kolId)) {
      removeFavorite(kolId);
    } else {
      addFavorite(kolId);
    }
  };

  const isFavorite = (kolId: string) => favorites.includes(kolId);

  return { favorites, addFavorite, removeFavorite, toggleFavorite, isFavorite };
}
