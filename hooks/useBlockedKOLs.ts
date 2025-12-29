import { useState, useEffect } from 'react';

const BLOCKED_KOLS_KEY = 'blocked_kols';

export function useBlockedKOLs() {
  const [blockedKOLs, setBlockedKOLs] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(BLOCKED_KOLS_KEY);
    if (stored) {
      try {
        setBlockedKOLs(JSON.parse(stored));
      } catch {
        setBlockedKOLs([]);
      }
    }
  }, []);

  const blockKOL = (kolId: string) => {
    setBlockedKOLs(prev => {
      const updated = [...prev, kolId];
      localStorage.setItem(BLOCKED_KOLS_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const unblockKOL = (kolId: string) => {
    setBlockedKOLs(prev => {
      const updated = prev.filter(id => id !== kolId);
      localStorage.setItem(BLOCKED_KOLS_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const toggleBlock = (kolId: string) => {
    if (blockedKOLs.includes(kolId)) {
      unblockKOL(kolId);
    } else {
      blockKOL(kolId);
    }
  };

  const isBlocked = (kolId: string) => blockedKOLs.includes(kolId);

  return { blockedKOLs, blockKOL, unblockKOL, toggleBlock, isBlocked };
}
