import { useState, useEffect, useCallback } from 'react';

const COOLDOWN_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds
const STORAGE_KEY = 'vote_cooldowns';

interface CooldownEntry {
  kolId: string;
  expiresAt: number;
}

export function useVoteCooldown() {
  const [cooldowns, setCooldowns] = useState<CooldownEntry[]>([]);

  // Load cooldowns from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: CooldownEntry[] = JSON.parse(stored);
        // Filter out expired cooldowns
        const now = Date.now();
        const valid = parsed.filter(entry => entry.expiresAt > now);
        setCooldowns(valid);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Update timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCooldowns(prev => {
        const updated = prev.filter(entry => entry.expiresAt > now);
        if (updated.length !== prev.length) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        }
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const startCooldown = useCallback((kolId: string) => {
    const expiresAt = Date.now() + COOLDOWN_DURATION;
    setCooldowns(prev => {
      // Replace existing or add new
      const filtered = prev.filter(e => e.kolId !== kolId);
      const updated = [...filtered, { kolId, expiresAt }];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getCooldownRemaining = useCallback((kolId: string): number => {
    const entry = cooldowns.find(e => e.kolId === kolId);
    if (!entry) return 0;
    const remaining = entry.expiresAt - Date.now();
    return remaining > 0 ? remaining : 0;
  }, [cooldowns]);

  const isOnCooldown = useCallback((kolId: string): boolean => {
    return getCooldownRemaining(kolId) > 0;
  }, [getCooldownRemaining]);

  const formatCooldown = useCallback((ms: number): string => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  return {
    startCooldown,
    getCooldownRemaining,
    isOnCooldown,
    formatCooldown,
  };
}
