import { motion, AnimatePresence } from "framer-motion";
import { Achievement, ACHIEVEMENTS, useAchievements, LEVELS, getUserLevel } from "@/hooks/useAchievements";
import { Trophy, Zap, MessageSquare, Users, Star } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { useConfetti } from "@/hooks/useConfetti";

const tierGlow = {
  bronze: "shadow-[0_0_8px_rgba(180,83,9,0.4)]",
  silver: "shadow-[0_0_8px_rgba(148,163,184,0.4)]",
  gold: "shadow-[0_0_10px_rgba(234,179,8,0.5)]",
  diamond: "shadow-[0_0_12px_rgba(34,211,238,0.5)]",
};

const tierRing = {
  bronze: "ring-amber-600",
  silver: "ring-slate-400",
  gold: "ring-yellow-500",
  diamond: "ring-cyan-400",
};

const tierBg = {
  bronze: "bg-amber-900/30",
  silver: "bg-slate-500/30",
  gold: "bg-yellow-500/30",
  diamond: "bg-cyan-500/30",
};

const tierLabels = {
  bronze: "BRONZE",
  silver: "SILVER",
  gold: "GOLD",
  diamond: "DIAMOND",
};

interface AchievementBadgeProps {
  achievement: Achievement;
  unlocked: boolean;
  progress?: number;
  size?: "sm" | "md" | "lg";
}

export function AchievementBadge({ achievement, unlocked, progress = 0, size = "md" }: AchievementBadgeProps) {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-20 h-20",
  };

  return (
    <div className="relative group">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.15 }}
        className={`
          ${sizeClasses[size]} rounded-lg flex items-center justify-center overflow-hidden
          ${unlocked 
            ? `ring-2 ring-offset-2 ring-offset-background ${tierRing[achievement.tier]} ${tierGlow[achievement.tier]}` 
            : "grayscale opacity-40"
          }
          transition-all duration-300 cursor-pointer
        `}
      >
        {/* Subtle glow background for unlocked badges */}
        {unlocked && (
          <div 
            className={`absolute inset-0 rounded-lg ${
              achievement.tier === 'diamond' ? 'bg-cyan-400/10' : 
              achievement.tier === 'gold' ? 'bg-yellow-500/10' : 
              achievement.tier === 'silver' ? 'bg-slate-400/10' : 
              'bg-amber-600/10'
            }`}
          />
        )}
        <img 
          src={achievement.badgeImage} 
          alt={achievement.name}
          className="w-full h-full object-cover relative z-10"
        />
        {!unlocked && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/80 rounded-b overflow-hidden z-20">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        )}
      </motion.div>
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        <div className={`px-3 py-2 rounded-lg ${tierBg[achievement.tier]} border border-border backdrop-blur-sm min-w-[150px]`}>
          <p className="font-pixel text-[8px] text-muted-foreground uppercase">{tierLabels[achievement.tier]}</p>
          <p className="font-pixel text-[9px] text-foreground font-bold">{achievement.name}</p>
          <p className="font-pixel text-[7px] text-muted-foreground mt-1">{achievement.description}</p>
          {!unlocked && (
            <p className="font-pixel text-[7px] text-secondary mt-1">
              {Math.round(progress * 100)}% complete
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function AchievementUnlockPopup() {
  const { newlyUnlocked, clearNewlyUnlocked } = useAchievements();
  const { fireConfetti } = useConfetti();

  useEffect(() => {
    if (newlyUnlocked) {
      fireConfetti();
      
      toast.success(`Achievement Unlocked: ${newlyUnlocked.name}!`, {
        description: newlyUnlocked.description,
        icon: <img src={newlyUnlocked.badgeImage} alt="" className="w-6 h-6 rounded" />,
        duration: 5000,
      });
      
      const timer = setTimeout(clearNewlyUnlocked, 5000);
      return () => clearTimeout(timer);
    }
  }, [newlyUnlocked, clearNewlyUnlocked, fireConfetti]);

  return null;
}

function LevelProgressBar({ walletAddress }: { walletAddress?: string }) {
  const { unlockedAchievements, userLevel } = useAchievements(walletAddress);
  const unlockedCount = unlockedAchievements.length;
  const totalAchievements = ACHIEVEMENTS.length;
  
  const currentLevelIndex = LEVELS.findIndex(l => l.level === userLevel.level);
  const nextLevel = currentLevelIndex < LEVELS.length - 1 ? LEVELS[currentLevelIndex + 1] : null;
  
  const progressInLevel = nextLevel 
    ? (unlockedCount - userLevel.minAchievements) / (nextLevel.minAchievements - userLevel.minAchievements)
    : 1;

  return (
    <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-muted/50 to-muted/30 border border-border">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Star className={`w-4 h-4 ${userLevel.color}`} />
          <span className={`font-pixel text-xs ${userLevel.color} font-bold`}>
            Level {userLevel.level}: {userLevel.title}
          </span>
        </div>
        {nextLevel && (
          <span className="font-pixel text-[8px] text-muted-foreground">
            {unlockedCount}/{nextLevel.minAchievements} to {nextLevel.title}
          </span>
        )}
      </div>
      <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${
            userLevel.level === 5 ? 'bg-gradient-to-r from-cyan-400 to-blue-500' :
            userLevel.level === 4 ? 'bg-gradient-to-r from-yellow-400 to-amber-500' :
            userLevel.level === 3 ? 'bg-gradient-to-r from-slate-300 to-slate-400' :
            userLevel.level === 2 ? 'bg-gradient-to-r from-amber-600 to-amber-700' :
            'bg-muted-foreground'
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${progressInLevel * 100}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

interface AchievementsPanelProps {
  walletAddress?: string;
}

export function AchievementsPanel({ walletAddress }: AchievementsPanelProps) {
  const { unlockedAchievements, getAchievementProgress, isUnlocked, stats } = useAchievements(walletAddress);

  const votingAchievements = ACHIEVEMENTS.filter(a => a.category === 'voting');
  const reviewAchievements = ACHIEVEMENTS.filter(a => a.category === 'reviewing');
  const friendsAchievements = ACHIEVEMENTS.filter(a => a.category === 'friends');

  return (
    <div className="stat-card p-4 rounded-sm">
      <h3 className="font-pixel text-sm text-foreground mb-4 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-secondary" />
        Achievements
      </h3>
      
      {/* Level Progress */}
      <LevelProgressBar walletAddress={walletAddress} />
      
      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-muted/30 p-2 rounded text-center">
          <Zap className="w-4 h-4 text-accent mx-auto mb-1" />
          <p className="font-pixel text-xs text-foreground">{stats.votes}</p>
          <p className="font-pixel text-[7px] text-muted-foreground">Votes</p>
        </div>
        <div className="bg-muted/30 p-2 rounded text-center">
          <MessageSquare className="w-4 h-4 text-secondary mx-auto mb-1" />
          <p className="font-pixel text-xs text-foreground">{stats.reviews}</p>
          <p className="font-pixel text-[7px] text-muted-foreground">Reviews</p>
        </div>
        <div className="bg-muted/30 p-2 rounded text-center">
          <Users className="w-4 h-4 text-primary mx-auto mb-1" />
          <p className="font-pixel text-xs text-foreground">{stats.friendsAdded}</p>
          <p className="font-pixel text-[7px] text-muted-foreground">Friends</p>
        </div>
      </div>
      
      {/* Voting Achievements */}
      <div className="mb-4">
        <p className="font-pixel text-[8px] text-muted-foreground mb-2 flex items-center gap-1">
          <Zap className="w-3 h-3" /> Voting
        </p>
        <div className="flex gap-2 flex-wrap">
          {votingAchievements.map(achievement => (
            <AchievementBadge
              key={achievement.id}
              achievement={achievement}
              unlocked={isUnlocked(achievement.id)}
              progress={getAchievementProgress(achievement)}
              size="sm"
            />
          ))}
        </div>
      </div>
      
      {/* Reviewing Achievements */}
      <div className="mb-4">
        <p className="font-pixel text-[8px] text-muted-foreground mb-2 flex items-center gap-1">
          <MessageSquare className="w-3 h-3" /> Reviewing
        </p>
        <div className="flex gap-2 flex-wrap">
          {reviewAchievements.map(achievement => (
            <AchievementBadge
              key={achievement.id}
              achievement={achievement}
              unlocked={isUnlocked(achievement.id)}
              progress={getAchievementProgress(achievement)}
              size="sm"
            />
          ))}
        </div>
      </div>
      
      {/* Friends Achievements */}
      <div>
        <p className="font-pixel text-[8px] text-muted-foreground mb-2 flex items-center gap-1">
          <Users className="w-3 h-3" /> Adding Friends
        </p>
        <div className="flex gap-2 flex-wrap">
          {friendsAchievements.map(achievement => (
            <AchievementBadge
              key={achievement.id}
              achievement={achievement}
              unlocked={isUnlocked(achievement.id)}
              progress={getAchievementProgress(achievement)}
              size="sm"
            />
          ))}
        </div>
      </div>
      
      <div className="mt-4 pt-3 border-t border-border">
        <p className="font-pixel text-[8px] text-muted-foreground">
          {unlockedAchievements.length}/{ACHIEVEMENTS.length} unlocked
        </p>
      </div>
    </div>
  );
}
