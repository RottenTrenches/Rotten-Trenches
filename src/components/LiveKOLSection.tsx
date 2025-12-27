import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Star, TrendingUp, TrendingDown, Crown, Flame, Sparkles, Zap, Skull, Heart, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface KOL {
  id: string;
  username: string;
  twitter_handle: string;
  profile_pic_url: string | null;
  rating: number;
  total_votes: number;
  created_at: string;
  wallet_address: string | null;
}

export const LiveKOLSection = () => {
  const [kols, setKols] = useState<KOL[]>([]);
  const [recentKols, setRecentKols] = useState<KOL[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKOLs();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('live-kols')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'kols' }, (payload) => {
        const newKol = payload.new as KOL;
        setRecentKols(prev => [newKol, ...prev].slice(0, 8));
        fetchKOLs();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'kols' }, () => {
        fetchKOLs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchKOLs = async () => {
    const { data, error } = await supabase
      .from('kols')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setKols(data);
      setRecentKols(data.slice(0, 8));
    }
    setLoading(false);
  };

  // Get best (highest rated) and worst (lowest rated) KOLs
  const sortedByRating = [...kols].sort((a, b) => Number(b.rating) - Number(a.rating));
  const bestKol = sortedByRating[0];
  const worstKol = sortedByRating[sortedByRating.length - 1];

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const renderStars = (rating: number, size = "w-3 h-3") => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${size} ${
            star <= rating ? "text-secondary fill-secondary" : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );

  if (loading) {
    return (
      <section className="relative py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Zap className="w-8 h-8 text-primary mx-auto" />
          </motion.div>
          <p className="font-pixel text-[10px] text-muted-foreground mt-4">Loading the trenches...</p>
        </div>
      </section>
    );
  }

  if (kols.length === 0) {
    return (
      <section className="relative py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <Skull className="w-12 h-12 text-primary mx-auto mb-4 animate-bounce" />
          <h2 className="font-pixel text-lg text-foreground mb-4">~ No KOLs Yet ~</h2>
          <p className="font-pixel text-[9px] text-muted-foreground mb-6">The graveyard is empty... Be the first to expose a KOL!</p>
          <Link 
            to="/add-kol" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/80 text-primary-foreground font-pixel text-[10px] rounded transition-all hover:scale-105"
          >
            <Skull className="w-4 h-4" />
            Add First KOL
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="relative py-20 px-4 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-primary/20 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [-20, 20],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>
      
      <div className="relative z-10 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-flex items-center gap-2 mb-4"
          >
            <Zap className="w-5 h-5 text-secondary" />
            <h2 className="font-pixel text-xl md:text-2xl text-foreground">
              LIVE KOL FEED
            </h2>
            <Zap className="w-5 h-5 text-secondary" />
          </motion.div>
          <p className="font-pixel text-[9px] text-muted-foreground">
            Real-time updates • Angels & Devils • Community Powered
          </p>
        </motion.div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          
          {/* Best KOL - Angel Card */}
          {bestKol && (
            <motion.div
              initial={{ opacity: 0, x: -50, rotateY: -15 }}
              whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02, y: -5 }}
              className="relative group"
            >
              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-accent/50 via-yellow-400/30 to-accent/50 rounded-lg blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
              
              <div className="relative stat-card p-6 rounded-lg border-2 border-accent/50 overflow-hidden">
                {/* Halo/Angel wings effect */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 0.8, 0.5]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-20 h-10 bg-gradient-to-b from-yellow-400/50 to-transparent rounded-full blur-md"
                  />
                </div>
                
                {/* Badge */}
                <div className="absolute -top-3 -right-3">
                  <motion.div
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="relative"
                  >
                    <div className="bg-accent/20 p-2 rounded-full backdrop-blur-sm">
                      <Crown className="w-6 h-6 text-yellow-400" />
                    </div>
                    <Sparkles className="w-4 h-4 text-accent absolute -top-1 -right-1 animate-pulse" />
                  </motion.div>
                </div>
                
                <div className="flex items-center gap-2 mb-4">
                  <Heart className="w-4 h-4 text-accent fill-accent" />
                  <span className="font-pixel text-[9px] text-accent uppercase tracking-wider">Best KOL</span>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="absolute -inset-1 bg-accent/30 rounded-full blur-md" />
                    <img
                      src={bestKol.profile_pic_url || `https://ui-avatars.com/api/?name=${bestKol.username}&background=random`}
                      alt={bestKol.username}
                      className="relative w-16 h-16 rounded-full border-2 border-accent"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${bestKol.username}&background=random`;
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-pixel text-sm text-foreground mb-1">{bestKol.username}</p>
                    <a
                      href={`https://twitter.com/${bestKol.twitter_handle.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-pixel text-[8px] text-accent hover:underline flex items-center gap-1"
                    >
                      {bestKol.twitter_handle}
                      <ExternalLink className="w-2 h-2" />
                    </a>
                    <div className="flex items-center gap-2 mt-2">
                      {renderStars(Number(bestKol.rating), "w-4 h-4")}
                    </div>
                    <span className="font-pixel text-[7px] text-muted-foreground">
                      {bestKol.total_votes} votes • Rating: {Number(bestKol.rating).toFixed(1)}
                    </span>
                  </div>
                </div>

                {bestKol.wallet_address && (
                  <div className="mt-3 pt-3 border-t border-accent/20">
                    <p className="font-pixel text-[7px] text-muted-foreground">
                      Wallet: {bestKol.wallet_address.slice(0, 6)}...{bestKol.wallet_address.slice(-4)}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Recent KOLs - Center Feed */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="stat-card rounded-lg overflow-hidden"
          >
            <div className="p-4 border-b border-border bg-muted/20">
              <div className="flex items-center justify-between">
                <h3 className="font-pixel text-[10px] text-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-secondary" />
                  Recently Added
                </h3>
                <motion.div
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-2 h-2 bg-accent rounded-full"
                />
              </div>
            </div>
            <div className="divide-y divide-border/30 max-h-80 overflow-y-auto scrollbar-thin">
              <AnimatePresence mode="popLayout">
                {recentKols.map((kol, index) => (
                  <motion.div
                    key={kol.id}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 30 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-all group cursor-pointer"
                  >
                    <div className="relative">
                      <img
                        src={kol.profile_pic_url || `https://ui-avatars.com/api/?name=${kol.username}&background=random`}
                        alt={kol.username}
                        className="w-10 h-10 rounded-full border border-border group-hover:border-primary transition-colors"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${kol.username}&background=random`;
                        }}
                      />
                      {index === 0 && (
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full border border-background"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-pixel text-[9px] text-foreground truncate group-hover:text-primary transition-colors">
                        {kol.username}
                      </p>
                      <a
                        href={`https://twitter.com/${kol.twitter_handle.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="font-pixel text-[7px] text-accent hover:underline"
                      >
                        {kol.twitter_handle}
                      </a>
                    </div>
                    <div className="text-right">
                      <div className="flex gap-0.5 justify-end mb-1">
                        {renderStars(Number(kol.rating), "w-2 h-2")}
                      </div>
                      <p className="font-pixel text-[6px] text-muted-foreground">
                        {formatTime(kol.created_at)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {recentKols.length === 0 && (
                <div className="p-6 text-center">
                  <Skull className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <p className="font-pixel text-[8px] text-muted-foreground">Waiting for fresh meat...</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Worst KOL - Devil Card */}
          {worstKol && worstKol.id !== bestKol?.id && (
            <motion.div
              initial={{ opacity: 0, x: 50, rotateY: 15 }}
              whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02, y: -5 }}
              className="relative group"
            >
              {/* Fire glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 via-orange-500/30 to-primary/50 rounded-lg blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
              
              <div className="relative stat-card p-6 rounded-lg border-2 border-primary/50 overflow-hidden">
                {/* Fire effect at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-16">
                  <motion.div
                    animate={{ 
                      y: [0, -5, 0],
                      opacity: [0.3, 0.5, 0.3]
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-full h-full bg-gradient-to-t from-primary/30 via-orange-500/20 to-transparent"
                  />
                </div>
                
                {/* Devil Badge */}
                <div className="absolute -top-3 -right-3">
                  <motion.div
                    animate={{ rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="relative"
                  >
                    <div className="bg-primary/20 p-2 rounded-full backdrop-blur-sm">
                      <Flame className="w-6 h-6 text-primary" />
                    </div>
                    {/* Devil horns */}
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-4">
                      <div className="w-2 h-4 bg-primary rounded-t-full transform -rotate-12" />
                      <div className="w-2 h-4 bg-primary rounded-t-full transform rotate-12" />
                    </div>
                  </motion.div>
                </div>
                
                <div className="flex items-center gap-2 mb-4">
                  <Skull className="w-4 h-4 text-primary" />
                  <span className="font-pixel text-[9px] text-primary uppercase tracking-wider">Most Rotten</span>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="absolute -inset-1 bg-primary/30 rounded-full blur-md animate-pulse" />
                    <img
                      src={worstKol.profile_pic_url || `https://ui-avatars.com/api/?name=${worstKol.username}&background=random`}
                      alt={worstKol.username}
                      className="relative w-16 h-16 rounded-full border-2 border-primary"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${worstKol.username}&background=random`;
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-pixel text-sm text-foreground mb-1">{worstKol.username}</p>
                    <a
                      href={`https://twitter.com/${worstKol.twitter_handle.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-pixel text-[8px] text-primary hover:underline flex items-center gap-1"
                    >
                      {worstKol.twitter_handle}
                      <ExternalLink className="w-2 h-2" />
                    </a>
                    <div className="flex items-center gap-2 mt-2">
                      {renderStars(Number(worstKol.rating), "w-4 h-4")}
                    </div>
                    <span className="font-pixel text-[7px] text-muted-foreground">
                      {worstKol.total_votes} votes • Rating: {Number(worstKol.rating).toFixed(1)}
                    </span>
                  </div>
                </div>

                {worstKol.wallet_address && (
                  <div className="mt-3 pt-3 border-t border-primary/20">
                    <p className="font-pixel text-[7px] text-muted-foreground">
                      Wallet: {worstKol.wallet_address.slice(0, 6)}...{worstKol.wallet_address.slice(-4)}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <Link to="/add-kol">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground font-pixel text-[10px] rounded-lg transition-all shadow-lg shadow-primary/25"
            >
              <Skull className="w-4 h-4" />
              View All KOLs & Add Your Own
              <TrendingDown className="w-4 h-4" />
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};