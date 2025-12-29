import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { Users, Star, Search, Upload, X, Wallet, Heart, Tag, ExternalLink, MessageSquare, ChevronRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFavorites } from "@/hooks/useFavorites";
import { useNotificationContext } from "@/contexts/NotificationContext";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryBadge, CategoryFilter, KOL_CATEGORIES } from "@/components/CategoryBadge";
import { KolscanImport } from "@/components/KolscanImport";

const ITEMS_PER_PAGE = 15;

interface KOL {
  id: string;
  username: string;
  twitter_handle: string;
  profile_pic_url: string | null;
  rating: number;
  total_votes: number;
  created_at: string;
  wallet_address: string | null;
  categories: string[] | null;
}

type SortOption = "newest" | "oldest" | "rating_high" | "rating_low" | "votes_high" | "votes_low";

export default function AddKOL() {
  const navigate = useNavigate();
  const { toggleFavorite, isFavorite, favorites } = useFavorites();
  const { addNotification, trackAddedKol } = useNotificationContext();
  const [kols, setKols] = useState<KOL[]>([]);
  const [filteredKols, setFilteredKols] = useState<KOL[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchingPnl, setFetchingPnl] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("rating_high");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [formCategories, setFormCategories] = useState<string[]>([]);
  
  // Image upload states
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  
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
    
    // Apply category filter
    if (selectedCategories.length > 0) {
      result = result.filter(kol => 
        kol.categories && kol.categories.some(cat => selectedCategories.includes(cat))
      );
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
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "rating_high":
          return Number(b.rating) - Number(a.rating);
        case "rating_low":
          return Number(a.rating) - Number(b.rating);
        case "votes_high":
          return b.total_votes - a.total_votes;
        case "votes_low":
          return a.total_votes - b.total_votes;
        default:
          return 0;
      }
    });
    
    setFilteredKols(result);
  }, [kols, searchQuery, sortBy, showFavoritesOnly, favorites, selectedCategories]);

  const fetchKOLs = async () => {
    const { data, error } = await supabase
      .from('kols')
      .select('id, username, twitter_handle, profile_pic_url, rating, total_votes, created_at, wallet_address, categories')
      .order('rating', { ascending: false });
    
    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching KOLs:', error);
      }
      setKols([]);
    } else {
      const dbKols = (data || []).map(k => ({ ...k, categories: k.categories || [] }));
      setKols(dbKols);
    }
    setLoading(false);
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

    // Enforce max length
    if (formData.username.length > 20) {
      toast.error("Username must be 20 characters or less");
      return;
    }
    if (formData.twitter_handle.length > 20) {
      toast.error("Twitter handle must be 20 characters or less");
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

    const { data: insertedKol, error } = await supabase.from('kols').insert({
      username: formData.username,
      twitter_handle: formData.twitter_handle.startsWith('@') ? formData.twitter_handle : `@${formData.twitter_handle}`,
      profile_pic_url: profilePicUrl,
      wallet_address: formData.wallet_address || null,
      categories: formCategories.length > 0 ? formCategories : null
    }).select().single();

    setUploading(false);
    
    if (error) {
      toast.error("Failed to add KOL");
      if (import.meta.env.DEV) {
        console.error(error);
      }
    } else {
      toast.success("KOL added successfully!");
      
      // Track this KOL as added by the user for notifications
      if (insertedKol) {
        trackAddedKol(insertedKol.id);
        addNotification({
          title: 'KOL Added',
          message: `You successfully added ${insertedKol.username} to the platform`,
          type: 'kol_added',
          link: `/kol/${insertedKol.id}`,
        });
      }
      
      // If wallet address provided, trigger PNL fetch in background
      if (formData.wallet_address && insertedKol) {
        setFetchingPnl(true);
        toast.info("Fetching PNL data for new KOL...", { duration: 5000 });
        
        // Trigger the edge function to fetch PNL data
        supabase.functions.invoke('fetch-pnl-data').then(({ error: pnlError }) => {
          setFetchingPnl(false);
          if (pnlError) {
            console.error('PNL fetch error:', pnlError);
            toast.error("Failed to fetch PNL data, will retry later");
          } else {
            toast.success("PNL data fetched successfully!");
            fetchKOLs(); // Refresh the list
          }
        });
      }
      
      setFormData({ username: "", twitter_handle: "", wallet_address: "" });
      setFormCategories([]);
      setProfileImage(null);
      setProfileImagePreview(null);
      setShowForm(false);
    }
  };

  const renderStars = (rating: number, size = "w-4 h-4") => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${size} ${
            star <= rating
              ? "text-secondary fill-secondary"
              : "text-muted-foreground"
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

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div>
          {/* Main Content */}
          <div>
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <div className="flex items-center justify-center gap-3 mb-4">
                <Users className="w-8 h-8 text-secondary" />
                <h1 className="font-pixel text-2xl md:text-3xl text-foreground">
                  KOL SHOWCASE
                </h1>
              </div>
              <p className="font-pixel text-[9px] text-muted-foreground mb-6">
                Discover KOLs • Click to view profile • Leave reviews & star ratings
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-primary-foreground font-pixel text-[9px] rounded transition-colors"
                >
                  <Users className="w-3 h-3" />
                  ADD NEW KOL
                </button>
                <KolscanImport onImportSuccess={fetchKOLs} />
              </div>
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
                  {fetchingPnl && (
                    <div className="flex items-center gap-2 mb-4 p-3 bg-primary/10 rounded border border-primary/30">
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      <span className="font-pixel text-[9px] text-primary">Fetching PNL data for new KOL...</span>
                    </div>
                  )}
                  <div className="space-y-4">
                    <Input
                      placeholder="Username * (max 20 chars)"
                      maxLength={20}
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="font-pixel text-[10px] bg-muted/30 border-border"
                    />
                    <Input
                      placeholder="Twitter handle (e.g. @example) * (max 20 chars)"
                      maxLength={20}
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
                    
                    {/* Category Selection */}
                    <div className="space-y-2">
                      <p className="font-pixel text-[8px] text-muted-foreground flex items-center gap-1">
                        <Tag className="w-3 h-3" /> Categories (optional)
                      </p>
                      <CategoryFilter selected={formCategories} onChange={setFormCategories} />
                    </div>
                    
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

            {/* Category Filter */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="mb-6"
            >
              <CategoryFilter selected={selectedCategories} onChange={setSelectedCategories} />
            </motion.div>

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
                  <SelectTrigger className="w-40 font-pixel text-[9px] bg-muted/30 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rating_high" className="font-pixel text-[9px]">Highest Rating</SelectItem>
                    <SelectItem value="rating_low" className="font-pixel text-[9px]">Lowest Rating</SelectItem>
                    <SelectItem value="votes_high" className="font-pixel text-[9px]">Most Reviews</SelectItem>
                    <SelectItem value="votes_low" className="font-pixel text-[9px]">Least Reviews</SelectItem>
                    <SelectItem value="newest" className="font-pixel text-[9px]">Newest</SelectItem>
                    <SelectItem value="oldest" className="font-pixel text-[9px]">Oldest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </motion.div>

            {/* KOLs Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 justify-items-center">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="stat-card p-4 rounded-sm w-full">
                    <div className="flex items-center gap-4">
                      <Skeleton className="w-16 h-16 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-20" />
                        <div className="flex gap-1">
                          <Skeleton className="h-4 w-12 rounded-full" />
                          <Skeleton className="h-4 w-12 rounded-full" />
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-2 w-16 mt-3" />
                  </div>
                ))}
              </div>
            ) : filteredKols.length === 0 ? (
              <div className="text-center py-12">
                <p className="font-pixel text-[10px] text-muted-foreground">
                  {searchQuery ? "No KOLs match your search" : "No KOLs added yet. Be the first!"}
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 justify-items-center">
                  {filteredKols
                    .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                    .map((kol, index) => (
                    <motion.div
                      key={kol.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.03 * index }}
                      onClick={() => navigate(`/kol/${kol.id}`)}
                      className="stat-card p-4 rounded-sm hover:bg-muted/20 transition-colors cursor-pointer group w-full"
                    >
                      <div className="flex items-center gap-4">
                        <img
                          src={kol.profile_pic_url || `https://ui-avatars.com/api/?name=${kol.username}&background=random`}
                          alt={kol.username}
                          className="w-16 h-16 rounded-lg border-2 border-border group-hover:border-secondary transition-colors"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${kol.username}&background=random`;
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-pixel text-sm text-foreground truncate group-hover:text-secondary transition-colors">
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
                          
                          {/* Categories */}
                          {kol.categories && kol.categories.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {kol.categories.slice(0, 2).map(cat => (
                                <CategoryBadge key={cat} category={cat} />
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          {/* Rating */}
                          <div className="flex items-center gap-2">
                            {renderStars(Number(kol.rating))}
                            <span className="font-pixel text-xs text-foreground">
                              {Number(kol.rating).toFixed(2)}
                            </span>
                          </div>
                          
                          {/* Reviews count */}
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MessageSquare className="w-3 h-3" />
                            <span className="font-pixel text-[8px]">{kol.total_votes} reviews</span>
                          </div>
                          
                          {/* Favorite & Navigate */}
                          <div className="flex items-center gap-2">
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
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-secondary transition-colors" />
                          </div>
                        </div>
                      </div>
                      
                      <p className="font-pixel text-[7px] text-muted-foreground mt-3">
                        Added {formatTime(kol.created_at)}
                      </p>
                    </motion.div>
                  ))}
                </div>
                
                {/* Pagination */}
                {filteredKols.length > ITEMS_PER_PAGE && (
                  <div className="flex justify-center items-center gap-2 mt-8">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 font-pixel text-[9px] bg-muted/50 hover:bg-muted rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      PREV
                    </button>
                    <div className="flex gap-1">
                      {Array.from({ length: Math.ceil(filteredKols.length / ITEMS_PER_PAGE) }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i + 1)}
                          className={`w-8 h-8 font-pixel text-[9px] rounded transition-colors ${
                            currentPage === i + 1
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted/50 hover:bg-muted"
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredKols.length / ITEMS_PER_PAGE), p + 1))}
                      disabled={currentPage === Math.ceil(filteredKols.length / ITEMS_PER_PAGE)}
                      className="px-3 py-1.5 font-pixel text-[9px] bg-muted/50 hover:bg-muted rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      NEXT
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
