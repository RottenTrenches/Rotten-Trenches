import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/PageLayout";
import { 
  User, 
  Wallet, 
  MessageSquare, 
  Clock, 
  Camera, 
  Edit2, 
  Lock,
  Star,
  Loader2,
  ExternalLink,
  Trash2,
  Trophy,
  ChevronRight,
  Eye,
  EyeOff,
  Settings,
  Users
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { AchievementsPanel, AchievementBadge } from "@/components/AchievementBadge";
import { useAchievements, ACHIEVEMENTS, Achievement } from "@/hooks/useAchievements";
import { useFriends } from "@/hooks/useFriends";
import { AuthStatusCard } from "@/components/AuthStatusCard";

export default function Profile() {
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [isUploadingPic, setIsUploadingPic] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSocial, setShowSocial] = useState(false);
  const [showBadgeSelector, setShowBadgeSelector] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<string | null>(() => {
    return localStorage.getItem('worn_badge') || null;
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const walletAddress = publicKey?.toBase58() || "";
  const { unlockedAchievements, isUnlocked } = useAchievements(walletAddress);
  const { friends, loading: friendsLoading } = useFriends(walletAddress);

  const truncatedAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 6)}...${publicKey.toBase58().slice(-4)}`
    : null;

  // Fetch user profile from database
  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["user-profile", walletAddress],
    queryFn: async () => {
      if (!walletAddress) return null;
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("wallet_address", walletAddress)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!walletAddress,
  });

  // Update display name and selected badge when profile is fetched
  useEffect(() => {
    if (userProfile?.display_name) {
      setDisplayName(userProfile.display_name);
    }
    if (userProfile?.worn_badge !== undefined) {
      setSelectedBadge(userProfile.worn_badge);
      if (userProfile.worn_badge) {
        localStorage.setItem('worn_badge', userProfile.worn_badge);
      } else {
        localStorage.removeItem('worn_badge');
      }
    }
  }, [userProfile]);

  // Fetch user's comments
  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ["user-comments", walletAddress],
    queryFn: async () => {
      if (!walletAddress) return [];
      const { data, error } = await supabase
        .from("kol_comments")
        .select(`
          id,
          content,
          rating,
          created_at,
          image_url,
          kol_id,
          kols (
            id,
            username,
            twitter_handle,
            profile_pic_url
          )
        `)
        .eq("wallet_address", walletAddress)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!walletAddress,
  });

  // Fetch user's votes for activity log
  const { data: votes, isLoading: votesLoading } = useQuery({
    queryKey: ["user-votes", walletAddress],
    queryFn: async () => {
      if (!walletAddress) return [];
      const { data, error } = await supabase
        .from("kol_votes")
        .select(`
          id,
          vote_type,
          created_at,
          last_vote_at,
          kol_id,
          kols (
            id,
            username,
            twitter_handle,
            profile_pic_url
          )
        `)
        .eq("wallet_address", walletAddress)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!walletAddress,
  });

  // Fetch friends' profiles
  const { data: friendProfiles } = useQuery({
    queryKey: ["friend-profiles", friends],
    queryFn: async () => {
      if (friends.length === 0) return [];
      const { data, error } = await supabase
        .from("user_profiles")
        .select("wallet_address, display_name, profile_pic_url, is_verified")
        .in("wallet_address", friends);
      if (error) throw error;
      return data || [];
    },
    enabled: friends.length > 0,
  });

  // Mutation to save display name
  const saveNameMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!walletAddress) throw new Error("No wallet connected");
      
      // Check if profile exists
      if (userProfile) {
        // Update existing profile
        const { error } = await supabase
          .from("user_profiles")
          .update({ display_name: name, has_changed_name: true })
          .eq("wallet_address", walletAddress);
        if (error) throw error;
      } else {
        // Create new profile
        const { error } = await supabase
          .from("user_profiles")
          .insert({ 
            wallet_address: walletAddress, 
            display_name: name, 
            has_changed_name: true 
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile", walletAddress] });
      setIsEditingName(false);
      toast.success("Display name saved! Note: You can only change this once.");
    },
    onError: (error) => {
      console.error("Save name error:", error);
      toast.error("Failed to save display name");
    },
  });

  // Mutation to update profile picture
  const updateProfilePicMutation = useMutation({
    mutationFn: async (picUrl: string) => {
      if (!walletAddress) throw new Error("No wallet connected");
      
      if (userProfile) {
        const { error } = await supabase
          .from("user_profiles")
          .update({ profile_pic_url: picUrl })
          .eq("wallet_address", walletAddress);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_profiles")
          .insert({ wallet_address: walletAddress, profile_pic_url: picUrl });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile", walletAddress] });
      toast.success("Profile picture updated!");
    },
    onError: (error) => {
      console.error("Update profile pic error:", error);
      toast.error("Failed to update profile picture");
    },
  });

  // Mutation to toggle profile visibility
  const toggleProfileVisibilityMutation = useMutation({
    mutationFn: async (isPublic: boolean) => {
      if (!walletAddress) throw new Error("No wallet connected");
      
      if (userProfile) {
        const { error } = await supabase
          .from("user_profiles")
          .update({ is_profile_public: isPublic })
          .eq("wallet_address", walletAddress);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_profiles")
          .insert({ wallet_address: walletAddress, is_profile_public: isPublic });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile", walletAddress] });
      toast.success("Profile visibility updated!");
    },
    onError: (error) => {
      console.error("Toggle visibility error:", error);
      toast.error("Failed to update profile visibility");
    },
  });

  // Mutation to update worn badge
  const updateWornBadgeMutation = useMutation({
    mutationFn: async (badgeId: string | null) => {
      if (!walletAddress) throw new Error("No wallet connected");
      
      if (userProfile) {
        const { error } = await supabase
          .from("user_profiles")
          .update({ worn_badge: badgeId })
          .eq("wallet_address", walletAddress);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_profiles")
          .insert({ wallet_address: walletAddress, worn_badge: badgeId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile", walletAddress] });
    },
    onError: (error) => {
      console.error("Update worn badge error:", error);
      toast.error("Failed to update badge");
    },
  });

  // Mutation to delete a comment using SECURITY DEFINER function
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { data, error } = await supabase.rpc("delete_comment", {
        p_comment_id: commentId,
        p_wallet_address: walletAddress,
      });
      if (error) throw error;
      const result = data as { success: boolean; error?: string } | null;
      if (!result?.success) throw new Error(result?.error || "Failed to delete comment");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-comments", walletAddress] });
      toast.success("Comment deleted");
      setDeletingCommentId(null);
    },
    onError: (error) => {
      console.error("Delete comment error:", error);
      toast.error("Failed to delete comment");
      setDeletingCommentId(null);
    },
  });

  const handleDeleteComment = (commentId: string) => {
    if (confirm("Are you sure you want to delete this comment?")) {
      setDeletingCommentId(commentId);
      deleteCommentMutation.mutate(commentId);
    }
  };

  const handleConnectWallet = () => {
    setVisible(true);
  };

  const handleSaveName = () => {
    if (!displayName.trim()) {
      toast.error("Please enter a display name");
      return;
    }
    saveNameMutation.mutate(displayName.trim());
  };

  const handleProfilePicClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    setIsUploadingPic(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${walletAddress}-${Date.now()}.${fileExt}`;
      const filePath = `profile-pics/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("kol-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("kol-images")
        .getPublicUrl(filePath);

      updateProfilePicMutation.mutate(urlData.publicUrl);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload profile picture");
    } finally {
      setIsUploadingPic(false);
    }
  };

  const hasChangedName = userProfile?.has_changed_name ?? false;
  const profilePicUrl = userProfile?.profile_pic_url ?? null;
  const isProfilePublic = userProfile?.is_profile_public ?? true;
  const isVerified = userProfile?.is_verified ?? false;

  // Disconnected State
  if (!connected) {
    return (
      <PageLayout>
        <div className="max-w-4xl mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-3 mb-6">
              <User className="w-8 h-8 text-secondary" />
              <h1 className="font-pixel text-2xl md:text-3xl text-foreground">
                YOUR PROFILE
              </h1>
            </div>

            {/* Grayed Out Profile Card */}
            <div className="relative">
              <div className="stat-card p-8 rounded-lg opacity-40 blur-[1px] pointer-events-none select-none">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center">
                    <User className="w-12 h-12 text-muted-foreground" />
                  </div>
                  <div className="h-6 w-40 bg-muted/50 rounded" />
                  <div className="h-4 w-32 bg-muted/50 rounded" />
                </div>

                <div className="mt-8 grid grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-muted/50 rounded" />
                  ))}
                </div>
              </div>

              {/* Overlay Message */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 rounded-lg">
                <Lock className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="font-pixel text-sm text-foreground mb-2">
                  CONNECT WALLET TO ACCESS
                </p>
                <p className="font-pixel text-[9px] text-muted-foreground mb-6 max-w-xs text-center">
                  In order to view your profile, comments, and activity logs, you need to connect your wallet.
                </p>
                <Button
                  onClick={handleConnectWallet}
                  className="font-pixel text-[9px] gap-2"
                >
                  <Wallet className="w-4 h-4" />
                  CONNECT WALLET
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </PageLayout>
    );
  }

  // Connected State
  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <User className="w-8 h-8 text-secondary" />
            <h1 className="font-pixel text-2xl md:text-3xl text-foreground">
              YOUR PROFILE
            </h1>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Profile Card */}
            <div className="lg:col-span-2 space-y-6">
              {/* Profile Card */}
              <div className="stat-card p-8 rounded-lg">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  {/* Avatar with Worn Badge Preview */}
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center border-2 border-primary/50 overflow-hidden">
                      {profilePicUrl ? (
                        <img 
                          src={profilePicUrl} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-12 h-12 text-primary" />
                      )}
                    </div>
                    {/* Worn Badge Preview */}
                    {selectedBadge && ACHIEVEMENTS.find(a => a.id === selectedBadge) && (
                      <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full overflow-hidden border-2 border-background shadow-lg group/badge">
                        <img 
                          src={ACHIEVEMENTS.find(a => a.id === selectedBadge)!.badgeImage} 
                          alt="Worn Badge"
                          className="w-full h-full object-cover"
                        />
                        {/* Tooltip */}
                        <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover/badge:opacity-100 transition-opacity pointer-events-none z-50">
                          <div className="px-2 py-1 rounded bg-popover border border-border shadow-lg min-w-[120px]">
                            <p className="font-pixel text-[8px] text-foreground font-bold whitespace-nowrap">
                              {ACHIEVEMENTS.find(a => a.id === selectedBadge)!.name}
                            </p>
                            <p className="font-pixel text-[6px] text-muted-foreground">
                              {ACHIEVEMENTS.find(a => a.id === selectedBadge)!.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    <button
                      className="absolute bottom-0 left-0 p-2 bg-primary rounded-full text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                      onClick={handleProfilePicClick}
                      disabled={isUploadingPic}
                    >
                      {isUploadingPic ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-center md:text-left">
                    {/* Display Name */}
                    {isEditingName && !hasChangedName ? (
                      <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                        <Input
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Enter display name"
                          className="font-pixel text-[10px] max-w-[200px]"
                        />
                        <Button
                          size="sm"
                          onClick={handleSaveName}
                          className="font-pixel text-[8px]"
                        >
                          SAVE
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                        <h2 className="font-pixel text-lg text-foreground">
                          {displayName || "Anonymous User"}
                        </h2>
                        {!hasChangedName && (
                          <button
                            onClick={() => setIsEditingName(true)}
                            className="p-1 hover:bg-muted rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                          </button>
                        )}
                      </div>
                    )}
                    {hasChangedName && (
                      <p className="font-pixel text-[7px] text-muted-foreground mb-2">
                        Name can only be changed once
                      </p>
                    )}

                    {/* Wallet Address */}
                    <div className="flex items-center gap-2 justify-center md:justify-start">
                      <Wallet className="w-4 h-4 text-accent" />
                      <span className="font-pixel text-[10px] text-accent">
                        {truncatedAddress}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 justify-center md:justify-start mt-3">
                      <div className="text-center">
                        <p className="font-pixel text-lg text-primary">{comments?.length || 0}</p>
                        <p className="font-pixel text-[7px] text-muted-foreground">COMMENTS</p>
                      </div>
                      <div className="text-center">
                        <p className="font-pixel text-lg text-secondary">{votes?.length || 0}</p>
                        <p className="font-pixel text-[7px] text-muted-foreground">VOTES</p>
                      </div>
                      <div className="text-center">
                        <p className="font-pixel text-lg text-accent">{unlockedAchievements.length}</p>
                        <p className="font-pixel text-[7px] text-muted-foreground">BADGES</p>
                      </div>
                    </div>
                  </div>

                  {/* Social & Settings Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowSocial(!showSocial);
                        if (showSettings) setShowSettings(false);
                      }}
                      className={`p-2 rounded-lg transition-colors ${showSocial ? 'bg-secondary/20 text-secondary' : 'bg-muted/30 text-muted-foreground hover:text-foreground'}`}
                    >
                      <Users className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setShowSettings(!showSettings);
                        if (showSocial) setShowSocial(false);
                      }}
                      className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-primary/20 text-primary' : 'bg-muted/30 text-muted-foreground hover:text-foreground'}`}
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Settings Panel */}
                <AnimatePresence>
                  {showSettings && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="mt-6 pt-6 border-t border-border space-y-4">
                        <h3 className="font-pixel text-[10px] text-foreground mb-4">Profile Settings</h3>
                        
                        {/* Public Profile Toggle */}
                        <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                          <div className="flex items-center gap-3">
                            <motion.div
                              animate={{ 
                                scale: isProfilePublic ? 1.1 : 1,
                                rotate: isProfilePublic ? [0, -10, 10, 0] : 0
                              }}
                              transition={{ duration: 0.3 }}
                            >
                              {isProfilePublic ? (
                                <Eye className="w-4 h-4 text-accent" />
                              ) : (
                                <EyeOff className="w-4 h-4 text-muted-foreground" />
                              )}
                            </motion.div>
                            <div>
                              <p className="font-pixel text-[9px] text-foreground">Public Profile</p>
                              <p className="font-pixel text-[7px] text-muted-foreground">
                                {isProfilePublic ? "Others can view your profile" : "Profile is hidden from others"}
                              </p>
                            </div>
                          </div>
                          <Switch
                            checked={isProfilePublic}
                            onCheckedChange={(checked) => toggleProfileVisibilityMutation.mutate(checked)}
                            disabled={toggleProfileVisibilityMutation.isPending}
                          />
                        </div>
                        
                        {/* Wear Badge Selector */}
                        <div className="p-3 bg-muted/20 rounded-lg">
                          <button
                            onClick={() => setShowBadgeSelector(!showBadgeSelector)}
                            className="w-full flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <Trophy className="w-4 h-4 text-secondary" />
                              <div className="text-left">
                                <p className="font-pixel text-[9px] text-foreground">Wear Badge</p>
                                <p className="font-pixel text-[7px] text-muted-foreground">
                                  Display a badge on your profile and comments
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {selectedBadge && (
                                <img 
                                  src={ACHIEVEMENTS.find(a => a.id === selectedBadge)?.badgeImage} 
                                  alt="Selected badge"
                                  className="w-6 h-6 rounded"
                                />
                              )}
                              <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${showBadgeSelector ? 'rotate-90' : ''}`} />
                            </div>
                          </button>
                          
                          <AnimatePresence>
                            {showBadgeSelector && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-3 pt-3 border-t border-border/50">
                                  <div className="flex flex-wrap gap-2">
                                    {/* None option */}
                                    <button
                                      onClick={() => {
                                        setSelectedBadge(null);
                                        localStorage.removeItem('worn_badge');
                                        updateWornBadgeMutation.mutate(null);
                                        toast.success("Badge removed");
                                      }}
                                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                                        !selectedBadge 
                                          ? 'border-primary bg-primary/20' 
                                          : 'border-border hover:border-muted-foreground'
                                      }`}
                                    >
                                      <span className="font-pixel text-[7px] text-muted-foreground">None</span>
                                    </button>
                                    
                                    {/* Unlocked badges */}
                                    {ACHIEVEMENTS.filter(a => isUnlocked(a.id)).map((achievement) => (
                                      <button
                                        key={achievement.id}
                                        onClick={() => {
                                          setSelectedBadge(achievement.id);
                                          localStorage.setItem('worn_badge', achievement.id);
                                          updateWornBadgeMutation.mutate(achievement.id);
                                          toast.success(`Now wearing: ${achievement.name}`);
                                        }}
                                        className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all ${
                                          selectedBadge === achievement.id 
                                            ? 'border-primary ring-2 ring-primary/50' 
                                            : 'border-border hover:border-muted-foreground'
                                        }`}
                                      >
                                        <img 
                                          src={achievement.badgeImage} 
                                          alt={achievement.name}
                                          className="w-full h-full object-cover"
                                        />
                                      </button>
                                    ))}
                                  </div>
                                  {unlockedAchievements.length === 0 && (
                                    <p className="font-pixel text-[7px] text-muted-foreground mt-2">
                                      Unlock achievements to wear badges!
                                    </p>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        
                        {!isVerified && (
                          <p className="font-pixel text-[7px] text-muted-foreground mt-2">
                            Verify your wallet on a KOL profile to enable public profile
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Social Panel */}
                <AnimatePresence>
                  {showSocial && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="mt-6 pt-6 border-t border-border">
                        <h3 className="font-pixel text-[10px] text-foreground mb-4 flex items-center gap-2">
                          <Users className="w-4 h-4 text-secondary" />
                          Friends ({friends.length})
                        </h3>
                        {friendsLoading ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                          </div>
                        ) : friends.length === 0 ? (
                          <div className="text-center py-4">
                            <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                            <p className="font-pixel text-[8px] text-muted-foreground">
                              No friends yet. Visit verified user profiles to add friends!
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {friendProfiles?.map((friend) => (
                              <Link
                                key={friend.wallet_address}
                                to={`/user/${friend.wallet_address}`}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
                              >
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center overflow-hidden">
                                  {friend.profile_pic_url ? (
                                    <img src={friend.profile_pic_url} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <User className="w-4 h-4 text-primary" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-pixel text-[9px] text-foreground truncate">
                                    {friend.display_name || `${friend.wallet_address.slice(0, 6)}...`}
                                  </p>
                                  {friend.is_verified && (
                                    <span className="font-pixel text-[6px] text-accent">VERIFIED</span>
                                  )}
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="comments" className="w-full">
                <TabsList className="w-full justify-start bg-muted/30 mb-6">
                  <TabsTrigger value="comments" className="font-pixel text-[9px] gap-2">
                    <MessageSquare className="w-4 h-4" />
                    MY COMMENTS ({comments?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="font-pixel text-[9px] gap-2">
                    <Clock className="w-4 h-4" />
                    ACTIVITY LOG ({votes?.length || 0})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="comments">
                  <div className="stat-card p-6 rounded-lg">
                    {commentsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      </div>
                    ) : comments && comments.length > 0 ? (
                      <div className="space-y-4">
                        {comments.map((comment: any) => (
                          <div 
                            key={comment.id} 
                            className="border border-border/30 rounded-lg p-4 hover:bg-muted/20 transition-colors cursor-pointer"
                            onClick={() => navigate(`/kol/${comment.kol_id}`)}
                          >
                            <div className="flex items-start gap-4">
                              {/* KOL Info */}
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center overflow-hidden">
                                  {comment.kols?.profile_pic_url ? (
                                    <img 
                                      src={comment.kols.profile_pic_url} 
                                      alt={comment.kols.username}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <User className="w-5 h-5 text-primary" />
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-pixel text-[10px] text-foreground hover:text-primary transition-colors">
                                      @{comment.kols?.twitter_handle || "Unknown"}
                                    </span>
                                    <ExternalLink className="w-3 h-3 text-muted-foreground" />
                                  </div>
                                  {/* Delete button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteComment(comment.id);
                                    }}
                                    disabled={deletingCommentId === comment.id}
                                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                                    title="Delete comment"
                                  >
                                    {deletingCommentId === comment.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                                
                                {comment.rating && (
                                  <div className="flex items-center gap-1 mb-2">
                                    {[...Array(5)].map((_, i) => (
                                      <Star 
                                        key={i}
                                        className={`w-3 h-3 ${
                                          i < comment.rating 
                                            ? "text-yellow-400 fill-yellow-400" 
                                            : "text-muted-foreground"
                                        }`}
                                      />
                                    ))}
                                  </div>
                                )}
                                
                                <p className="font-pixel text-[9px] text-foreground/80 break-words">
                                  {comment.content}
                                </p>
                                
                                {comment.image_url && (
                                  <img 
                                    src={comment.image_url} 
                                    alt="Comment attachment"
                                    className="mt-2 max-w-[200px] rounded-lg"
                                  />
                                )}
                                
                                <p className="font-pixel text-[7px] text-muted-foreground mt-2">
                                  {format(new Date(comment.created_at), "MMM d, yyyy 'at' h:mm a")}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="font-pixel text-sm text-muted-foreground mb-2">
                          NO COMMENTS YET
                        </p>
                        <p className="font-pixel text-[8px] text-muted-foreground">
                          Your reviews on KOL profiles will appear here
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="activity">
                  <div className="stat-card p-6 rounded-lg">
                    {votesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      </div>
                    ) : votes && votes.length > 0 ? (
                      <div className="space-y-3">
                        {votes.map((vote: any) => (
                          <div 
                            key={vote.id} 
                            className="flex items-center gap-4 border border-border/30 rounded-lg p-3 hover:bg-muted/20 transition-colors"
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              vote.vote_type === "up" 
                                ? "bg-green-500/20 text-green-400" 
                                : "bg-red-500/20 text-red-400"
                            }`}>
                              <span className="font-pixel text-xs">
                                {vote.vote_type === "up" ? "👍" : "👎"}
                              </span>
                            </div>
                            
                            <Link 
                              to={`/kol/${vote.kol_id}`}
                              className="flex items-center gap-2 flex-1"
                            >
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center overflow-hidden">
                                {vote.kols?.profile_pic_url ? (
                                  <img 
                                    src={vote.kols.profile_pic_url} 
                                    alt={vote.kols.username}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <User className="w-4 h-4 text-primary" />
                                )}
                              </div>
                              <span className="font-pixel text-[9px] text-foreground hover:text-primary transition-colors">
                                @{vote.kols?.twitter_handle || "Unknown"}
                              </span>
                            </Link>
                            
                            <p className="font-pixel text-[7px] text-muted-foreground">
                              {format(new Date(vote.last_vote_at || vote.created_at), "MMM d, yyyy")}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="font-pixel text-sm text-muted-foreground mb-2">
                          NO ACTIVITY YET
                        </p>
                        <p className="font-pixel text-[8px] text-muted-foreground">
                          Your votes and interactions will be logged here
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Right Column - Auth Status & Achievements */}
            <div className="lg:col-span-1 space-y-4">
              {/* Auth Status Card */}
              <AuthStatusCard authUserId={userProfile?.auth_user_id} />

              {/* Collapsible Toggle */}
              <button
                onClick={() => setShowAchievements(!showAchievements)}
                className="w-full stat-card p-4 rounded-lg flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-secondary" />
                  <span className="font-pixel text-[10px] text-foreground">
                    Achievements ({unlockedAchievements.length}/{ACHIEVEMENTS.length})
                  </span>
                </div>
                <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${showAchievements ? 'rotate-90' : ''}`} />
              </button>

              {/* Collapsible Panel */}
              <AnimatePresence>
                {showAchievements && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <AchievementsPanel walletAddress={walletAddress} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </PageLayout>
  );
}
