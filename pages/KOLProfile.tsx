import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { PageLayout } from "@/components/PageLayout";
import { SocialShareButtons } from "@/components/SocialShareButtons";
import { WalletVerification } from "@/components/WalletVerification";
import { LatestTrades, Trade } from "@/components/LatestTrades";
import { ImageLightbox } from "@/components/ImageLightbox";
import { useVoteSound } from "@/hooks/useVoteSound";
import { useVoteParticles } from "@/hooks/useVoteParticles";
import { useVoteCooldown } from "@/hooks/useVoteCooldown";
import { 
  ArrowLeft, Star, TrendingUp, TrendingDown, Minus, 
  MessageSquare, ThumbsUp, ThumbsDown, ExternalLink, Wallet,
  Calendar, BarChart3, Heart, Send, ShieldCheck, ShieldAlert,
  ArrowRightLeft, Clock, ImagePlus, X, Ban, Reply
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useWallet } from "@solana/wallet-adapter-react";
import { useFavorites } from "@/hooks/useFavorites";
import { useBlockedKOLs } from "@/hooks/useBlockedKOLs";
import { useAchievements } from "@/hooks/useAchievements";
import { getBadgeById } from "@/hooks/useWornBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PopularityGauge } from "@/components/PopularityGauge";
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
  is_wallet_verified: boolean;
  upvotes: number;
  downvotes: number;
}

interface PNLData {
  pnl_sol: number | null;
  pnl_usd: number | null;
  win_rate: number | null;
  win_count: number | null;
  loss_count: number | null;
  total_trades: number | null;
  fetched_at: string | null;
}

interface Comment {
  id: string;
  wallet_address: string;
  content: string;
  rating: number | null;
  created_at: string;
  image_url: string | null;
  trade_signature: string | null;
  parent_comment_id: string | null;
  user_profile?: {
    display_name: string | null;
    profile_pic_url: string | null;
    is_verified: boolean | null;
    worn_badge: string | null;
  } | null;
  replies?: Comment[];
}

interface VoteHistory {
  date: string;
  upvotes: number;
  downvotes: number;
  rating: number;
}

export default function KOLProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { publicKey } = useWallet();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { toggleBlock, isBlocked } = useBlockedKOLs();
  const { incrementVotes, incrementReviews } = useAchievements();
  const { playVoteSound } = useVoteSound();
  const { fireVoteParticles } = useVoteParticles();
  const { startCooldown, getCooldownRemaining, isOnCooldown, formatCooldown } = useVoteCooldown();
  const [kol, setKol] = useState<KOL | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [voteHistory, setVoteHistory] = useState<VoteHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewContent, setReviewContent] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [activeTab, setActiveTab] = useState("reviews");
  const [citedTrade, setCitedTrade] = useState<Trade | null>(null);
  const [reviewImage, setReviewImage] = useState<File | null>(null);
  const [reviewImagePreview, setReviewImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [pnlData, setPnlData] = useState<PNLData | null>(null);
  // Mock check for $ROTTEN token - in real app, check actual token balance
  const hasRottenToken = publicKey ? true : false; // Simplified: connected wallet = verified
  const isVerified = publicKey && hasRottenToken;
  // Check if current wallet is the KOL themselves
  const isKOLOwner = publicKey && kol?.wallet_address && publicKey.toBase58() === kol.wallet_address;

  useEffect(() => {
    if (id) {
      fetchKOL(id);
      fetchComments(id);
      fetchVoteHistory(id);
      fetchPNLData(id);

      // Set up real-time subscription for vote updates
      const channel = supabase
        .channel(`kol-${id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'kols',
            filter: `id=eq.${id}`
          },
          (payload) => {
            const newData = payload.new as any;
            setKol(prev => prev ? {
              ...prev,
              upvotes: newData.upvotes || 0,
              downvotes: newData.downvotes || 0,
              rating: newData.rating || prev.rating,
              total_votes: newData.total_votes || prev.total_votes
            } : null);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [id]);

  const fetchKOL = async (kolId: string) => {
    const { data, error } = await supabase
      .from('kols')
      .select('*')
      .eq('id', kolId)
      .maybeSingle();

    if (error || !data) {
      toast.error("KOL not found");
      navigate('/add-kol');
    } else {
      setKol({
        ...data,
        upvotes: (data as any).upvotes || 0,
        downvotes: (data as any).downvotes || 0
      });
    }
    setLoading(false);
  };

  const fetchPNLData = async (kolId: string) => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const { data } = await supabase
      .from('kol_pnl_snapshots')
      .select('pnl_sol, pnl_usd, win_rate, win_count, loss_count, total_trades, fetched_at')
      .eq('kol_id', kolId)
      .eq('month_year', currentMonth)
      .maybeSingle();
    
    if (data) {
      setPnlData(data);
    }
  };

  const formatPnlTimeAgo = (dateStr: string | null): string => {
    if (!dateStr) return 'Not yet fetched';
    const date = new Date(dateStr);
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

  const fetchComments = async (kolId: string) => {
    // Fetch comments first
    const { data: commentsData } = await supabase
      .from('kol_comments')
      .select('*')
      .eq('kol_id', kolId)
      .order('created_at', { ascending: false });
    
    if (!commentsData || commentsData.length === 0) {
      setComments([]);
      return;
    }
    
    // Get unique wallet addresses
    const walletAddresses = [...new Set(commentsData.map(c => c.wallet_address))];
    
    // Fetch user profiles for these wallet addresses
    const { data: profilesData } = await supabase
      .from('user_profiles')
      .select('wallet_address, display_name, profile_pic_url, is_verified, worn_badge')
      .in('wallet_address', walletAddresses);
    
    // Map profiles to comments
    const profilesMap = new Map(
      (profilesData || []).map(p => [p.wallet_address, { display_name: p.display_name, profile_pic_url: p.profile_pic_url, is_verified: p.is_verified, worn_badge: p.worn_badge }])
    );
    
    const commentsWithProfiles = commentsData.map(comment => ({
      ...comment,
      parent_comment_id: (comment as any).parent_comment_id || null,
      user_profile: profilesMap.get(comment.wallet_address) || null,
      replies: [] as Comment[],
    }));
    
    // Build thread structure - parent comments at top, replies nested
    const commentMap = new Map<string, Comment>();
    const rootComments: Comment[] = [];
    
    // First pass: index all comments
    commentsWithProfiles.forEach(comment => {
      commentMap.set(comment.id, comment);
    });
    
    // Second pass: attach replies to parents
    commentsWithProfiles.forEach(comment => {
      if (comment.parent_comment_id && commentMap.has(comment.parent_comment_id)) {
        const parent = commentMap.get(comment.parent_comment_id)!;
        if (!parent.replies) parent.replies = [];
        parent.replies.push(comment);
      } else if (!comment.parent_comment_id) {
        rootComments.push(comment);
      }
    });
    
    // Sort replies by created_at ascending (oldest first)
    rootComments.forEach(comment => {
      if (comment.replies) {
        comment.replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      }
    });
    
    setComments(rootComments);
  };

  const fetchVoteHistory = async (kolId: string) => {
    // Fetch real vote data from kol_votes table
    const { data } = await supabase
      .from('kol_votes')
      .select('created_at, vote_type')
      .eq('kol_id', kolId)
      .order('created_at', { ascending: true });
    
    if (!data || data.length === 0) {
      setVoteHistory([]);
      return;
    }

    // Group votes by date
    const votesByDate: Record<string, { upvotes: number; downvotes: number }> = {};
    data.forEach(vote => {
      const date = new Date(vote.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!votesByDate[date]) {
        votesByDate[date] = { upvotes: 0, downvotes: 0 };
      }
      if (vote.vote_type === 'up') {
        votesByDate[date].upvotes++;
      } else {
        votesByDate[date].downvotes++;
      }
    });

    // Convert to array
    const history: VoteHistory[] = Object.entries(votesByDate).map(([date, votes]) => ({
      date,
      upvotes: votes.upvotes,
      downvotes: votes.downvotes,
      rating: 0 // We'll calculate cumulative rating if needed
    }));

    setVoteHistory(history);
  };

  const handleVote = async (type: "up" | "down", event?: React.MouseEvent) => {
    if (!kol) return;
    
    // Check if user is the KOL - prevent self-voting
    if (isKOLOwner) {
      toast.error("You cannot vote on your own profile");
      return;
    }
    
    // Check local cooldown first
    if (isOnCooldown(kol.id)) {
      const remaining = getCooldownRemaining(kol.id);
      toast.error(`Please wait ${formatCooldown(remaining)} before voting again`);
      return;
    }
    
    // Play vote sound and fire particles
    playVoteSound(type);
    fireVoteParticles(type, event);
    
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

    const result = data as { success: boolean; rating?: number; total_votes?: number; upvotes?: number; downvotes?: number; error?: string; cooldown_remaining?: number };
    
    if (!result.success) {
      if (result.error === 'Rate limited') {
        toast.error(`Please wait ${result.cooldown_remaining} minutes before voting again`);
        startCooldown(kol.id); // Sync local cooldown
      } else {
        toast.error(result.error || "Failed to vote");
      }
      return;
    }
    
    if (result.success) {
      setKol(prev => prev ? { 
        ...prev, 
        rating: result.rating ?? prev.rating, 
        total_votes: result.total_votes ?? prev.total_votes,
        upvotes: result.upvotes ?? prev.upvotes,
        downvotes: result.downvotes ?? prev.downvotes
      } : null);
      toast.success("Vote recorded!");
      startCooldown(kol.id); // Start local cooldown
      incrementVotes();
    }
  };

  const handleSubmitReview = async () => {
    console.log('Submit review clicked', { kol: !!kol, reviewContent, reviewRating });
    if (!kol || !reviewContent.trim() || reviewRating === 0) {
      toast.error("Please write a review and select a rating");
      return;
    }
    
    setSubmittingReview(true);
    const walletAddress = publicKey?.toBase58() || `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    let imageUrl: string | null = null;
    
    // Upload image if present
    if (reviewImage) {
      setUploadingImage(true);
      const fileExt = reviewImage.name.split('.').pop();
      const fileName = `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('kol-images')
        .upload(fileName, reviewImage);
      
      if (uploadError) {
        console.error('Image upload error:', uploadError);
        toast.error("Failed to upload image");
        setSubmittingReview(false);
        setUploadingImage(false);
        return;
      }
      
      const { data: urlData } = supabase.storage
        .from('kol-images')
        .getPublicUrl(fileName);
      
      imageUrl = urlData.publicUrl;
      setUploadingImage(false);
    }
    
    const { error } = await supabase
      .from('kol_comments')
      .insert({
        kol_id: kol.id,
        wallet_address: walletAddress,
        content: reviewContent,
        rating: reviewRating,
        image_url: imageUrl,
        trade_signature: citedTrade?.signature || null
      });

    if (error) {
      toast.error("Failed to submit review");
      setSubmittingReview(false);
      return;
    }

    toast.success("Review submitted!");
    incrementReviews();
    setReviewContent("");
    setReviewRating(0);
    setCitedTrade(null);
    setReviewImage(null);
    setReviewImagePreview(null);
    setSubmittingReview(false);
    fetchComments(kol.id);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error("Image must be less than 5MB");
        return;
      }
      setReviewImage(file);
      setReviewImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setReviewImage(null);
    if (reviewImagePreview) {
      URL.revokeObjectURL(reviewImagePreview);
      setReviewImagePreview(null);
    }
  };

  const renderInteractiveStars = () => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => setReviewRating(star)}
          onMouseEnter={() => setHoverRating(star)}
          onMouseLeave={() => setHoverRating(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={`w-6 h-6 cursor-pointer ${
              star <= (hoverRating || reviewRating) 
                ? "text-secondary fill-secondary" 
                : "text-muted-foreground"
            }`}
          />
        </button>
      ))}
    </div>
  );

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
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(kol.wallet_address!);
                        toast.success("Wallet address copied!");
                      }}
                      className="flex items-center gap-2 mt-2 hover:bg-muted/30 px-2 py-1 rounded transition-colors cursor-pointer group"
                      title="Click to copy"
                    >
                      <Wallet className="w-4 h-4 text-muted-foreground group-hover:text-accent" />
                      <span className="font-pixel text-[8px] text-muted-foreground group-hover:text-accent">
                        {kol.wallet_address.slice(0, 8)}...{kol.wallet_address.slice(-8)}
                      </span>
                    </button>
                  )}
                  {/* Wallet Verification */}
                  <div className="mt-3">
                    <WalletVerification 
                      kolId={kol.id}
                      kolWalletAddress={kol.wallet_address}
                      isVerified={kol.is_wallet_verified || false}
                      onVerificationComplete={() => fetchKOL(kol.id)}
                    />
                  </div>
                </div>

                {/* Rating Badge */}
                <div className={`px-6 py-4 rounded-lg ${isRotten ? 'bg-primary/20 border border-primary/50' : 'bg-secondary/20 border border-secondary/50'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    {renderStars(kol.rating, "w-5 h-5")}
                    <span className="font-pixel text-2xl text-foreground">{Number(kol.rating).toFixed(1)}</span>
                  </div>
                  <p className="font-pixel text-[10px] text-muted-foreground text-center">
                    {kol.total_votes} reviews
                  </p>
                </div>

                {/* Popularity Gauge */}
                <div className="bg-muted/20 border border-border/50 px-4 py-3 rounded-lg">
                  <PopularityGauge 
                    upvotes={kol.upvotes} 
                    downvotes={kol.downvotes} 
                    size="sm" 
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-6">
                <div className="bg-muted/30 p-3 rounded">
                  <p className="font-pixel text-[8px] text-muted-foreground">PNL (SOL)</p>
                  {pnlData?.pnl_sol !== null && pnlData?.pnl_sol !== undefined ? (
                    <p className={`font-pixel text-sm mt-1 ${pnlData.pnl_sol >= 0 ? 'text-accent' : 'text-primary'}`}>
                      {pnlData.pnl_sol >= 0 ? '+' : ''}{pnlData.pnl_sol.toFixed(2)}
                    </p>
                  ) : (
                    <p className="font-pixel text-sm text-muted-foreground mt-1">--</p>
                  )}
                  <p className="font-pixel text-[6px] text-muted-foreground/60 mt-0.5">
                    <Clock className="w-2 h-2 inline mr-0.5" />
                    {formatPnlTimeAgo(pnlData?.fetched_at || null)}
                  </p>
                </div>
                <div className="bg-muted/30 p-3 rounded">
                  <p className="font-pixel text-[8px] text-muted-foreground">Win Rate</p>
                  {pnlData?.win_rate !== null && pnlData?.win_rate !== undefined ? (
                    <p className={`font-pixel text-sm mt-1 ${pnlData.win_rate >= 50 ? 'text-accent' : 'text-primary'}`}>
                      {pnlData.win_rate.toFixed(1)}%
                    </p>
                  ) : (
                    <p className="font-pixel text-sm text-muted-foreground mt-1">--</p>
                  )}
                  {pnlData && pnlData.win_count !== null && pnlData.loss_count !== null && (
                    <p className="font-pixel text-[7px] text-muted-foreground">
                      {pnlData.win_count}W / {pnlData.loss_count}L
                    </p>
                  )}
                </div>
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
                  {isOnCooldown(kol.id) ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 text-muted-foreground font-pixel text-[10px] rounded">
                      <Clock className="w-4 h-4 animate-pulse" />
                      Cooldown: {formatCooldown(getCooldownRemaining(kol.id))}
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={(e) => handleVote("up", e)}
                        className="flex items-center gap-2 px-4 py-2 bg-accent/20 hover:bg-accent/40 text-accent font-pixel text-[10px] rounded transition-colors"
                      >
                        <ThumbsUp className="w-4 h-4" />
                        Upvote
                      </button>
                      <button
                        onClick={(e) => handleVote("down", e)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary/20 hover:bg-primary/40 text-primary font-pixel text-[10px] rounded transition-colors"
                      >
                        <ThumbsDown className="w-4 h-4" />
                        Downvote
                      </button>
                    </>
                  )}
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
                  <button
                    onClick={() => {
                      toggleBlock(kol.id);
                      toast.success(isBlocked(kol.id) ? "KOL unblocked" : "KOL blocked - they won't appear in your feed");
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded transition-colors font-pixel text-[10px] ${
                      isBlocked(kol.id)
                        ? "bg-destructive/20 text-destructive border border-destructive/30"
                        : "bg-muted/30 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Ban className="w-4 h-4" />
                    {isBlocked(kol.id) ? "Blocked" : "Block"}
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

        {/* Write Review Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="stat-card p-4 rounded-sm mb-6"
        >
          <h3 className="font-pixel text-sm text-foreground mb-4 flex items-center gap-2">
            <Send className="w-4 h-4 text-secondary" />
            Write a Review
          </h3>
          
          <div className="space-y-4">
              {/* Verification Status */}
              <div className={`flex items-center gap-2 p-2 rounded ${isVerified ? 'bg-accent/10 border border-accent/30' : 'bg-muted/30 border border-muted'}`}>
                {isVerified ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-accent" />
                    <span className="font-pixel text-[8px] text-accent">Verified Reviewer (Wallet Connected)</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4 text-muted-foreground" />
                    <span className="font-pixel text-[8px] text-muted-foreground">Unverified (Connect wallet for verified status)</span>
                  </>
                )}
              </div>
              
              {/* Star Rating */}
              <div>
                <label className="font-pixel text-[9px] text-muted-foreground mb-2 block">Your Rating</label>
                {renderInteractiveStars()}
              </div>
              
              {/* Cited Trade */}
              {citedTrade && (
                <div className="p-2 bg-secondary/10 border border-secondary/30 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-pixel text-[8px] text-secondary">Linked Trade</span>
                    <button
                      onClick={() => setCitedTrade(null)}
                      className="font-pixel text-[7px] text-muted-foreground hover:text-foreground"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-pixel text-[8px] text-foreground">
                      {citedTrade.tokenIn.symbol} → {citedTrade.tokenOut.symbol}
                    </span>
                    <a
                      href={`https://solscan.io/tx/${citedTrade.signature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-pixel text-[7px] text-accent hover:underline"
                    >
                      View TX
                    </a>
                  </div>
                </div>
              )}
              
              {/* Review Text */}
              <div>
                <label className="font-pixel text-[9px] text-muted-foreground mb-2 block">Your Review</label>
                <textarea
                  value={reviewContent}
                  onChange={(e) => setReviewContent(e.target.value.slice(0, 500))}
                  maxLength={500}
                  placeholder={citedTrade 
                    ? `Comment on this ${citedTrade.tokenIn.symbol} → ${citedTrade.tokenOut.symbol} trade...`
                    : "Share your experience with this KOL..."}
                  className="w-full p-3 bg-muted/30 border border-border rounded-lg font-pixel text-[10px] text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                  rows={3}
                />
                <p className="font-pixel text-[7px] text-muted-foreground text-right mt-1">
                  {reviewContent.length}/500
                </p>
              </div>
              
              {/* Image Upload */}
              <div>
                <label className="font-pixel text-[9px] text-muted-foreground mb-2 block">Add Image (optional)</label>
                {reviewImagePreview ? (
                  <div className="relative inline-block">
                    <img 
                      src={reviewImagePreview} 
                      alt="Preview" 
                      className="max-h-32 rounded-lg object-cover"
                    />
                    <button
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 p-1 bg-primary rounded-full text-primary-foreground hover:bg-primary/80"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 px-3 py-2 bg-muted/30 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors w-fit">
                    <ImagePlus className="w-4 h-4 text-muted-foreground" />
                    <span className="font-pixel text-[9px] text-muted-foreground">Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              
              {/* Submit Button */}
              <button
                onClick={handleSubmitReview}
                disabled={submittingReview || uploadingImage || !reviewContent.trim() || reviewRating === 0}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-secondary hover:bg-secondary/80 disabled:bg-muted disabled:cursor-not-allowed text-secondary-foreground font-pixel text-[10px] rounded transition-colors"
              >
                <Send className="w-4 h-4" />
                {uploadingImage ? "Uploading..." : submittingReview ? "Submitting..." : "Submit Review"}
              </button>
          </div>
        </motion.div>

        {/* Tabs Section: Reviews & Latest Trades */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="stat-card p-4 rounded-sm"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="reviews" className="font-pixel text-[9px]">
                <MessageSquare className="w-3 h-3 mr-2" />
                Reviews ({comments.length})
              </TabsTrigger>
              <TabsTrigger value="trades" className="font-pixel text-[9px]">
                <ArrowRightLeft className="w-3 h-3 mr-2" />
                Latest Trades
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="reviews">
              {/* Verified Filter Toggle */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-pixel text-sm text-foreground flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-secondary" />
                  Community Reviews
                </h3>
                <button
                  onClick={() => setShowVerifiedOnly(!showVerifiedOnly)}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 font-pixel text-[8px] overflow-hidden ${
                    showVerifiedOnly
                      ? 'bg-gradient-to-r from-accent/30 to-secondary/30 text-accent border border-accent/50 shadow-[0_0_15px_rgba(0,255,100,0.3)]'
                      : 'bg-muted/30 text-muted-foreground hover:bg-muted/50 border border-transparent'
                  }`}
                >
                  <ShieldCheck className={`w-3.5 h-3.5 transition-transform duration-300 ${showVerifiedOnly ? 'scale-110' : ''}`} />
                  <span>{showVerifiedOnly ? 'Verified Only' : 'All Reviews'}</span>
                  {showVerifiedOnly && (
                    <motion.div
                      layoutId="verifiedGlow"
                      className="absolute inset-0 bg-gradient-to-r from-accent/10 to-transparent rounded-full"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    />
                  )}
                </button>
              </div>
              
              {comments.filter(c => !showVerifiedOnly || c.user_profile?.is_verified).length === 0 ? (
                <p className="text-center font-pixel text-[10px] text-muted-foreground py-8">
                  {showVerifiedOnly ? 'No verified reviews yet.' : 'No reviews yet. Be the first to review!'}
                </p>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {comments
                    .filter(c => !showVerifiedOnly || c.user_profile?.is_verified)
                    .map((comment) => {
                      const isVerifiedReview = comment.user_profile?.is_verified || false;
                      const isKOLReply = kol?.wallet_address && comment.wallet_address === kol.wallet_address;
                      const isExpanded = replyingTo === comment.id;
                      
                      return (
                        <div key={comment.id} className={`rounded-lg transition-all duration-200 ${isKOLReply ? 'bg-secondary/10 border border-secondary/30' : 'bg-muted/30'}`}>
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <Link 
                                to={`/user/${comment.wallet_address}`}
                                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* User Avatar with Worn Badge */}
                                <div className="relative">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center overflow-hidden ${isKOLReply ? 'ring-2 ring-secondary' : ''} bg-gradient-to-br from-primary/30 to-secondary/30`}>
                                    {comment.user_profile?.profile_pic_url ? (
                                      <img 
                                        src={comment.user_profile.profile_pic_url} 
                                        alt="User" 
                                        className="w-full h-full object-cover"
                                      />
                                    ) : kol?.profile_pic_url && isKOLReply ? (
                                      <img 
                                        src={kol.profile_pic_url} 
                                        alt="KOL" 
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <span className="font-pixel text-[6px] text-primary">
                                        {(comment.user_profile?.display_name || comment.wallet_address).slice(0, 2).toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                  {/* Worn Badge with Tooltip */}
                                  {!isKOLReply && comment.user_profile?.worn_badge && getBadgeById(comment.user_profile.worn_badge) && (
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full overflow-hidden border border-background shadow-sm group/badge">
                                      <img 
                                        src={getBadgeById(comment.user_profile.worn_badge)!.badgeImage} 
                                        alt="Badge"
                                        className="w-full h-full object-cover"
                                      />
                                      {/* Tooltip */}
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/badge:opacity-100 transition-opacity pointer-events-none z-50">
                                        <div className="px-2 py-1 rounded bg-popover border border-border shadow-lg min-w-[100px]">
                                          <p className="font-pixel text-[7px] text-foreground font-bold whitespace-nowrap">
                                            {getBadgeById(comment.user_profile.worn_badge)!.name}
                                          </p>
                                          <p className="font-pixel text-[5px] text-muted-foreground">
                                            {getBadgeById(comment.user_profile.worn_badge)!.description}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                {/* Reply indicator (simple, no KOL badge) */}
                                {isKOLReply && (
                                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-secondary/20 rounded">
                                    <Reply className="w-3 h-3 text-secondary" />
                                  </div>
                                )}
                                {!isKOLReply && isVerifiedReview && (
                                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-accent/20 rounded">
                                    <ShieldCheck className="w-3 h-3 text-accent" />
                                    <span className="font-pixel text-[6px] text-accent">VERIFIED</span>
                                  </div>
                                )}
                                {!isKOLReply && !isVerifiedReview && (
                                  <ShieldAlert className="w-3 h-3 text-muted-foreground" />
                                )}
                                <span className={`font-pixel text-[8px] ${isKOLReply ? 'text-secondary font-bold' : isVerifiedReview ? 'text-accent hover:underline' : 'text-muted-foreground hover:text-foreground'}`}>
                                  {isKOLReply ? kol?.username : (comment.user_profile?.display_name || `${comment.wallet_address.slice(0, 6)}...${comment.wallet_address.slice(-4)}`)}
                                </span>
                                {comment.rating && renderStars(comment.rating, "w-3 h-3")}
                              </Link>
                              <span className="font-pixel text-[7px] text-muted-foreground">
                                {formatTime(comment.created_at)}
                              </span>
                            </div>
                            {/* Linked Trade */}
                            {comment.trade_signature && (
                              <a
                                href={`https://solscan.io/tx/${comment.trade_signature}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2 py-1 bg-secondary/10 border border-secondary/30 rounded text-secondary hover:bg-secondary/20 transition-colors mb-2"
                              >
                                <ArrowRightLeft className="w-3 h-3" />
                                <span className="font-pixel text-[7px]">
                                  Linked Trade: {comment.trade_signature.slice(0, 6)}...{comment.trade_signature.slice(-4)}
                                </span>
                                <ExternalLink className="w-2 h-2" />
                              </a>
                            )}
                            <p className="font-pixel text-[9px] text-foreground leading-relaxed">
                              {comment.content}
                            </p>
                            {comment.image_url && (
                              <img
                                src={comment.image_url}
                                alt="Review attachment"
                                className="mt-3 max-h-48 rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => setLightboxImage(comment.image_url)}
                              />
                            )}
                            
                            {/* Reply button for KOL owner - Reddit style */}
                            <div className="mt-3 flex items-center gap-3">
                              {isKOLOwner && !isKOLReply && (
                                <button
                                  onClick={() => setReplyingTo(isExpanded ? null : comment.id)}
                                  className="flex items-center gap-1.5 text-muted-foreground hover:text-secondary transition-colors font-pixel text-[8px]"
                                >
                                  <Reply className="w-3 h-3" />
                                  {isExpanded ? 'Cancel' : 'Reply'}
                                </button>
                              )}
                              {/* Toggle to show replies */}
                              {comment.replies && comment.replies.length > 0 && (
                                <button
                                  onClick={() => setExpandedReplies(prev => {
                                    const next = new Set(prev);
                                    if (next.has(comment.id)) next.delete(comment.id);
                                    else next.add(comment.id);
                                    return next;
                                  })}
                                  className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors font-pixel text-[8px]"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  {expandedReplies.has(comment.id) ? 'Hide' : 'Show'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                                </button>
                              )}
                            </div>
                          </div>
                          
                          {/* Nested replies - Reddit style */}
                          {comment.replies && comment.replies.length > 0 && expandedReplies.has(comment.id) && (
                            <div className="ml-6 border-l-2 border-secondary/30 pl-4 py-2 space-y-3">
                              {comment.replies.map(reply => (
                                <div key={reply.id} className="bg-secondary/5 rounded p-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Reply className="w-3 h-3 text-secondary" />
                                    <span className="font-pixel text-[8px] text-secondary">
                                      {kol?.username}
                                    </span>
                                    <span className="font-pixel text-[7px] text-muted-foreground">
                                      {formatTime(reply.created_at)}
                                    </span>
                                  </div>
                                  <p className="font-pixel text-[9px] text-foreground/90">{reply.content}</p>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Expandable reply form - Reddit style */}
                          {isExpanded && isKOLOwner && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-border/30 p-4 bg-muted/20"
                            >
                              <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 ring-2 ring-secondary">
                                  {kol?.profile_pic_url ? (
                                    <img src={kol.profile_pic_url} alt="You" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full bg-secondary/30 flex items-center justify-center">
                                      <span className="font-pixel text-[6px] text-secondary">YOU</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <textarea
                                    value={replyContent}
                                    onChange={(e) => setReplyContent(e.target.value.slice(0, 500))}
                                    placeholder="Write your reply..."
                                    className="w-full p-2 bg-muted/30 border border-border rounded font-pixel text-[9px] text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-secondary/50"
                                    rows={2}
                                  />
                                  <div className="flex items-center justify-between mt-2">
                                    <span className="font-pixel text-[7px] text-muted-foreground">
                                      {replyContent.length}/500
                                    </span>
                                    <button
                                      onClick={async () => {
                                        if (!replyContent.trim() || !publicKey || !kol) return;
                                        
                                        const { error } = await supabase
                                          .from('kol_comments')
                                          .insert({
                                            kol_id: kol.id,
                                            wallet_address: publicKey.toBase58(),
                                            content: replyContent,
                                            rating: null,
                                            parent_comment_id: comment.id
                                          });
                                        
                                        if (error) {
                                          toast.error("Failed to post reply");
                                        } else {
                                          toast.success("Reply posted!");
                                          setReplyContent("");
                                          setReplyingTo(null);
                                          // Auto-expand replies for this comment
                                          setExpandedReplies(prev => new Set([...prev, comment.id]));
                                          fetchComments(kol.id);
                                        }
                                      }}
                                      disabled={!replyContent.trim()}
                                      className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 disabled:bg-muted disabled:cursor-not-allowed text-secondary-foreground font-pixel text-[8px] rounded transition-colors flex items-center gap-1.5"
                                    >
                                      <Send className="w-3 h-3" />
                                      Reply
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="trades">
              <LatestTrades 
                walletAddress={kol.wallet_address} 
                showCiteButton={true}
                onCiteTrade={(trade) => {
                  setCitedTrade(trade);
                  setActiveTab("reviews");
                  toast.success("Trade linked! Write your review above.");
                }}
              />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
      
      {/* Image Lightbox */}
      <ImageLightbox 
        imageUrl={lightboxImage} 
        onClose={() => setLightboxImage(null)} 
      />
    </PageLayout>
  );
}
