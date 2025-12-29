import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { useFavorites } from "@/hooks/useFavorites";
import { useVoteSound } from "@/hooks/useVoteSound";
import { useVoteParticles } from "@/hooks/useVoteParticles";
import { useVoteCooldown } from "@/hooks/useVoteCooldown";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Trophy, TrendingUp, TrendingDown, Minus, Search, Star, 
  Calendar, Award, Flame, Crown, Medal, ExternalLink, Heart, Clock, RefreshCw
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

interface KOL {
  id: string;
  name: string;
  twitter: string;
  avatar: string;
  walletAddress: string | null;
  hasWallet: boolean;
  pnl: number | null;
  pnlUsd: number | null;
  winRate: number | null;
  trades: { wins: number; losses: number } | null;
  trend: "up" | "down" | "stable";
  communityRating: number;
  totalVotes: number;
  upvotes: number;
  downvotes: number;
}

type TimeRange = "weekly" | "monthly" | "all";
type SortOption = "communityRating" | "pnl" | "winRate" | "popularityHigh" | "popularityLow";

// Helper to calculate popularity score (0-100)
const calculatePopularityScore = (upvotes: number, downvotes: number): number => {
  const total = upvotes + downvotes;
  if (total === 0) return 50;
  return Math.round((upvotes / total) * 100);
};

// Format time ago
const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

export default function Leaderboard() {
  const { publicKey } = useWallet();
  const navigate = useNavigate();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { playVoteSound } = useVoteSound();
  const { fireVoteParticles } = useVoteParticles();
  const { startCooldown, isOnCooldown, getCooldownRemaining, formatCooldown } = useVoteCooldown();
  const { isAdmin } = useAdminRole();
  const [kols, setKols] = useState<KOL[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("communityRating");
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [lastPnlUpdate, setLastPnlUpdate] = useState<Date | null>(null);
  const [refreshingPnl, setRefreshingPnl] = useState(false);

  const handleRefreshPnl = async () => {
    if (!isAdmin) {
      toast.error("Admin access required");
      return;
    }
    
    setRefreshingPnl(true);
    toast.info("Refreshing PNL data for all KOLs...");
    
    try {
      const { data, error } = await supabase.functions.invoke('fetch-pnl-data');
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success(`PNL data refreshed for ${data.results?.length || 0} KOLs`);
        setLastPnlUpdate(new Date());
        fetchKOLs(); // Refresh the list
      } else {
        toast.error(data?.error || "Failed to refresh PNL data");
      }
    } catch (err) {
      console.error('PNL refresh error:', err);
      toast.error("Failed to refresh PNL data");
    } finally {
      setRefreshingPnl(false);
    }
  };

  useEffect(() => {
    fetchKOLs();
    
    // Auto-refresh every 10 minutes
    const refreshInterval = setInterval(() => {
      fetchKOLs();
    }, 10 * 60 * 1000);
    
    // Real-time subscription for vote updates
    const channel = supabase
      .channel('kols-votes-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'kols'
        },
        (payload) => {
          const updated = payload.new as any;
          setKols(prev => prev.map(kol => {
            if (kol.id === updated.id) {
              const newUpvotes = updated.upvotes || 0;
              const newDownvotes = updated.downvotes || 0;
              const popularityRatio = newUpvotes + newDownvotes > 0 ? newUpvotes / (newUpvotes + newDownvotes) : 0.5;
              return {
                ...kol,
                upvotes: newUpvotes,
                downvotes: newDownvotes,
                totalVotes: updated.total_votes || kol.totalVotes,
                communityRating: Number(updated.rating) || kol.communityRating,
                trend: popularityRatio >= 0.6 ? "up" as const : popularityRatio <= 0.4 ? "down" as const : "stable" as const
              };
            }
            return kol;
          }));
        }
      )
      .subscribe();
    
    return () => {
      clearInterval(refreshInterval);
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchKOLs = async () => {
    // Fetch KOLs
    const { data, error } = await supabase
      .from('kols')
      .select('*')
      .order('rating', { ascending: false });
    
    if (error) {
      setLoading(false);
      return;
    }

    // Fetch PNL snapshots for current month
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const { data: pnlData } = await supabase
      .from('kol_pnl_snapshots')
      .select('*')
      .eq('month_year', currentMonth);

    // Get the most recent fetched_at timestamp
    if (pnlData && pnlData.length > 0) {
      const mostRecent = pnlData.reduce((latest, snapshot) => {
        const snapshotDate = new Date(snapshot.fetched_at);
        return snapshotDate > latest ? snapshotDate : latest;
      }, new Date(0));
      setLastPnlUpdate(mostRecent);
    }

    const mappedKols: KOL[] = (data || []).map(k => {
      const hasWallet = !!k.wallet_address && k.wallet_address.trim() !== '';
      const pnlSnapshot = pnlData?.find(p => p.kol_id === k.id);
      
      // Calculate trend based on upvotes vs downvotes
      const upvotes = (k as any).upvotes || 0;
      const downvotes = (k as any).downvotes || 0;
      const popularityRatio = upvotes + downvotes > 0 ? upvotes / (upvotes + downvotes) : 0.5;
      
      return {
        id: k.id,
        name: k.username,
        twitter: k.twitter_handle,
        avatar: k.profile_pic_url || `https://ui-avatars.com/api/?name=${k.username}&background=random`,
        walletAddress: k.wallet_address,
        hasWallet,
        pnl: pnlSnapshot?.pnl_sol ?? null,
        pnlUsd: pnlSnapshot?.pnl_usd ?? null,
        winRate: pnlSnapshot?.win_rate ?? null,
        trades: pnlSnapshot ? { 
          wins: pnlSnapshot.win_count || 0, 
          losses: pnlSnapshot.loss_count || 0 
        } : null,
        trend: popularityRatio >= 0.6 ? "up" : popularityRatio <= 0.4 ? "down" : "stable",
        communityRating: Number(k.rating) || 0,
        totalVotes: k.total_votes || 0,
        upvotes,
        downvotes
      };
    });
    setKols(mappedKols);
    setLoading(false);
  };

  const filteredKOLs = kols
    .filter(kol => 
      kol.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      kol.twitter.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'pnl') {
        return (b.pnl ?? -Infinity) - (a.pnl ?? -Infinity);
      }
      if (sortBy === 'winRate') {
        return (b.winRate ?? -Infinity) - (a.winRate ?? -Infinity);
      }
      if (sortBy === 'popularityHigh') {
        const scoreA = calculatePopularityScore(a.upvotes, a.downvotes);
        const scoreB = calculatePopularityScore(b.upvotes, b.downvotes);
        return scoreB - scoreA; // Highest greed first
      }
      if (sortBy === 'popularityLow') {
        const scoreA = calculatePopularityScore(a.upvotes, a.downvotes);
        const scoreB = calculatePopularityScore(b.upvotes, b.downvotes);
        return scoreA - scoreB; // Highest fear first
      }
      return b.communityRating - a.communityRating;
    });

  // Filter: at least 3 votes and rating >= 1 for top/rotten sections
  const eligibleKOLs = kols.filter(k => k.totalVotes >= 3 && k.communityRating >= 1);
  const topKOLs = [...eligibleKOLs].sort((a, b) => b.communityRating - a.communityRating).slice(0, 3);
  const rottenKOLs = [...eligibleKOLs].sort((a, b) => a.communityRating - b.communityRating).slice(0, 3);

  const ratingDistribution = [
    { name: '5★', value: kols.filter(k => k.communityRating >= 4.5).length, color: 'hsl(25, 80%, 50%)' },
    { name: '4★', value: kols.filter(k => k.communityRating >= 3.5 && k.communityRating < 4.5).length, color: 'hsl(90, 50%, 40%)' },
    { name: '3★', value: kols.filter(k => k.communityRating >= 2.5 && k.communityRating < 3.5).length, color: 'hsl(35, 30%, 50%)' },
    { name: '2★', value: kols.filter(k => k.communityRating >= 1.5 && k.communityRating < 2.5).length, color: 'hsl(0, 70%, 50%)' },
    { name: '1★', value: kols.filter(k => k.communityRating < 1.5).length, color: 'hsl(0, 60%, 35%)' },
  ];

  // Only show rating data (real), not mock PNL/winRate
  const performanceData = kols.slice(0, 6).map(k => ({
    name: k.name.length > 8 ? k.name.slice(0, 8) + '...' : k.name,
    rating: k.communityRating,
    votes: k.totalVotes
  }));

  const handleVote = async (id: string, type: "up" | "down", event?: React.MouseEvent) => {
    // Check client-side cooldown first
    if (isOnCooldown(id)) {
      const remaining = getCooldownRemaining(id);
      toast.error(`Please wait ${formatCooldown(remaining)} before voting again`);
      return;
    }

    const walletAddress = publicKey?.toBase58() || `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Play vote sound and fire particles
    playVoteSound(type);
    fireVoteParticles(type, event);
    
    // Call the RPC function
    const { data, error } = await supabase.rpc('vote_for_kol', {
      p_kol_id: id,
      p_wallet_address: walletAddress,
      p_vote_type: type
    });

    if (error) {
      toast.error("Failed to vote");
      return;
    }

    const result = data as { success: boolean; rating?: number; total_votes?: number; error?: string; cooldown_remaining?: number };
    
    if (!result.success) {
      if (result.error === 'Rate limited') {
        // Start local cooldown based on server response
        startCooldown(id);
        toast.error(`Please wait ${result.cooldown_remaining} minutes before voting again`);
      } else {
        toast.error(result.error || "Failed to vote");
      }
      return;
    }

    // Start cooldown after successful vote
    startCooldown(id);

    const resultWithVotes = result as { success: boolean; rating?: number; total_votes?: number; upvotes?: number; downvotes?: number };
    
    if (resultWithVotes.success) {
      setKols(prev => prev.map(kol => {
        if (kol.id === id) {
          const newUpvotes = resultWithVotes.upvotes ?? kol.upvotes;
          const newDownvotes = resultWithVotes.downvotes ?? kol.downvotes;
          const popularityRatio = newUpvotes + newDownvotes > 0 ? newUpvotes / (newUpvotes + newDownvotes) : 0.5;
          return {
            ...kol,
            totalVotes: resultWithVotes.total_votes ?? kol.totalVotes,
            communityRating: resultWithVotes.rating ?? kol.communityRating,
            upvotes: newUpvotes,
            downvotes: newDownvotes,
            trend: popularityRatio >= 0.6 ? "up" : popularityRatio <= 0.4 ? "down" : "stable"
          };
        }
        return kol;
      }));
      toast.success("Vote recorded!");
    }
  };

  const getTrendIcon = (trend: KOL["trend"]) => {
    switch (trend) {
      case "up": return <TrendingUp className="w-4 h-4 text-accent" />;
      case "down": return <TrendingDown className="w-4 h-4 text-primary" />;
      default: return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const renderStars = (rating: number, size = "w-4 h-4") => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${size} ${
            star <= rating ? "text-secondary fill-secondary" : "text-muted-foreground"
          }`}
        />
      ))}
    </div>
  );

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Award className="w-5 h-5 text-orange-600" />;
    return null;
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Trophy className="w-12 h-12 text-secondary mx-auto mb-4 animate-pulse" />
            <p className="font-pixel text-[10px] text-muted-foreground">Loading leaderboard...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (kols.length === 0) {
    return (
      <PageLayout>
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <Trophy className="w-12 h-12 text-secondary mx-auto mb-4" />
          <h1 className="font-pixel text-2xl text-foreground mb-4">KOL LEADERBOARD</h1>
          <p className="font-pixel text-[10px] text-muted-foreground mb-6">No KOLs found. Be the first to add one!</p>
          <button
            onClick={() => navigate('/add-kol')}
            className="px-6 py-3 bg-primary hover:bg-primary/80 text-primary-foreground font-pixel text-[10px] rounded transition-colors"
          >
            Add First KOL
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy className="w-8 h-8 text-secondary" />
            <h1 className="font-pixel text-2xl md:text-3xl text-foreground">
              KOL LEADERBOARD
            </h1>
          </div>
          <p className="font-pixel text-[9px] text-muted-foreground mb-3">
            Community-ranked KOLs • Click to view profiles
          </p>
          
          {/* PNL Last Updated Indicator */}
          <div className="flex items-center justify-center gap-2 text-muted-foreground flex-wrap">
            <Clock className="w-3 h-3" />
            <span className="font-pixel text-[8px]">
              PNL/Win Rate: {lastPnlUpdate ? `Updated ${formatTimeAgo(lastPnlUpdate)}` : 'Not yet fetched'}
            </span>
            <span className="font-pixel text-[7px] text-muted-foreground/60">
              (24h trades only • auto-refreshes daily)
            </span>
            {isAdmin && (
              <button
                onClick={handleRefreshPnl}
                disabled={refreshingPnl}
                className="flex items-center gap-1 px-2 py-1 bg-secondary/20 hover:bg-secondary/40 rounded text-secondary font-pixel text-[7px] transition-colors disabled:opacity-50 ml-2"
                title="Admin: Refresh PNL data now"
              >
                <RefreshCw className={`w-3 h-3 ${refreshingPnl ? 'animate-spin' : ''}`} />
                {refreshingPnl ? 'Refreshing...' : 'Refresh Now'}
              </button>
            )}
          </div>
        </motion.div>

        {/* Time Range & Top 3 Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          {/* Top 3 Best KOLs */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="stat-card p-4 rounded-sm min-h-[180px]"
          >
            <h3 className="font-pixel text-[10px] text-accent mb-3 flex items-center gap-2">
              <Crown className="w-4 h-4" />
              TOP RATED
            </h3>
            {topKOLs.length === 0 ? (
              <p className="font-pixel text-[8px] text-muted-foreground text-center py-4">
                No KOLs qualify yet. Need 3+ reviews and 1+ star rating.
              </p>
            ) : (
              <div className="space-y-2">
                {topKOLs.map((kol, i) => (
                  <div
                    key={kol.id}
                    onClick={() => navigate(`/kol/${kol.id}`)}
                    className="flex items-center gap-3 p-2 bg-muted/30 rounded cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    {getRankIcon(i)}
                    <img src={kol.avatar} alt={kol.name} className="w-8 h-8 rounded-full" />
                    <div className="flex-1 min-w-0">
                      <p className="font-pixel text-[9px] text-foreground truncate">{kol.name}</p>
                      <div className="flex items-center gap-1">
                        {renderStars(kol.communityRating, "w-3 h-3")}
                      </div>
                    </div>
                    <span className="font-pixel text-[10px] text-secondary">{kol.communityRating.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Rating Distribution Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="stat-card p-4 rounded-sm min-h-[180px]"
          >
            <h3 className="font-pixel text-[10px] text-foreground mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-secondary" />
              RATING DISTRIBUTION
            </h3>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ratingDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={50}
                    dataKey="value"
                    label={({ name }) => name}
                  >
                    {ratingDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(270, 15%, 12%)', 
                      border: '1px solid hsl(270, 15%, 20%)',
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Most Rotten KOLs */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="stat-card p-4 rounded-sm min-h-[180px]"
          >
            <h3 className="font-pixel text-[10px] text-primary mb-3 flex items-center gap-2">
              <Flame className="w-4 h-4" />
              MOST ROTTEN
            </h3>
            {rottenKOLs.length === 0 ? (
              <p className="font-pixel text-[8px] text-muted-foreground text-center py-4">
                No KOLs qualify yet. Need 3+ reviews and 1+ star rating.
              </p>
            ) : (
              <div className="space-y-2">
                {rottenKOLs.map((kol, i) => (
                  <div
                    key={kol.id}
                    onClick={() => navigate(`/kol/${kol.id}`)}
                    className="flex items-center gap-3 p-2 bg-primary/10 rounded cursor-pointer hover:bg-primary/20 transition-colors"
                  >
                    <span className="font-pixel text-[10px] text-primary">#{i + 1}</span>
                    <img src={kol.avatar} alt={kol.name} className="w-8 h-8 rounded-full" />
                    <div className="flex-1 min-w-0">
                      <p className="font-pixel text-[9px] text-foreground truncate">{kol.name}</p>
                      <div className="flex items-center gap-1">
                        {renderStars(kol.communityRating, "w-3 h-3")}
                      </div>
                    </div>
                    <span className="font-pixel text-[10px] text-primary">{kol.communityRating.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Performance Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="stat-card p-4 rounded-sm mb-8"
        >
          <h3 className="font-pixel text-sm text-foreground mb-4">Performance Comparison</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(270, 15%, 20%)" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: 'hsl(35, 15%, 55%)', fontSize: 8 }}
                  tickLine={{ stroke: 'hsl(270, 15%, 20%)' }}
                />
                <YAxis 
                  tick={{ fill: 'hsl(35, 15%, 55%)', fontSize: 8 }}
                  tickLine={{ stroke: 'hsl(270, 15%, 20%)' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(270, 15%, 12%)', 
                    border: '1px solid hsl(270, 15%, 20%)',
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: '8px'
                  }}
                />
                <Bar dataKey="rating" fill="hsl(25, 80%, 50%)" name="Rating" />
                <Bar dataKey="votes" fill="hsl(90, 50%, 40%)" name="Total Votes" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(25, 80%, 50%)' }} />
              <span className="font-pixel text-[8px] text-muted-foreground">Rating</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(90, 50%, 40%)' }} />
              <span className="font-pixel text-[8px] text-muted-foreground">Total Votes</span>
            </div>
          </div>
        </motion.div>

        {/* Search and Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 mb-6"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search KOLs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 font-pixel text-[10px] bg-card border-border"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {([
              { key: "communityRating", label: "Rating" },
              { key: "pnl", label: "PnL" },
              { key: "winRate", label: "Win %" },
              { key: "popularityHigh", label: "🟢 Greed" },
              { key: "popularityLow", label: "🔴 Fear" }
            ] as { key: SortOption; label: string }[]).map((option) => (
              <button
                key={option.key}
                onClick={() => setSortBy(option.key)}
                className={`px-4 py-2 font-pixel text-[8px] uppercase rounded transition-colors ${
                  sortBy === option.key 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Leaderboard Table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="stat-card rounded-sm overflow-hidden"
        >
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-border bg-muted/30">
            <div className="col-span-1 font-pixel text-[8px] text-muted-foreground">#</div>
            <div className="col-span-3 font-pixel text-[8px] text-muted-foreground">KOL</div>
            <div className="col-span-2 font-pixel text-[8px] text-muted-foreground text-center">PNL (SOL)</div>
            <div className="col-span-2 font-pixel text-[8px] text-muted-foreground text-center">WIN RATE</div>
            <div className="col-span-2 font-pixel text-[8px] text-muted-foreground text-center">RATING</div>
            <div className="col-span-2 font-pixel text-[8px] text-muted-foreground text-center">ACTIONS</div>
          </div>

          {/* Rows */}
          {filteredKOLs.map((kol, index) => (
            <motion.div
              key={kol.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * index }}
              onClick={() => navigate(`/kol/${kol.id}`)}
              className="grid grid-cols-12 gap-4 p-4 border-b border-border/50 hover:bg-muted/30 transition-colors items-center cursor-pointer"
            >
              <div className="col-span-1 font-pixel text-sm text-secondary flex items-center gap-1">
                {getRankIcon(index)}
                {index + 1}
              </div>
              <div className="col-span-3 flex items-center gap-3">
                <img 
                  src={kol.avatar} 
                  alt={kol.name}
                  className="w-10 h-10 rounded-full border-2 border-border hover:border-secondary transition-colors"
                />
                <div>
                  <p className="font-pixel text-[10px] text-foreground hover:text-secondary transition-colors">
                    {kol.name.length > 20 ? kol.name.slice(0, 20) + '...' : kol.name}
                  </p>
                  <span 
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`https://twitter.com/${kol.twitter.replace('@', '')}`, '_blank');
                    }}
                    className="font-pixel text-[8px] text-accent hover:underline cursor-pointer"
                  >
                    {kol.twitter.length > 20 ? kol.twitter.slice(0, 20) + '...' : kol.twitter}
                  </span>
                </div>
              </div>
              <div className="col-span-2 flex items-center justify-center gap-2">
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      {kol.hasWallet && kol.pnl !== null ? (
                        <span className={`font-pixel text-sm ${kol.pnl >= 0 ? 'text-accent' : 'text-primary'}`}>
                          {kol.pnl >= 0 ? '+' : ''}{kol.pnl.toFixed(2)}
                        </span>
                      ) : (
                        <span className="font-pixel text-sm text-muted-foreground cursor-help">--</span>
                      )}
                    </TooltipTrigger>
                    <TooltipContent className="font-pixel text-[8px]">
                      {kol.hasWallet 
                        ? kol.pnl !== null 
                          ? `$${kol.pnlUsd?.toFixed(2) || '0'} USD` 
                          : "No PNL data yet" 
                        : "Wallet not linked"}
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
                {getTrendIcon(kol.trend)}
              </div>
              <div className="col-span-2 text-center">
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      {kol.hasWallet && kol.winRate !== null ? (
                        <span className={`font-pixel text-[10px] ${kol.winRate >= 50 ? 'text-accent' : 'text-primary'}`}>
                          {kol.winRate.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="font-pixel text-[10px] text-muted-foreground cursor-help">??</span>
                      )}
                    </TooltipTrigger>
                    <TooltipContent className="font-pixel text-[8px]">
                      {kol.hasWallet 
                        ? "Win rate data coming soon" 
                        : "Wallet not linked - stats unavailable"}
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
                {kol.hasWallet && kol.trades ? (
                  <p className="font-pixel text-[7px] text-muted-foreground">
                    {kol.trades.wins}W / {kol.trades.losses}L
                  </p>
                ) : (
                  <p className="font-pixel text-[7px] text-muted-foreground">-</p>
                )}
              </div>
              <div className="col-span-2 flex flex-col items-center">
                {renderStars(kol.communityRating)}
                <span className="font-pixel text-[8px] text-muted-foreground mt-1">
                  ({kol.totalVotes} votes)
                </span>
              </div>
              <div className="col-span-2 flex items-center justify-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVote(kol.id, "up", e);
                  }}
                  className="px-3 py-1 bg-accent/20 hover:bg-accent/40 text-accent font-pixel text-[8px] rounded transition-colors"
                >
                  ▲
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVote(kol.id, "down", e);
                  }}
                  className="px-3 py-1 bg-primary/20 hover:bg-primary/40 text-primary font-pixel text-[8px] rounded transition-colors"
                >
                  ▼
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(kol.id);
                    toast.success(isFavorite(kol.id) ? "Removed from favorites" : "Added to favorites");
                  }}
                  className="p-1 rounded hover:bg-muted/50 transition-colors"
                >
                  <Heart 
                    className={`w-4 h-4 transition-colors ${
                      isFavorite(kol.id) 
                        ? "text-primary fill-primary" 
                        : "text-muted-foreground hover:text-primary"
                    }`} 
                  />
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {filteredKOLs.length === 0 && (
          <div className="text-center py-12">
            <p className="font-pixel text-[10px] text-muted-foreground">No KOLs found matching your search</p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
