import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import { AchievementsPanel } from './AchievementBadge';

export function CollapsibleAchievements() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-1.5 px-2 py-1 rounded transition-all text-[8px]
          ${isOpen 
            ? 'bg-secondary/20 border border-secondary/50' 
            : 'bg-muted/30 hover:bg-muted/50 border border-border'
          }
        `}
      >
        <Trophy className={`w-3 h-3 ${isOpen ? 'text-secondary' : 'text-muted-foreground'}`} />
        <span className="font-pixel text-[8px] text-foreground">Achievements</span>
        {isOpen ? (
          <ChevronUp className="w-2.5 h-2.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-2.5 h-2.5 text-muted-foreground" />
        )}
      </button>

      {/* Expandable Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <AchievementsPanel />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
