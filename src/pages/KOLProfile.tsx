import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { PageLayout } from "@/components/PageLayout";
import { SocialShareButtons } from "@/components/SocialShareButtons";
import { 
  ArrowLeft, Star, TrendingUp, TrendingDown, Minus, 
  MessageSquare, ThumbsUp, ThumbsDown, ExternalLink, Wallet,
  Calendar, BarChart3, Heart
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useWallet } from "@solana/wallet-adapter-react";
import { useFavorites } from "@/hooks/useFavorites";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";

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

interface Comment {
  id: string;
  wallet_address: string;
  content: string;
  rating: number | null;
  created_at: string;
  image_url: string | null;
}

interface VoteHistory {
  date: string;
  upvotes: number;
  downvotes: number;
  rating: number;
}

// Static KOL data for fallback
const staticKOLs: Record<string, KOL> = {
  "kol-1": { id: "kol-1", username: "Leck", twitter_handle: "@leck_sol", profile_pic_url: "https://cdn.kolscan.io/profiles/98T65wcMEjoNLDTJszBHGZEX75QRe8QaANXokv4yw3Mp.png", rating: 4.2, total_votes: 156, created_at: new Date().toISOString(), wallet_address: "98T65wcMEjoNLDTJszBHGZEX75QRe8QaANXokv4yw3Mp" },
  "kol-2": { id: "kol-2", username: "Orange", twitter_handle: "@orange_trader", profile_pic_url: "https://cdn.kolscan.io/profiles/2X4H5Y9C4Fy6Pf3wpq8Q4gMvLcWvfrrwDv2bdR8AAwQv.png", rating: 3.8, total_votes: 89, created_at: new Date().toISOString(), wallet_address: "2X4H5Y9C4Fy6Pf3wpq8Q4gMvLcWvfrrwDv2bdR8AAwQv" },
  "kol-3": { id: "kol-3", username: "I̶l̷y̶", twitter_handle: "@ily_crypto", profile_pic_url: "https://cdn.kolscan.io/profiles/5XVKfruE4Zzeoz3aqBQfFMb5aSscY5nSyc6VwtQwNiid.png", rating: 4.5, total_votes: 203, created_at: new Date().toISOString(), wallet_address: "5XVKfruE4Zzeoz3aqBQfFMb5aSscY5nSyc6VwtQwNiid" },
  "kol-4": { id: "kol-4", username: "slingoor", twitter_handle: "@slingoor", profile_pic_url: "https://cdn.kolscan.io/profiles/6mWEJG9LoRdto8TwTdZxmnJpkXpTsEerizcGiCNZvzXd.png", rating: 4.0, total_votes: 67, created_at: new Date().toISOString(), wallet_address: "6mWEJG9LoRdto8TwTdZxmnJpkXpTsEerizcGiCNZvzXd" },
  "kol-5": { id: "kol-5", username: "Casino", twitter_handle: "@casino_degen", profile_pic_url: "https://cdn.kolscan.io/profiles/8rvAsDKeAcEjEkiZMug9k8v1y8mW6gQQiMobd89Uy7qR.png", rating: 2.9, total_votes: 234, created_at: new Date().toISOString(), wallet_address: "8rvAsDKeAcEjEkiZMug9k8v1y8mW6gQQiMobd89Uy7qR" },
  "kol-6": { id: "kol-6", username: "Reljoo", twitter_handle: "@reljoo_", profile_pic_url: "https://cdn.kolscan.io/profiles/FsG3BaPmRTdSrPaivbgJsFNCCa8cPfkUtk8VLWXkHpHP.png", rating: 3.1, total_votes: 112, created_at: new Date().toISOString(), wallet_address: "FsG3BaPmRTdSrPaivbgJsFNCCa8cPfkUtk8VLWXkHpHP" },
  "kol-7": { id: "kol-7", username: "peely 🍌", twitter_handle: "@peely_banana", profile_pic_url: "https://cdn.kolscan.io/profiles/BaLxyjXzATAnfm7cc5AFhWBpiwnsb71THcnofDLTWAPK.png", rating: 3.5, total_votes: 45, created_at: new Date().toISOString(), wallet_address: "BaLxyjXzATAnfm7cc5AFhWBpiwnsb71THcnofDLTWAPK" },
  "kol-8": { id: "kol-8", username: "decu", twitter_handle: "@decu_sol", profile_pic_url: "https://cdn.kolscan.io/profiles/4vw54BmAogeRV3vPKWyFet5yf8DTLcREzdSzx4rw9Ud9.png", rating: 3.7, total_votes: 178, created_at: new Date().toISOString(), wallet_address: "4vw54BmAogeRV3vPKWyFet5yf8DTLcREzdSzx4rw9Ud9" },
  "kol-9": { id: "kol-9", username: "Otta", twitter_handle: "@otta_trades", profile_pic_url: "https://cdn.kolscan.io/profiles/As7HjL7dzzvbRbaD3WCun47robib2kmAKRXMvjHkSMB5.png", rating: 2.4, total_votes: 289, created_at: new Date().toISOString(), wallet_address: "As7HjL7dzzvbRbaD3WCun47robib2kmAKRXMvjHkSMB5" },
  "kol-10": { id: "kol-10", username: "Sugus", twitter_handle: "@sugus_sol", profile_pic_url: "https://cdn.kolscan.io/profiles/2octNbV8QTtaFMJtbWhtkqMQt3deBe4D8mYcNworhv3t.png", rating: 3.9, total_votes: 134, created_at: new Date().toISOString(), wallet_address: "2octNbV8QTtaFMJtbWhtkqMQt3deBe4D8mYcNworhv3t" }
};

export default function KOLProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { publicKey } = useWallet();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [kol, setKol] = useState<KOL | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [voteHistory, setVoteHistory] = useState<VoteHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchKOL(id);
      fetchComments(id);
      generateMockVoteHistory();
    }
  }, [id]);

  const fetchKOL = async (kolId: string) => {
    // Check static KOLs first
    if (staticKOLs[kolId]) {
      setKol(staticKOLs[kolId]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('kols')
      .select('*')
      .eq('id', kolId)
      .single();

    if (error || !data) {
      toast.error("KOL not found");
      navigate('/leaderboard');
    } else {
      setKol(data);
    }
    setLoading(false);
  };

  const fetchComments = async (kolId: string) => {
    const { data } = await supabase
      .from('kol_comments')
      .select('*')
      .eq('kol_id', kolId)
      .order('created_at', { ascending: false });
    
    setComments(data || []);
  };

  const generateMockVoteHistory = () => {
    const history: VoteHistory[] = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      history.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        upvotes: Math.floor(Math.random() * 20) + 5,
        downvotes: Math.floor(Math.random() * 10) + 2,
        rating: 2.5 + Math.random() * 2.5
      });
    }
    setVoteHistory(history);
  };

  const handleVote = async (type: "up" | "down") => {
    if (!kol) return;
    const walletAddress = publicKey?.toBase58() || `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const { data, error } = await supabase.rpc('vote_for_kol', {
      p_kol_id: kol.id,
      p_wallet_address: walletAddress,
      p_vote_type: type
    });

    if (error) {
      toast.error("Failed to vote");
      return;
    }

    const result = data as { success: boolean; rating?: number; total_votes?: number };
    if (result.success && result.rating !== undefined) {
      setKol(prev => prev ? { ...prev, rating: result.rating!, total_votes: result.total_votes! } : null);
      toast.success("Vote recorded!");
    }
  };

  const renderStars = (rating: number, size = "w-5 h-5") => (
    <div className="flex gap-1">
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

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getTrend = () => {
    if (!kol) return "stable";
    if (kol.rating >= 4) return "up";
    if (kol.rating <= 2.5) return "down";
    return "stable";
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="font-pixel text-muted-foreground">Loading...</div>
        </div>
      </PageLayout>
    );
  }

  if (!kol) return null;

  const isRotten = kol.rating < 3;

  return (
    <PageLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-pixel text-[10px]">Back</span>
        </motion.button>

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="stat-card p-6 rounded-sm mb-6"
        >
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <img
                src={kol.profile_pic_url || `https://ui-avatars.com/api/?name=${kol.username}&background=random`}
                alt={kol.username}
                className={`w-32 h-32 rounded-lg border-4 ${isRotten ? 'border-primary' : 'border-secondary'} shadow-lg`}
              />
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <h1 className="font-pixel text-xl text-foreground mb-2">{kol.username}</h1>
                  <a
                    href={`https://twitter.com/${kol.twitter_handle.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-pixel text-[10px] text-accent hover:underline"
                  >
                    {kol.twitter_handle}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  {kol.wallet_address && (
                    <div className="flex items-center gap-2 mt-2">
                      <Wallet className="w-4 h-4 text-muted-foreground" />
                      <span className="font-pixel text-[8px] text-muted-foreground">
                        {kol.wallet_address.slice(0, 8)}...{kol.wallet_address.slice(-8)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Rating Badge */}
                <div className={`px-4 py-3 rounded-lg ${isRotten ? 'bg-primary/20 border border-primary/50' : 'bg-secondary/20 border border-secondary/50'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {renderStars(kol.rating, "w-4 h-4")}
                    <span className="font-pixel text-lg text-foreground">{Number(kol.rating).toFixed(1)}</span>
                  </div>
                  <p className="font-pixel text-[8px] text-muted-foreground text-center">
                    {kol.total_votes} votes
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-muted/30 p-3 rounded">
                  <p className="font-pixel text-[8px] text-muted-foreground">Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getTrend() === "up" && <TrendingUp className="w-4 h-4 text-accent" />}
                    {getTrend() === "down" && <TrendingDown className="w-4 h-4 text-primary" />}
                    {getTrend() === "stable" && <Minus className="w-4 h-4 text-muted-foreground" />}
                    <span className="font-pixel text-[10px] text-foreground capitalize">{getTrend()}</span>
                  </div>
                </div>
                <div className="bg-muted/30 p-3 rounded">
                  <p className="font-pixel text-[8px] text-muted-foreground">Reviews</p>
                  <p className="font-pixel text-sm text-foreground mt-1">{comments.length}</p>
                </div>
                <div className="bg-muted/30 p-3 rounded">
                  <p className="font-pixel text-[8px] text-muted-foreground">Joined</p>
                  <p className="font-pixel text-[10px] text-foreground mt-1">
                    {new Date(kol.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="bg-muted/30 p-3 rounded">
                  <p className="font-pixel text-[8px] text-muted-foreground">Reputation</p>
                  <p className={`font-pixel text-[10px] mt-1 ${isRotten ? 'text-primary' : 'text-accent'}`}>
                    {isRotten ? '🔥 ROTTEN' : '✨ FRESH'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-4 mt-6">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleVote("up")}
                    className="flex items-center gap-2 px-4 py-2 bg-accent/20 hover:bg-accent/40 text-accent font-pixel text-[10px] rounded transition-colors"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    Upvote
                  </button>
                  <button
                    onClick={() => handleVote("down")}
                    className="flex items-center gap-2 px-4 py-2 bg-primary/20 hover:bg-primary/40 text-primary font-pixel text-[10px] rounded transition-colors"
                  >
                    <ThumbsDown className="w-4 h-4" />
                    Downvote
                  </button>
                  <button
                    onClick={() => {
                      toggleFavorite(kol.id);
                      toast.success(isFavorite(kol.id) ? "Removed from favorites" : "Added to favorites");
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded transition-colors font-pixel text-[10px] ${
                      isFavorite(kol.id)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/30 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isFavorite(kol.id) ? "fill-current" : ""}`} />
                    {isFavorite(kol.id) ? "Favorited" : "Favorite"}
                  </button>
                </div>
                <SocialShareButtons
                  kolName={kol.username}
                  kolHandle={kol.twitter_handle}
                  rating={kol.rating}
                  isRotten={isRotten}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Rating Trend Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="stat-card p-4 rounded-sm"
          >
            <h3 className="font-pixel text-sm text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-secondary" />
              Rating Trend (30 Days)
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={voteHistory}>
                  <defs>
                    <linearGradient id="ratingGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(25, 80%, 50%)" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(25, 80%, 50%)" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(270, 15%, 20%)" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: 'hsl(35, 15%, 55%)', fontSize: 8 }}
                    tickLine={{ stroke: 'hsl(270, 15%, 20%)' }}
                  />
                  <YAxis 
                    domain={[0, 5]}
                    tick={{ fill: 'hsl(35, 15%, 55%)', fontSize: 8 }}
                    tickLine={{ stroke: 'hsl(270, 15%, 20%)' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(270, 15%, 12%)', 
                      border: '1px solid hsl(270, 15%, 20%)',
                      borderRadius: '4px',
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: '8px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="rating" 
                    stroke="hsl(25, 80%, 50%)" 
                    fill="url(#ratingGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Voting Activity Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="stat-card p-4 rounded-sm"
          >
            <h3 className="font-pixel text-sm text-foreground mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-accent" />
              Voting Activity (30 Days)
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={voteHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(270, 15%, 20%)" />
                  <XAxis 
                    dataKey="date" 
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
                      borderRadius: '4px',
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="upvotes" 
                    stroke="hsl(90, 50%, 40%)" 
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="downvotes" 
                    stroke="hsl(0, 70%, 50%)" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-accent" />
                <span className="font-pixel text-[8px] text-muted-foreground">Upvotes</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="font-pixel text-[8px] text-muted-foreground">Downvotes</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Reviews Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="stat-card p-4 rounded-sm"
        >
          <h3 className="font-pixel text-sm text-foreground mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-secondary" />
            Community Reviews ({comments.length})
          </h3>
          
          {comments.length === 0 ? (
            <p className="text-center font-pixel text-[10px] text-muted-foreground py-8">
              No reviews yet. Be the first to review!
            </p>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-muted/30 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-pixel text-[8px] text-accent">
                        {comment.wallet_address.slice(0, 6)}...{comment.wallet_address.slice(-4)}
                      </span>
                      {comment.rating && renderStars(comment.rating, "w-3 h-3")}
                    </div>
                    <span className="font-pixel text-[7px] text-muted-foreground">
                      {formatTime(comment.created_at)}
                    </span>
                  </div>
                  <p className="font-pixel text-[9px] text-foreground leading-relaxed">
                    {comment.content}
                  </p>
                  {comment.image_url && (
                    <img
                      src={comment.image_url}
                      alt="Review attachment"
                      className="mt-3 max-h-48 rounded-lg object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </PageLayout>
  );
}
