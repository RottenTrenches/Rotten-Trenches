import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { SocialShareButtons } from "@/components/SocialShareButtons";
import { useFavorites } from "@/hooks/useFavorites";
import { 
  Trophy, TrendingUp, TrendingDown, Minus, Search, Star, 
  Calendar, Award, Flame, Crown, Medal, ExternalLink, Heart 
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
  walletAddress: string;
  pnl: number;
  pnlUsd: number;
  winRate: number;
  trades: { wins: number; losses: number };
  trend: "up" | "down" | "stable";
  communityRating: number;
  totalVotes: number;
}

// Pre-loaded KOLs from Kolscan
const staticKOLs: KOL[] = [
  { id: "kol-1", name: "Leck", twitter: "@leck_sol", avatar: "https://cdn.kolscan.io/profiles/98T65wcMEjoNLDTJszBHGZEX75QRe8QaANXokv4yw3Mp.png", walletAddress: "98T65w...yw3Mp", pnl: 83.38, pnlUsd: 10167.4, winRate: 69, trades: { wins: 54, losses: 24 }, trend: "up", communityRating: 4.2, totalVotes: 156 },
  { id: "kol-2", name: "Orange", twitter: "@orange_trader", avatar: "https://cdn.kolscan.io/profiles/2X4H5Y9C4Fy6Pf3wpq8Q4gMvLcWvfrrwDv2bdR8AAwQv.png", walletAddress: "2X4H5Y...AwQv", pnl: 69.28, pnlUsd: 8447.7, winRate: 64, trades: { wins: 7, losses: 4 }, trend: "up", communityRating: 3.8, totalVotes: 89 },
  { id: "kol-3", name: "I̶l̷y̶", twitter: "@ily_crypto", avatar: "https://cdn.kolscan.io/profiles/5XVKfruE4Zzeoz3aqBQfFMb5aSscY5nSyc6VwtQwNiid.png", walletAddress: "5XVKfr...Niid", pnl: 57.82, pnlUsd: 7050.9, winRate: 100, trades: { wins: 6, losses: 0 }, trend: "up", communityRating: 4.5, totalVotes: 203 },
  { id: "kol-4", name: "slingoor", twitter: "@slingoor", avatar: "https://cdn.kolscan.io/profiles/6mWEJG9LoRdto8TwTdZxmnJpkXpTsEerizcGiCNZvzXd.png", walletAddress: "6mWEJG...vzXd", pnl: 53.62, pnlUsd: 6538.8, winRate: 67, trades: { wins: 2, losses: 1 }, trend: "up", communityRating: 4.0, totalVotes: 67 },
  { id: "kol-5", name: "Casino", twitter: "@casino_degen", avatar: "https://cdn.kolscan.io/profiles/8rvAsDKeAcEjEkiZMug9k8v1y8mW6gQQiMobd89Uy7qR.png", walletAddress: "8rvAsD...y7qR", pnl: 37.62, pnlUsd: 4588.0, winRate: 35, trades: { wins: 7, losses: 13 }, trend: "down", communityRating: 2.9, totalVotes: 234 },
  { id: "kol-6", name: "Reljoo", twitter: "@reljoo_", avatar: "https://cdn.kolscan.io/profiles/FsG3BaPmRTdSrPaivbgJsFNCCa8cPfkUtk8VLWXkHpHP.png", walletAddress: "FsG3Ba...HpHP", pnl: 35.52, pnlUsd: 4331.8, winRate: 37, trades: { wins: 17, losses: 29 }, trend: "stable", communityRating: 3.1, totalVotes: 112 },
  { id: "kol-7", name: "peely 🍌", twitter: "@peely_banana", avatar: "https://cdn.kolscan.io/profiles/BaLxyjXzATAnfm7cc5AFhWBpiwnsb71THcnofDLTWAPK.png", walletAddress: "BaLxyj...WAPK", pnl: 35.00, pnlUsd: 4268.4, winRate: 100, trades: { wins: 1, losses: 0 }, trend: "up", communityRating: 3.5, totalVotes: 45 },
  { id: "kol-8", name: "decu", twitter: "@decu_sol", avatar: "https://cdn.kolscan.io/profiles/4vw54BmAogeRV3vPKWyFet5yf8DTLcREzdSzx4rw9Ud9.png", walletAddress: "4vw54B...9Ud9", pnl: 33.93, pnlUsd: 4137.7, winRate: 55, trades: { wins: 45, losses: 37 }, trend: "stable", communityRating: 3.7, totalVotes: 178 },
  { id: "kol-9", name: "Otta", twitter: "@otta_trades", avatar: "https://cdn.kolscan.io/profiles/As7HjL7dzzvbRbaD3WCun47robib2kmAKRXMvjHkSMB5.png", walletAddress: "As7HjL...SMB5", pnl: 29.40, pnlUsd: 3584.8, winRate: 32, trades: { wins: 19, losses: 41 }, trend: "down", communityRating: 2.4, totalVotes: 289 },
  { id: "kol-10", name: "Sugus", twitter: "@sugus_sol", avatar: "https://cdn.kolscan.io/profiles/2octNbV8QTtaFMJtbWhtkqMQt3deBe4D8mYcNworhv3t.png", walletAddress: "2octNb...hv3t", pnl: 25.12, pnlUsd: 3062.5, winRate: 58, trades: { wins: 32, losses: 23 }, trend: "up", communityRating: 3.9, totalVotes: 134 }
];

type TimeRange = "weekly" | "monthly" | "all";

export default function Leaderboard() {
  const { publicKey } = useWallet();
  const navigate = useNavigate();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [kols, setKols] = useState<KOL[]>(staticKOLs);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"communityRating" | "pnl" | "winRate">("communityRating");
  const [timeRange, setTimeRange] = useState<TimeRange>("all");

  const filteredKOLs = kols
    .filter(kol => 
      kol.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      kol.twitter.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => b[sortBy] - a[sortBy]);

  const topKOLs = [...kols].sort((a, b) => b.communityRating - a.communityRating).slice(0, 3);
  const rottenKOLs = [...kols].sort((a, b) => a.communityRating - b.communityRating).slice(0, 3);

  const ratingDistribution = [
    { name: '5★', value: kols.filter(k => k.communityRating >= 4.5).length, color: 'hsl(25, 80%, 50%)' },
    { name: '4★', value: kols.filter(k => k.communityRating >= 3.5 && k.communityRating < 4.5).length, color: 'hsl(90, 50%, 40%)' },
    { name: '3★', value: kols.filter(k => k.communityRating >= 2.5 && k.communityRating < 3.5).length, color: 'hsl(35, 30%, 50%)' },
    { name: '2★', value: kols.filter(k => k.communityRating >= 1.5 && k.communityRating < 2.5).length, color: 'hsl(0, 70%, 50%)' },
    { name: '1★', value: kols.filter(k => k.communityRating < 1.5).length, color: 'hsl(0, 60%, 35%)' },
  ];

  const performanceData = kols.slice(0, 6).map(k => ({
    name: k.name.length > 8 ? k.name.slice(0, 8) + '...' : k.name,
    rating: k.communityRating,
    pnl: k.pnl,
    winRate: k.winRate
  }));

  const handleVote = async (id: string, type: "up" | "down") => {
    const walletAddress = publicKey?.toBase58() || `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    setKols(prev => prev.map(kol => {
      if (kol.id === id) {
        const delta = type === "up" ? 0.1 : -0.1;
        return {
          ...kol,
          totalVotes: kol.totalVotes + 1,
          communityRating: Math.max(0, Math.min(5, kol.communityRating + delta)),
          trend: type === "up" ? "up" : "down"
        };
      }
      return kol;
    }));

    toast.success("Vote recorded!");
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
          <p className="font-pixel text-[9px] text-muted-foreground">
            Real traders from Kolscan • Community-ranked • Click to view profiles
          </p>
        </motion.div>

        {/* Time Range & Top 3 Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          {/* Top 3 Best KOLs */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="stat-card p-4 rounded-sm"
          >
            <h3 className="font-pixel text-[10px] text-accent mb-3 flex items-center gap-2">
              <Crown className="w-4 h-4" />
              TOP RATED
            </h3>
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
          </motion.div>

          {/* Rating Distribution Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="stat-card p-4 rounded-sm"
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
            className="stat-card p-4 rounded-sm"
          >
            <h3 className="font-pixel text-[10px] text-primary mb-3 flex items-center gap-2">
              <Flame className="w-4 h-4" />
              MOST ROTTEN
            </h3>
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
                <Bar dataKey="winRate" fill="hsl(90, 50%, 40%)" name="Win Rate %" />
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
              <span className="font-pixel text-[8px] text-muted-foreground">Win Rate %</span>
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
          <div className="flex gap-2">
            {([
              { key: "communityRating", label: "Rating" },
              { key: "pnl", label: "PnL" },
              { key: "winRate", label: "Win %" }
            ] as const).map((option) => (
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
              className="grid grid-cols-12 gap-4 p-4 border-b border-border/50 hover:bg-muted/20 transition-colors items-center"
            >
              <div className="col-span-1 font-pixel text-sm text-secondary flex items-center gap-1">
                {getRankIcon(index)}
                {index + 1}
              </div>
              <div className="col-span-3 flex items-center gap-3">
                <img 
                  src={kol.avatar} 
                  alt={kol.name}
                  className="w-10 h-10 rounded-full border-2 border-border cursor-pointer hover:border-secondary transition-colors"
                  onClick={() => navigate(`/kol/${kol.id}`)}
                />
                <div>
                  <p 
                    className="font-pixel text-[10px] text-foreground cursor-pointer hover:text-secondary transition-colors"
                    onClick={() => navigate(`/kol/${kol.id}`)}
                  >
                    {kol.name}
                  </p>
                  <a 
                    href={`https://twitter.com/${kol.twitter.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-pixel text-[8px] text-accent hover:underline"
                  >
                    {kol.twitter}
                  </a>
                </div>
              </div>
              <div className="col-span-2 flex items-center justify-center gap-2">
                <span className={`font-pixel text-sm ${kol.pnl >= 0 ? 'text-accent' : 'text-primary'}`}>
                  {kol.pnl >= 0 ? '+' : ''}{kol.pnl.toFixed(2)}
                </span>
                {getTrendIcon(kol.trend)}
              </div>
              <div className="col-span-2 text-center">
                <span className={`font-pixel text-[10px] ${kol.winRate >= 50 ? 'text-accent' : 'text-primary'}`}>
                  {kol.winRate}%
                </span>
                <p className="font-pixel text-[7px] text-muted-foreground">
                  {kol.trades.wins}W / {kol.trades.losses}L
                </p>
              </div>
              <div className="col-span-2 flex flex-col items-center">
                {renderStars(kol.communityRating)}
                <span className="font-pixel text-[8px] text-muted-foreground mt-1">
                  ({kol.totalVotes} votes)
                </span>
              </div>
              <div className="col-span-2 flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVote(kol.id, "up")}
                    className="px-3 py-1 bg-accent/20 hover:bg-accent/40 text-accent font-pixel text-[8px] rounded transition-colors"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => handleVote(kol.id, "down")}
                    className="px-3 py-1 bg-primary/20 hover:bg-primary/40 text-primary font-pixel text-[8px] rounded transition-colors"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => {
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
                <SocialShareButtons
                  kolName={kol.name}
                  kolHandle={kol.twitter}
                  rating={kol.communityRating}
                  isRotten={kol.communityRating < 3}
                  className="scale-75"
                />
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
