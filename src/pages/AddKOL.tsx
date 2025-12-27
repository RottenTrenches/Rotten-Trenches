import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { UserPlus, Star, MessageSquare, Send, ExternalLink, Search, ArrowUp, ArrowDown, Upload, Image, X, Wallet, Heart, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "@/integrations/supabase/client";
import { useFavorites } from "@/hooks/useFavorites";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface KOL {
  id: string;
  username: string;
  twitter_handle: string;
  profile_pic_url: string | null;
  rating: number;
  total_votes: number;
  created_at: string;
  wallet_address: string | null;
  isStatic?: boolean;
}

interface Comment {
  id: string;
  wallet_address: string;
  content: string;
  rating: number | null;
  created_at: string;
  image_url: string | null;
}

// Static leaderboard KOLs from Kolscan
const staticLeaderboardKOLs: KOL[] = [
  {
    id: "kol-1",
    username: "Leck",
    twitter_handle: "@leck_sol",
    profile_pic_url: "https://cdn.kolscan.io/profiles/98T65wcMEjoNLDTJszBHGZEX75QRe8QaANXokv4yw3Mp.png",
    rating: 4.2,
    total_votes: 156,
    created_at: new Date().toISOString(),
    wallet_address: "98T65wcMEjoNLDTJszBHGZEX75QRe8QaANXokv4yw3Mp",
    isStatic: true,
  },
  {
    id: "kol-2",
    username: "Orange",
    twitter_handle: "@orange_trader",
    profile_pic_url: "https://cdn.kolscan.io/profiles/2X4H5Y9C4Fy6Pf3wpq8Q4gMvLcWvfrrwDv2bdR8AAwQv.png",
    rating: 3.8,
    total_votes: 89,
    created_at: new Date().toISOString(),
    wallet_address: "2X4H5Y9C4Fy6Pf3wpq8Q4gMvLcWvfrrwDv2bdR8AAwQv",
    isStatic: true,
  },
  {
    id: "kol-3",
    username: "I̶l̷y̶",
    twitter_handle: "@ily_crypto",
    profile_pic_url: "https://cdn.kolscan.io/profiles/5XVKfruE4Zzeoz3aqBQfFMb5aSscY5nSyc6VwtQwNiid.png",
    rating: 4.5,
    total_votes: 203,
    created_at: new Date().toISOString(),
    wallet_address: "5XVKfruE4Zzeoz3aqBQfFMb5aSscY5nSyc6VwtQwNiid",
    isStatic: true,
  },
  {
    id: "kol-4",
    username: "slingoor",
    twitter_handle: "@slingoor",
    profile_pic_url: "https://cdn.kolscan.io/profiles/6mWEJG9LoRdto8TwTdZxmnJpkXpTsEerizcGiCNZvzXd.png",
    rating: 4.0,
    total_votes: 67,
    created_at: new Date().toISOString(),
    wallet_address: "6mWEJG9LoRdto8TwTdZxmnJpkXpTsEerizcGiCNZvzXd",
    isStatic: true,
  },
  {
    id: "kol-5",
    username: "Casino",
    twitter_handle: "@casino_degen",
    profile_pic_url: "https://cdn.kolscan.io/profiles/8rvAsDKeAcEjEkiZMug9k8v1y8mW6gQQiMobd89Uy7qR.png",
    rating: 2.9,
    total_votes: 234,
    created_at: new Date().toISOString(),
    wallet_address: "8rvAsDKeAcEjEkiZMug9k8v1y8mW6gQQiMobd89Uy7qR",
    isStatic: true,
  },
  {
    id: "kol-6",
    username: "Reljoo",
    twitter_handle: "@reljoo_",
    profile_pic_url: "https://cdn.kolscan.io/profiles/FsG3BaPmRTdSrPaivbgJsFNCCa8cPfkUtk8VLWXkHpHP.png",
    rating: 3.1,
    total_votes: 112,
    created_at: new Date().toISOString(),
    wallet_address: "FsG3BaPmRTdSrPaivbgJsFNCCa8cPfkUtk8VLWXkHpHP",
    isStatic: true,
  },
  {
    id: "kol-7",
    username: "peely 🍌",
    twitter_handle: "@peely_banana",
    profile_pic_url: "https://cdn.kolscan.io/profiles/BaLxyjXzATAnfm7cc5AFhWBpiwnsb71THcnofDLTWAPK.png",
    rating: 3.5,
    total_votes: 45,
    created_at: new Date().toISOString(),
    wallet_address: "BaLxyjXzATAnfm7cc5AFhWBpiwnsb71THcnofDLTWAPK",
    isStatic: true,
  },
  {
    id: "kol-8",
    username: "decu",
    twitter_handle: "@decu_sol",
    profile_pic_url: "https://cdn.kolscan.io/profiles/4vw54BmAogeRV3vPKWyFet5yf8DTLcREzdSzx4rw9Ud9.png",
    rating: 3.7,
    total_votes: 178,
    created_at: new Date().toISOString(),
    wallet_address: "4vw54BmAogeRV3vPKWyFet5yf8DTLcREzdSzx4rw9Ud9",
    isStatic: true,
  },
  {
    id: "kol-9",
    username: "Otta",
    twitter_handle: "@otta_trades",
    profile_pic_url: "https://cdn.kolscan.io/profiles/As7HjL7dzzvbRbaD3WCun47robib2kmAKRXMvjHkSMB5.png",
    rating: 2.4,
    total_votes: 289,
    created_at: new Date().toISOString(),
    wallet_address: "As7HjL7dzzvbRbaD3WCun47robib2kmAKRXMvjHkSMB5",
    isStatic: true,
  },
  {
    id: "kol-10",
    username: "Sugus",
    twitter_handle: "@sugus_sol",
    profile_pic_url: "https://cdn.kolscan.io/profiles/2octNbV8QTtaFMJtbWhtkqMQt3deBe4D8mYcNworhv3t.png",
    rating: 3.9,
    total_votes: 134,
    created_at: new Date().toISOString(),
    wallet_address: "2octNbV8QTtaFMJtbWhtkqMQt3deBe4D8mYcNworhv3t",
    isStatic: true,
  }
];

type SortOption = "newest" | "rating";

export default function AddKOL() {
  const { publicKey } = useWallet();
  const navigate = useNavigate();
  const { toggleFavorite, isFavorite, favorites } = useFavorites();
  const [kols, setKols] = useState<KOL[]>([]);
  const [filteredKols, setFilteredKols] = useState<KOL[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedKol, setSelectedKol] = useState<KOL | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [newRating, setNewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("rating");
  const [sortAsc, setSortAsc] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  
  // Image upload states
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [reviewImage, setReviewImage] = useState<File | null>(null);
  const [reviewImagePreview, setReviewImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const reviewImageInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    username: "",
    twitter_handle: "",
    wallet_address: ""
  });

  useEffect(() => {
    fetchKOLs();
    
    const channel = supabase
      .channel('kols-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kols' }, () => {
        fetchKOLs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter and sort effect
  useEffect(() => {
    let result = [...kols];
    
    // Apply favorites filter
    if (showFavoritesOnly) {
      result = result.filter(kol => favorites.includes(kol.id));
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(kol => 
        kol.username.toLowerCase().includes(query) ||
        kol.twitter_handle.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "newest") {
        comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === "rating") {
        comparison = Number(b.rating) - Number(a.rating);
      }
      return sortAsc ? -comparison : comparison;
    });
    
    setFilteredKols(result);
  }, [kols, searchQuery, sortBy, sortAsc, showFavoritesOnly, favorites]);

  const fetchKOLs = async () => {
    const { data, error } = await supabase
      .from('kols')
      .select('id, username, twitter_handle, profile_pic_url, rating, total_votes, created_at, wallet_address')
      .order('rating', { ascending: false });
    
    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching KOLs:', error);
      }
      setKols(staticLeaderboardKOLs);
    } else {
      const dbKols = (data || []).map(k => ({ ...k, isStatic: false }));
      const allKols = [...dbKols, ...staticLeaderboardKOLs];
      allKols.sort((a, b) => Number(b.rating) - Number(a.rating));
      setKols(allKols);
    }
    setLoading(false);
  };

  const fetchComments = async (kolId: string) => {
    const { data, error } = await supabase
      .from('kol_comments')
      .select('*')
      .eq('kol_id', kolId)
      .order('created_at', { ascending: false });
    
    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching comments:', error);
      }
    } else {
      setComments(data || []);
    }
  };

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      setProfileImage(file);
      setProfileImagePreview(URL.createObjectURL(file));
    }
  };

  const handleReviewImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      setReviewImage(file);
      setReviewImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (file: File, folder: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('kol-images')
      .upload(fileName, file);
    
    if (error) {
      console.error('Upload error:', error);
      return null;
    }
    
    const { data: urlData } = supabase.storage
      .from('kol-images')
      .getPublicUrl(fileName);
    
    return urlData.publicUrl;
  };

  const handleSubmitKOL = async () => {
    if (!formData.username || !formData.twitter_handle) {
      toast.error("Username and Twitter handle are required");
      return;
    }

    setUploading(true);
    let profilePicUrl = null;
    
    if (profileImage) {
      profilePicUrl = await uploadImage(profileImage, 'profiles');
      if (!profilePicUrl) {
        toast.error("Failed to upload profile picture");
        setUploading(false);
        return;
      }
    }

    const { error } = await supabase.from('kols').insert({
      username: formData.username,
      twitter_handle: formData.twitter_handle.startsWith('@') ? formData.twitter_handle : `@${formData.twitter_handle}`,
      profile_pic_url: profilePicUrl,
      wallet_address: formData.wallet_address || null
    });

    setUploading(false);
    
    if (error) {
      toast.error("Failed to add KOL");
      if (import.meta.env.DEV) {
        console.error(error);
      }
    } else {
      toast.success("KOL added successfully!");
      setFormData({ username: "", twitter_handle: "", wallet_address: "" });
      setProfileImage(null);
      setProfileImagePreview(null);
      setShowForm(false);
    }
  };

  const handleVote = async (kolId: string, type: "up" | "down") => {
    const walletAddress = publicKey?.toBase58() || `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const { data, error } = await supabase.rpc('vote_for_kol', {
      p_kol_id: kolId,
      p_wallet_address: walletAddress,
      p_vote_type: type
    });

    if (error) {
      toast.error("Failed to vote");
      if (import.meta.env.DEV) {
        console.error(error);
      }
      return;
    }

    const result = data as { success: boolean; error?: string; rating?: number; total_votes?: number };
    
    if (!result.success) {
      toast.error(result.error || "Failed to vote");
      return;
    }

    if (result.rating !== undefined && result.total_votes !== undefined) {
      setKols(prev => prev.map(k => 
        k.id === kolId 
          ? { ...k, rating: result.rating!, total_votes: result.total_votes! }
          : k
      ));
    }

    toast.success("Vote recorded!");
  };

  const handleOpenKol = (kol: KOL) => {
    setSelectedKol(kol);
    fetchComments(kol.id);
  };

  const handleSubmitComment = async () => {
    if (!selectedKol) return;
    if (!newComment.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }
    
    setUploading(true);
    const walletAddress = publicKey?.toBase58() || `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    let imageUrl = null;
    if (reviewImage) {
      imageUrl = await uploadImage(reviewImage, 'reviews');
    }

    const { error } = await supabase.from('kol_comments').insert({
      kol_id: selectedKol.id,
      wallet_address: walletAddress,
      content: newComment.trim(),
      rating: newRating > 0 ? newRating : null,
      image_url: imageUrl
    });

    setUploading(false);
    
    if (error) {
      toast.error("Failed to add comment");
    } else {
      toast.success("Comment added!");
      setNewComment("");
      setNewRating(0);
      setReviewImage(null);
      setReviewImagePreview(null);
      fetchComments(selectedKol.id);
    }
  };

  const renderStars = (rating: number, interactive = false, size = "w-4 h-4") => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${size} cursor-${interactive ? "pointer" : "default"} transition-colors ${
            star <= (interactive ? (hoverRating || newRating) : rating)
              ? "text-secondary fill-secondary"
              : "text-muted-foreground"
          }`}
          onMouseEnter={() => interactive && setHoverRating(star)}
          onMouseLeave={() => interactive && setHoverRating(0)}
          onClick={() => interactive && setNewRating(star)}
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

  return (
    <PageLayout>
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <UserPlus className="w-8 h-8 text-secondary" />
            <h1 className="font-pixel text-2xl md:text-3xl text-foreground">
              ADD KOL
            </h1>
          </div>
          <p className="font-pixel text-[9px] text-muted-foreground mb-6">
            Submit new KOLs to track • Vote and review • Community powered
          </p>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-primary-foreground font-pixel text-[9px] rounded transition-colors"
          >
            <UserPlus className="w-3 h-3" />
            ADD NEW KOL
          </button>
        </motion.div>

        {/* Add KOL Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="stat-card p-6 rounded-sm mb-8"
            >
              <h3 className="font-pixel text-sm text-foreground mb-4">Add New KOL</h3>
              <div className="space-y-4">
                <Input
                  placeholder="Username *"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="font-pixel text-[10px] bg-muted/30 border-border"
                />
                <Input
                  placeholder="Twitter handle (e.g. @example) *"
                  value={formData.twitter_handle}
                  onChange={(e) => setFormData({ ...formData, twitter_handle: e.target.value })}
                  className="font-pixel text-[10px] bg-muted/30 border-border"
                />
                <Input
                  placeholder="Wallet address (optional)"
                  value={formData.wallet_address}
                  onChange={(e) => setFormData({ ...formData, wallet_address: e.target.value })}
                  className="font-pixel text-[10px] bg-muted/30 border-border"
                />
                
                {/* Profile Picture Upload */}
                <div className="space-y-2">
                  <p className="font-pixel text-[8px] text-muted-foreground">Profile Picture (optional)</p>
                  <input
                    ref={profileImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProfileImageChange}
                    className="hidden"
                  />
                  {profileImagePreview ? (
                    <div className="relative inline-block">
                      <img
                        src={profileImagePreview}
                        alt="Preview"
                        className="w-20 h-20 rounded-full object-cover border-2 border-border"
                      />
                      <button
                        onClick={() => {
                          setProfileImage(null);
                          setProfileImagePreview(null);
                        }}
                        className="absolute -top-2 -right-2 p-1 bg-primary rounded-full text-primary-foreground"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => profileImageInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg hover:border-primary/50 transition-colors"
                    >
                      <Upload className="w-5 h-5 text-muted-foreground" />
                      <span className="font-pixel text-[9px] text-muted-foreground">Upload Profile Picture</span>
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSubmitKOL}
                    disabled={uploading}
                    className="px-4 py-2 bg-accent hover:bg-accent/80 text-accent-foreground font-pixel text-[9px] rounded transition-colors disabled:opacity-50"
                  >
                    {uploading ? "Uploading..." : "Submit"}
                  </button>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setProfileImage(null);
                      setProfileImagePreview(null);
                    }}
                    className="px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground font-pixel text-[9px] rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search and Filter Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col md:flex-row gap-4 mb-8"
        >
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or Twitter handle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 font-pixel text-[10px] bg-muted/30 border-border"
            />
          </div>
          
          {/* Sort Controls */}
          <div className="flex gap-2 items-center">
            {/* Favorites Toggle */}
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                showFavoritesOnly 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Heart className={`w-4 h-4 ${showFavoritesOnly ? "fill-current" : ""}`} />
            </button>
            
            {/* Sort Dropdown */}
            <Select value={sortBy} onValueChange={(val) => setSortBy(val as SortOption)}>
              <SelectTrigger className="w-32 font-pixel text-[9px] bg-muted/30 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating" className="font-pixel text-[9px]">Rating</SelectItem>
                <SelectItem value="newest" className="font-pixel text-[9px]">Newest</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Sort Direction Toggle - Arrow Only */}
            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="flex items-center justify-center w-10 h-10 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
            >
              {sortAsc ? (
                <ArrowUp className="w-4 h-4 text-accent" />
              ) : (
                <ArrowDown className="w-4 h-4 text-primary" />
              )}
            </button>
          </div>
        </motion.div>

        {/* KOLs Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="font-pixel text-[10px] text-muted-foreground">Loading KOLs...</p>
          </div>
        ) : filteredKols.length === 0 ? (
          <div className="text-center py-12">
            <p className="font-pixel text-[10px] text-muted-foreground">
              {searchQuery ? "No KOLs match your search" : "No KOLs added yet. Be the first!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredKols.map((kol, index) => (
              <motion.div
                key={kol.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 * index }}
                className="stat-card p-4 rounded-sm hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={kol.profile_pic_url || `https://ui-avatars.com/api/?name=${kol.username}&background=random`}
                    alt={kol.username}
                    className="w-12 h-12 rounded-full border-2 border-border cursor-pointer hover:border-secondary transition-colors"
                    onClick={() => navigate(`/kol/${kol.id}`)}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${kol.username}&background=random`;
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p 
                      className="font-pixel text-[10px] text-foreground truncate cursor-pointer hover:text-secondary transition-colors"
                      onClick={() => navigate(`/kol/${kol.id}`)}
                    >
                      {kol.username}
                    </p>
                    <a
                      href={`https://twitter.com/${kol.twitter_handle.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="font-pixel text-[8px] text-accent hover:underline flex items-center gap-1"
                    >
                      {kol.twitter_handle}
                      <ExternalLink className="w-2 h-2" />
                    </a>
                  </div>
                  {/* Favorite Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(kol.id);
                      toast.success(isFavorite(kol.id) ? "Removed from favorites" : "Added to favorites");
                    }}
                    className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
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
                
                {/* Wallet Address */}
                {kol.wallet_address && (
                  <div className="flex items-center gap-1 mb-2">
                    <Wallet className="w-3 h-3 text-muted-foreground" />
                    <span className="font-pixel text-[7px] text-muted-foreground">
                      {kol.wallet_address.slice(0, 6)}...{kol.wallet_address.slice(-4)}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {renderStars(Number(kol.rating))}
                    <span className="font-pixel text-[8px] text-muted-foreground">
                      ({kol.total_votes})
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleVote(kol.id, "up"); }}
                      className="px-2 py-1 bg-accent/20 hover:bg-accent/40 text-accent font-pixel text-[8px] rounded"
                    >
                      ▲
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleVote(kol.id, "down"); }}
                      className="px-2 py-1 bg-primary/20 hover:bg-primary/40 text-primary font-pixel text-[8px] rounded"
                    >
                      ▼
                    </button>
                  </div>
                </div>
                <p className="font-pixel text-[7px] text-muted-foreground mt-2">
                  Added {formatTime(kol.created_at)}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* KOL Detail Dialog - Made Larger */}
      <Dialog open={!!selectedKol} onOpenChange={() => setSelectedKol(null)}>
        <DialogContent className="max-w-3xl bg-card border-border max-h-[90vh] overflow-y-auto">
          {selectedKol && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <img
                    src={selectedKol.profile_pic_url || `https://ui-avatars.com/api/?name=${selectedKol.username}&background=random`}
                    alt={selectedKol.username}
                    className="w-20 h-20 rounded-full border-2 border-primary"
                  />
                  <div>
                    <DialogTitle className="font-pixel text-xl text-foreground">
                      {selectedKol.username}
                    </DialogTitle>
                    <a
                      href={`https://twitter.com/${selectedKol.twitter_handle.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-pixel text-[11px] text-accent hover:underline flex items-center gap-1"
                    >
                      {selectedKol.twitter_handle}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    {selectedKol.wallet_address && (
                      <div className="flex items-center gap-1 mt-1">
                        <Wallet className="w-3 h-3 text-muted-foreground" />
                        <span className="font-pixel text-[9px] text-muted-foreground">
                          {selectedKol.wallet_address.slice(0, 8)}...{selectedKol.wallet_address.slice(-6)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </DialogHeader>

              <div className="flex items-center gap-4 my-4">
                {renderStars(Number(selectedKol.rating), false, "w-5 h-5")}
                <span className="font-pixel text-[11px] text-muted-foreground">
                  {Number(selectedKol.rating).toFixed(1)} ({selectedKol.total_votes} votes)
                </span>
              </div>

              {/* Add Review */}
              <div className="border-t border-border pt-4">
                <h4 className="font-pixel text-[11px] text-foreground mb-3">Leave a Review</h4>
                <div className="mb-3">
                  <p className="font-pixel text-[9px] text-muted-foreground mb-1">Your Rating</p>
                  {renderStars(newRating, true, "w-6 h-6")}
                </div>
                <Textarea
                  placeholder="Write your review..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="font-pixel text-[11px] bg-muted/30 border-border min-h-[100px] mb-3"
                />
                
                {/* Review Image Upload */}
                <div className="mb-4">
                  <input
                    ref={reviewImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleReviewImageChange}
                    className="hidden"
                  />
                  {reviewImagePreview ? (
                    <div className="relative inline-block">
                      <img
                        src={reviewImagePreview}
                        alt="Review image"
                        className="max-w-xs max-h-40 rounded-lg border-2 border-border object-cover"
                      />
                      <button
                        onClick={() => {
                          setReviewImage(null);
                          setReviewImagePreview(null);
                        }}
                        className="absolute -top-2 -right-2 p-1 bg-primary rounded-full text-primary-foreground"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => reviewImageInputRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-lg hover:border-primary/50 transition-colors"
                    >
                      <Image className="w-4 h-4 text-muted-foreground" />
                      <span className="font-pixel text-[8px] text-muted-foreground">Add Image to Review</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={handleSubmitComment}
                  disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-primary-foreground font-pixel text-[10px] rounded disabled:opacity-50"
                >
                  <Send className="w-3 h-3" />
                  {uploading ? "Submitting..." : "Submit Review"}
                </button>
              </div>

              {/* Comments */}
              <div className="border-t border-border pt-4 mt-4">
                <h4 className="font-pixel text-[11px] text-foreground mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Reviews ({comments.length})
                </h4>
                {comments.length === 0 ? (
                  <p className="font-pixel text-[10px] text-muted-foreground">No reviews yet</p>
                ) : (
                  <div className="space-y-4 max-h-80 overflow-y-auto">
                    {comments.map((comment) => (
                      <div key={comment.id} className="bg-muted/20 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-pixel text-[9px] text-accent">
                            {comment.wallet_address.startsWith('anon_') 
                              ? 'Anonymous' 
                              : `${comment.wallet_address.slice(0, 6)}...${comment.wallet_address.slice(-4)}`
                            }
                          </span>
                          <span className="font-pixel text-[8px] text-muted-foreground">
                            {formatTime(comment.created_at)}
                          </span>
                        </div>
                        {comment.rating && (
                          <div className="mb-2">{renderStars(comment.rating, false, "w-4 h-4")}</div>
                        )}
                        <p className="font-pixel text-[10px] text-foreground/90 leading-relaxed">
                          {comment.content}
                        </p>
                        {comment.image_url && (
                          <img
                            src={comment.image_url}
                            alt="Review image"
                            className="mt-3 max-w-full max-h-60 rounded-lg border border-border cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(comment.image_url!, '_blank')}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}