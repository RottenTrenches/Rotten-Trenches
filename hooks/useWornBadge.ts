import { useState, useEffect } from 'react';
import { ACHIEVEMENTS } from './useAchievements';

const WORN_BADGE_KEY = 'worn_badge';

export function useWornBadge() {
  const [wornBadgeId, setWornBadgeId] = useState<string | null>(() => {
    return localStorage.getItem(WORN_BADGE_KEY);
  });

  useEffect(() => {
    const handleStorage = () => {
      setWornBadgeId(localStorage.getItem(WORN_BADGE_KEY));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const wornBadge = wornBadgeId ? ACHIEVEMENTS.find(a => a.id === wornBadgeId) : null;

  return { wornBadgeId, wornBadge };
}

// Get badge image by achievement id - for displaying other users' badges
export function getBadgeById(badgeId: string | null) {
  if (!badgeId) return null;
  return ACHIEVEMENTS.find(a => a.id === badgeId) || null;
}
