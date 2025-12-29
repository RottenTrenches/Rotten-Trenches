import { useState, useEffect } from 'react';
import badgeBronze from '@/assets/badge-bronze.png';
import badgeSilver from '@/assets/badge-silver.png';
import badgeGold from '@/assets/badge-gold.png';
import badgeDiamond from '@/assets/badge-diamond.png';
import reviewBronze from '@/assets/review-bronze.png';
import reviewSilver from '@/assets/review-silver.png';
import reviewGold from '@/assets/review-gold.png';
import reviewDiamond from '@/assets/review-diamond.png';
import friendsBronze from '@/assets/friends-bronze.png';
import friendsSilver from '@/assets/friends-silver.png';
import friendsGold from '@/assets/friends-gold.png';
import friendsDiamond from '@/assets/friends-diamond.png';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  badgeImage: string;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  requirement: number;
  category: 'voting' | 'reviewing' | 'friends';
}

export const VOTING_BADGES = {
  bronze: badgeBronze,
  silver: badgeSilver,
  gold: badgeGold,
  diamond: badgeDiamond,
};

export const REVIEW_BADGES = {
  bronze: reviewBronze,
  silver: reviewSilver,
  gold: reviewGold,
  diamond: reviewDiamond,
};

export const FRIENDS_BADGES = {
  bronze: friendsBronze,
  silver: friendsSilver,
  gold: friendsGold,
  diamond: friendsDiamond,
};

export const ACHIEVEMENTS: Achievement[] = [
  // Voting achievements - use voting badges
  { id: 'first_vote', name: 'First Vote', description: 'Cast your first vote', badgeImage: badgeBronze, tier: 'bronze', requirement: 1, category: 'voting' },
  { id: 'voter_10', name: 'Active Voter', description: 'Cast 10 votes', badgeImage: badgeSilver, tier: 'silver', requirement: 10, category: 'voting' },
  { id: 'voter_50', name: 'Democracy Champion', description: 'Cast 50 votes', badgeImage: badgeGold, tier: 'gold', requirement: 50, category: 'voting' },
  { id: 'voter_100', name: 'Vote Master', description: 'Cast 100 votes', badgeImage: badgeDiamond, tier: 'diamond', requirement: 100, category: 'voting' },
  
  // Reviewing achievements - use review badges (book icons)
  { id: 'first_review', name: 'First Review', description: 'Write your first review', badgeImage: reviewBronze, tier: 'bronze', requirement: 1, category: 'reviewing' },
  { id: 'reviewer_5', name: 'Critic', description: 'Write 5 reviews', badgeImage: reviewSilver, tier: 'silver', requirement: 5, category: 'reviewing' },
  { id: 'reviewer_20', name: 'Expert Reviewer', description: 'Write 20 reviews', badgeImage: reviewGold, tier: 'gold', requirement: 20, category: 'reviewing' },
  { id: 'reviewer_50', name: 'Review Legend', description: 'Write 50 reviews', badgeImage: reviewDiamond, tier: 'diamond', requirement: 50, category: 'reviewing' },
  
  // Adding Friends achievements - use friends badges
  { id: 'first_friend', name: 'Friendly', description: 'Add your first friend', badgeImage: friendsBronze, tier: 'bronze', requirement: 1, category: 'friends' },
  { id: 'friends_5', name: 'Social Butterfly', description: 'Add 5 friends', badgeImage: friendsSilver, tier: 'silver', requirement: 5, category: 'friends' },
  { id: 'friends_15', name: 'Popular', description: 'Add 15 friends', badgeImage: friendsGold, tier: 'gold', requirement: 15, category: 'friends' },
  { id: 'friends_30', name: 'Community Leader', description: 'Add 30 friends', badgeImage: friendsDiamond, tier: 'diamond', requirement: 30, category: 'friends' },
];

// Leveling system based on total achievements
export interface UserLevel {
  level: number;
  title: string;
  minAchievements: number;
  maxAchievements: number;
  color: string;
}

export const LEVELS: UserLevel[] = [
  { level: 1, title: 'Newcomer', minAchievements: 0, maxAchievements: 2, color: 'text-muted-foreground' },
  { level: 2, title: 'Explorer', minAchievements: 3, maxAchievements: 5, color: 'text-amber-600' },
  { level: 3, title: 'Contributor', minAchievements: 6, maxAchievements: 8, color: 'text-slate-400' },
  { level: 4, title: 'Veteran', minAchievements: 9, maxAchievements: 10, color: 'text-yellow-500' },
  { level: 5, title: 'Legend', minAchievements: 11, maxAchievements: 12, color: 'text-cyan-400' },
];

export function getUserLevel(unlockedCount: number): UserLevel {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (unlockedCount >= LEVELS[i].minAchievements) {
      return LEVELS[i];
    }
  }
  return LEVELS[0];
}

const STATS_KEY = 'user_activity_stats';
const UNLOCKED_KEY = 'unlocked_achievements';

interface UserStats {
  votes: number;
  reviews: number;
  friendsAdded: number;
}

// Admin wallet that gets all achievements unlocked
const ADMIN_WALLET = '96HvKxa7FzbSsSK2nD4Yc1AtdMNUUUoqb37dyNKNJsrV';

export function useAchievements(walletAddress?: string) {
  const [stats, setStats] = useState<UserStats>({ votes: 0, reviews: 0, friendsAdded: 0 });
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [newlyUnlocked, setNewlyUnlocked] = useState<Achievement | null>(null);

  // Check if this is the admin wallet - unlock all achievements
  const isAdminWallet = walletAddress === ADMIN_WALLET;

  useEffect(() => {
    // If admin wallet, unlock all achievements
    if (isAdminWallet) {
      const allAchievementIds = ACHIEVEMENTS.map(a => a.id);
      setUnlockedAchievements(allAchievementIds);
      setStats({ votes: 100, reviews: 50, friendsAdded: 30 });
      return;
    }

    const storedStats = localStorage.getItem(STATS_KEY);
    const storedUnlocked = localStorage.getItem(UNLOCKED_KEY);
    
    if (storedStats) {
      try {
        const parsed = JSON.parse(storedStats);
        // Handle migration from old kolsAdded to friendsAdded
        setStats({
          votes: parsed.votes || 0,
          reviews: parsed.reviews || 0,
          friendsAdded: parsed.friendsAdded || parsed.kolsAdded || 0,
        });
      } catch {
        setStats({ votes: 0, reviews: 0, friendsAdded: 0 });
      }
    }
    
    if (storedUnlocked) {
      try {
        setUnlockedAchievements(JSON.parse(storedUnlocked));
      } catch {
        setUnlockedAchievements([]);
      }
    }
  }, [isAdminWallet]);

  const checkAndUnlockAchievements = (newStats: UserStats, currentUnlocked: string[]) => {
    const newUnlocked: Achievement[] = [];
    
    ACHIEVEMENTS.forEach(achievement => {
      if (currentUnlocked.includes(achievement.id)) return;
      
      let count = 0;
      if (achievement.category === 'voting') count = newStats.votes;
      else if (achievement.category === 'reviewing') count = newStats.reviews;
      else if (achievement.category === 'friends') count = newStats.friendsAdded;
      
      if (count >= achievement.requirement) {
        newUnlocked.push(achievement);
      }
    });
    
    if (newUnlocked.length > 0) {
      const updatedUnlocked = [...currentUnlocked, ...newUnlocked.map(a => a.id)];
      setUnlockedAchievements(updatedUnlocked);
      localStorage.setItem(UNLOCKED_KEY, JSON.stringify(updatedUnlocked));
      setNewlyUnlocked(newUnlocked[0]);
    }
  };

  const incrementVotes = () => {
    const newStats = { ...stats, votes: stats.votes + 1 };
    setStats(newStats);
    localStorage.setItem(STATS_KEY, JSON.stringify(newStats));
    checkAndUnlockAchievements(newStats, unlockedAchievements);
  };

  const incrementReviews = () => {
    const newStats = { ...stats, reviews: stats.reviews + 1 };
    setStats(newStats);
    localStorage.setItem(STATS_KEY, JSON.stringify(newStats));
    checkAndUnlockAchievements(newStats, unlockedAchievements);
  };

  const incrementFriendsAdded = () => {
    const newStats = { ...stats, friendsAdded: stats.friendsAdded + 1 };
    setStats(newStats);
    localStorage.setItem(STATS_KEY, JSON.stringify(newStats));
    checkAndUnlockAchievements(newStats, unlockedAchievements);
  };

  const getAchievementProgress = (achievement: Achievement): number => {
    let count = 0;
    if (achievement.category === 'voting') count = stats.votes;
    else if (achievement.category === 'reviewing') count = stats.reviews;
    else if (achievement.category === 'friends') count = stats.friendsAdded;
    return Math.min(count / achievement.requirement, 1);
  };

  const isUnlocked = (achievementId: string) => unlockedAchievements.includes(achievementId);

  const clearNewlyUnlocked = () => setNewlyUnlocked(null);

  const userLevel = getUserLevel(unlockedAchievements.length);

  return {
    stats,
    unlockedAchievements,
    newlyUnlocked,
    userLevel,
    incrementVotes,
    incrementReviews,
    incrementFriendsAdded,
    getAchievementProgress,
    isUnlocked,
    clearNewlyUnlocked,
  };
}
