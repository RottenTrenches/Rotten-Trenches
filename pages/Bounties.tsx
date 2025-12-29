import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageLayout } from "@/components/PageLayout";
import { Gift, Clock, Users, Plus, CheckCircle, Wallet, Coins, Send, AlertCircle, Timer, Upload, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "@/integrations/supabase/client";
import { BountySubmissions } from "@/components/BountySubmissions";
import { useTokenTransfer } from "@/hooks/useTokenTransfer";

interface Bounty {
  id: string;
  title: string;
  description: string;
  reward: string;
  wallet_address: string;
  status: string;
  created_at: string;
  image_url?: string;
  expires_at?: string;
  tx_signature?: string;
  winner_wallet?: string;
}

export default function Bounties() {
  const { publicKey } = useWallet();
  const { transferTokens, validateAddress } = useTokenTransfer();
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState<string | null>(null);
  const [showWalletPopup, setShowWalletPopup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [processingBounty, setProcessingBounty] = useState<string | null>(null);
  const [expandedBounty, setExpandedBounty] = useState<string | null>(null);
  const [newBounty, setNewBounty] = useState({ 
    title: "", 
    description: "", 
    reward: "",
    expiresIn: ""
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submission, setSubmission] = useState({ description: "", proof: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBounties();
    
    const channel = supabase
      .channel('bounties-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bounties' }, () => {
        fetchBounties();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchBounties = async () => {
    const { data, error } = await supabase
      .from('bounties')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching bounties:', error);
      }
    } else {
      const now = new Date();
      const activeBounties = (data || []).filter(bounty => {
        if (!bounty.expires_at) return true;
        return new Date(bounty.expires_at) > now;
      });
      setBounties(activeBounties);
    }
    setLoading(false);
  };

  const handleCreateClick = () => {
    if (!publicKey) {
      setShowWalletPopup(true);
      setTimeout(() => setShowWalletPopup(false), 3000);
      return;
    }
    setShowCreateForm(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateBounty = async () => {
    if (!newBounty.title || !newBounty.description || !newBounty.reward) {
      toast.error("Please fill all required fields");
      return;
    }

    const rewardAmount = parseFloat(newBounty.reward);
    if (isNaN(rewardAmount) || rewardAmount <= 0) {
      toast.error("Please enter a valid $ROTTEN amount");
      return;
    }

    if (!publicKey) {
      setShowWalletPopup(true);
      setTimeout(() => setShowWalletPopup(false), 3000);
      return;
    }

    setSubmitting(true);

    try {
      let expiresAt: string | null = null;
      if (newBounty.expiresIn) {
        const hours = parseInt(newBounty.expiresIn);
        if (!isNaN(hours) && hours > 0) {
          const expDate = new Date();
          expDate.setHours(expDate.getHours() + hours);
          expiresAt = expDate.toISOString();
        }
      }

      let imageUrl: string | null = null;
      if (selectedImage) {
        const fileExt = selectedImage.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('bounty-images')
          .upload(fileName, selectedImage);
        
        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error("Failed to upload image");
        } else {
          const { data: urlData } = supabase.storage
            .from('bounty-images')
            .getPublicUrl(fileName);
          imageUrl = urlData.publicUrl;
        }
      }

      // Note: Token escrow would happen here in production
      // For devnet, we just create the bounty record
      // In production, you would transfer tokens to an escrow PDA

      const { error } = await supabase.from('bounties').insert({
        title: newBounty.title,
        description: newBounty.description,
        reward: `${rewardAmount} $ROTTEN`,
        wallet_address: publicKey.toBase58(),
        image_url: imageUrl,
        expires_at: expiresAt
      });

      if (error) {
        toast.error("Failed to create bounty");
        if (import.meta.env.DEV) {
          console.error(error);
        }
      } else {
        toast.success(`Bounty created with ${rewardAmount} $ROTTEN reward!`);
        setNewBounty({ title: "", description: "", reward: "", expiresIn: "" });
        setSelectedImage(null);
        setImagePreview(null);
        setShowCreateForm(false);
      }
    } catch (err) {
      console.error('Create bounty error:', err);
      toast.error("Failed to create bounty");
    } finally {
      setSubmitting(false);
    }
  };

  const [userIsVerified, setUserIsVerified] = useState(false);

  // Check if user is verified
  useEffect(() => {
    const checkVerification = async () => {
      if (!publicKey) {
        setUserIsVerified(false);
        return;
      }
      const { data } = await supabase
        .from('user_profiles')
        .select('is_verified')
        .eq('wallet_address', publicKey.toBase58())
        .maybeSingle();
      
      setUserIsVerified(data?.is_verified || false);
    };
    checkVerification();
  }, [publicKey]);

  const handleSubmitWork = (bountyId: string) => {
    if (!publicKey) {
      setShowWalletPopup(true);
      setTimeout(() => setShowWalletPopup(false), 3000);
      return;
    }
    if (!userIsVerified) {
      toast.error("Only verified users can submit work to bounties");
      return;
    }
    setShowSubmitModal(bountyId);
  };

  const handleConfirmSubmission = async () => {
    if (!submission.description) {
      toast.error("Please provide a description of your work");
      return;
    }

    if (!publicKey || !showSubmitModal) return;

    setSubmitting(true);
    
    try {
      const { error } = await supabase.from('bounty_submissions').insert({
        bounty_id: showSubmitModal,
        wallet_address: publicKey.toBase58(),
        content: submission.description,
        proof_url: submission.proof || null,
        status: 'pending'
      });

      if (error) {
        toast.error("Failed to submit work");
        console.error(error);
      } else {
        toast.success("Work submitted! Waiting for bounty creator to review.");
        setSubmission({ description: "", proof: "" });
        setShowSubmitModal(null);
      }
    } catch (err) {
      console.error('Submit work error:', err);
      toast.error("Failed to submit work");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveSubmission = async (bountyId: string, submissionId: string, winnerWallet: string) => {
    if (!publicKey) return;
    
    setProcessingBounty(bountyId);
    
    try {
      const bounty = bounties.find(b => b.id === bountyId);
      if (!bounty) {
        toast.error("Bounty not found");
        return;
      }

      // Extract reward amount from string like "100 $ROTTEN"
      const rewardMatch = bounty.reward.match(/(\d+(?:\.\d+)?)/);
      const rewardAmount = rewardMatch ? parseFloat(rewardMatch[1]) : 0;

      if (!validateAddress(winnerWallet)) {
        toast.error("Invalid winner wallet address");
        return;
      }

      // Transfer tokens to winner
      toast.info("Initiating token transfer...");
      const signature = await transferTokens(winnerWallet, rewardAmount);
      
      if (!signature) {
        toast.error("Token transfer failed or was cancelled");
        return;
      }

      // Update submission status
      const { error: submissionError } = await supabase
        .from('bounty_submissions')
        .update({ status: 'approved' })
        .eq('id', submissionId);

      if (submissionError) {
        console.error('Failed to update submission:', submissionError);
      }

      // Update bounty as completed
      const { error: bountyError } = await supabase
        .from('bounties')
        .update({ 
          status: 'completed',
          winner_wallet: winnerWallet,
          tx_signature: signature
        })
        .eq('id', bountyId);

      if (bountyError) {
        toast.error("Failed to update bounty status");
        console.error(bountyError);
      } else {
        toast.success(`Bounty completed! ${rewardAmount} $ROTTEN sent to winner.`);
        fetchBounties();
      }
    } catch (err) {
      console.error('Approve submission error:', err);
      toast.error("Failed to complete bounty");
    } finally {
      setProcessingBounty(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-accent/20 text-accent border-accent/30";
      case "in_review": return "bg-secondary/20 text-secondary border-secondary/30";
      case "completed": return "bg-muted text-muted-foreground border-border";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}h left`;
    return `${Math.floor(hours / 24)}d left`;
  };

  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto px-4 py-12 relative">
        {/* Wallet Popup */}
        <AnimatePresence>
          {showWalletPopup && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg shadow-lg flex items-center gap-3"
            >
              <Wallet className="w-5 h-5" />
              <span className="font-pixel text-[10px]">Connect your wallet first</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Gift className="w-8 h-8 text-secondary" />
            <h1 className="font-pixel text-2xl md:text-3xl text-foreground">
              BOUNTIES
            </h1>
          </div>
          <p className="font-pixel text-[9px] text-muted-foreground mb-2">
            Post tasks • Complete challenges • Earn $ROTTEN rewards
          </p>
          <div className="flex items-center justify-center gap-2 mb-6">
            <Coins className="w-4 h-4 text-secondary" />
            <span className="font-pixel text-[8px] text-secondary">
              Rewards paid in $ROTTEN tokens upon completion
            </span>
          </div>
          <button
            onClick={handleCreateClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-primary-foreground font-pixel text-[9px] rounded transition-colors"
          >
            <Plus className="w-3 h-3" />
            CREATE BOUNTY
          </button>
        </motion.div>

        {/* Create Form */}
        <AnimatePresence>
          {showCreateForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="stat-card p-6 rounded-sm mb-8"
            >
              <h3 className="font-pixel text-sm text-foreground mb-4 flex items-center gap-2">
                <Coins className="w-4 h-4 text-secondary" />
                Create New Bounty
              </h3>
              <div className="space-y-4">
                <Input
                  placeholder="Bounty title..."
                  value={newBounty.title}
                  onChange={(e) => setNewBounty({ ...newBounty, title: e.target.value })}
                  className="font-pixel text-[10px] bg-muted/30 border-border"
                />
                <Textarea
                  placeholder="Describe what research/work is needed..."
                  value={newBounty.description}
                  onChange={(e) => setNewBounty({ ...newBounty, description: e.target.value })}
                  className="font-pixel text-[10px] bg-muted/30 border-border min-h-[100px]"
                />
                
                {/* Image Upload */}
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-4 border-2 border-dashed border-border rounded-lg hover:border-secondary/50 transition-colors flex flex-col items-center justify-center gap-2"
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="max-h-32 rounded object-cover" />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-muted-foreground" />
                        <span className="font-pixel text-[9px] text-muted-foreground">
                          Click to upload image (optional)
                        </span>
                      </>
                    )}
                  </button>
                  {selectedImage && (
                    <button
                      onClick={() => {
                        setSelectedImage(null);
                        setImagePreview(null);
                      }}
                      className="mt-2 font-pixel text-[8px] text-primary hover:underline"
                    >
                      Remove image
                    </button>
                  )}
                </div>

                {/* Reward Amount */}
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="Reward amount"
                    value={newBounty.reward}
                    onChange={(e) => setNewBounty({ ...newBounty, reward: e.target.value })}
                    className="font-pixel text-[10px] bg-muted/30 border-border pr-20"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-pixel text-[9px] text-secondary">
                    $ROTTEN
                  </span>
                </div>

                {/* Expiration Time */}
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="Time limit (optional)"
                    value={newBounty.expiresIn}
                    onChange={(e) => setNewBounty({ ...newBounty, expiresIn: e.target.value })}
                    className="font-pixel text-[10px] bg-muted/30 border-border pr-20"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-pixel text-[9px] text-muted-foreground flex items-center gap-1">
                    <Timer className="w-3 h-3" />
                    hours
                  </span>
                </div>
                <p className="font-pixel text-[8px] text-muted-foreground -mt-2">
                  Leave empty for no expiration. Expired bounties are automatically deleted.
                </p>

                <div className="flex items-start gap-2 p-3 bg-secondary/10 rounded border border-secondary/20">
                  <AlertCircle className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                  <p className="font-pixel text-[8px] text-muted-foreground">
                    When you approve a submission, tokens will be transferred directly from your wallet to the winner.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateBounty}
                    disabled={submitting}
                    className="px-4 py-2 bg-accent hover:bg-accent/80 text-accent-foreground font-pixel text-[9px] rounded transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <Coins className="w-3 h-3" />
                    {submitting ? "Creating..." : "Create Bounty"}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setSelectedImage(null);
                      setImagePreview(null);
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

        {/* Submit Work Modal */}
        <AnimatePresence>
          {showSubmitModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowSubmitModal(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md stat-card rounded-lg p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="font-pixel text-sm text-foreground mb-4 flex items-center gap-2">
                  <Send className="w-4 h-4 text-accent" />
                  Submit Your Work
                </h3>
                <div className="space-y-4">
                  <Textarea
                    placeholder="Describe what you did and how it solves the bounty..."
                    value={submission.description}
                    onChange={(e) => setSubmission({ ...submission, description: e.target.value })}
                    className="font-pixel text-[10px] bg-muted/30 border-border min-h-[80px]"
                  />
                  <Input
                    placeholder="Link to proof (GitHub, doc, demo, etc.)"
                    value={submission.proof}
                    onChange={(e) => setSubmission({ ...submission, proof: e.target.value })}
                    className="font-pixel text-[10px] bg-muted/30 border-border"
                  />
                  <div className="flex items-start gap-2 p-3 bg-accent/10 rounded border border-accent/20">
                    <Coins className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <p className="font-pixel text-[8px] text-muted-foreground">
                      Once the bounty creator approves your work, the $ROTTEN reward will be sent to your connected wallet.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleConfirmSubmission}
                      disabled={submitting}
                      className="flex-1 px-4 py-2 bg-accent hover:bg-accent/80 text-accent-foreground font-pixel text-[9px] rounded transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          Submit Work
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowSubmitModal(null)}
                      className="px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground font-pixel text-[9px] rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bounties List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="font-pixel text-[10px] text-muted-foreground">Loading bounties...</p>
          </div>
        ) : bounties.length === 0 ? (
          <div className="text-center py-12">
            <Coins className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="font-pixel text-[10px] text-muted-foreground">No bounties yet. Create the first one!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bounties.map((bounty, index) => {
              const isExpanded = expandedBounty === bounty.id;
              return (
                <motion.div
                  key={bounty.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index }}
                  layout
                  className="stat-card rounded-sm overflow-hidden cursor-pointer"
                  onClick={() => setExpandedBounty(isExpanded ? null : bounty.id)}
                >
                  {/* Collapsed Thread View */}
                  <motion.div 
                    layout
                    className={`p-4 ${isExpanded ? 'border-b border-border/50' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Small Image Thumbnail */}
                      {bounty.image_url && (
                        <motion.div 
                          layout
                          className={`flex-shrink-0 rounded overflow-hidden border border-border/50 ${isExpanded ? 'w-20 h-20' : 'w-12 h-12'}`}
                          style={{ transition: 'width 0.3s, height 0.3s' }}
                        >
                          <img 
                            src={bounty.image_url} 
                            alt={bounty.title}
                            className="w-full h-full object-cover"
                          />
                        </motion.div>
                      )}
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-pixel text-[10px] text-foreground truncate">{bounty.title}</h3>
                          <span className={`px-2 py-0.5 font-pixel text-[6px] uppercase rounded border ${getStatusColor(bounty.status)}`}>
                            {bounty.status.replace("_", " ")}
                          </span>
                        </div>
                        
                        {/* Meta info - always visible */}
                        <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Coins className="w-3 h-3 text-secondary" />
                            <span className="font-pixel text-[8px] text-secondary font-bold">{bounty.reward}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span className="font-pixel text-[7px]">{formatTime(bounty.created_at)}</span>
                          </div>
                          {bounty.expires_at && (
                            <div className="flex items-center gap-1 text-primary">
                              <Timer className="w-3 h-3" />
                              <span className="font-pixel text-[7px]">{formatTimeRemaining(bounty.expires_at)}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span className="font-pixel text-[7px]">
                              {bounty.wallet_address.slice(0, 4)}...{bounty.wallet_address.slice(-4)}
                            </span>
                          </div>
                        </div>

                        {/* Preview description when collapsed */}
                        {!isExpanded && (
                          <p className="font-pixel text-[8px] text-muted-foreground mt-2 line-clamp-1">
                            {bounty.description}
                          </p>
                        )}
                      </div>

                      {/* Expand indicator */}
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex-shrink-0"
                      >
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      </motion.div>
                    </div>
                  </motion.div>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 pt-3 space-y-4">
                          {/* Full Description */}
                          <p className="font-pixel text-[9px] text-muted-foreground leading-relaxed">
                            {bounty.description}
                          </p>

                          {/* Winner info for completed bounties */}
                          {bounty.status === 'completed' && bounty.winner_wallet && (
                            <div className="p-3 bg-accent/10 rounded border border-accent/20">
                              <span className="font-pixel text-[8px] text-accent">
                                Winner: {bounty.winner_wallet.slice(0, 4)}...{bounty.winner_wallet.slice(-4)}
                              </span>
                              {bounty.tx_signature && (
                                <a 
                                  href={`https://solscan.io/tx/${bounty.tx_signature}?cluster=devnet`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-2 font-pixel text-[7px] text-accent hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  View TX
                                </a>
                              )}
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-2">
                            {bounty.status === "open" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSubmitWork(bounty.id);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-accent/20 hover:bg-accent/40 text-accent font-pixel text-[8px] rounded transition-colors border border-accent/30"
                              >
                                <Send className="w-3 h-3" />
                                SUBMIT WORK
                              </button>
                            )}
                            {bounty.status === "completed" && (
                              <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 text-muted-foreground font-pixel text-[8px] rounded">
                                <CheckCircle className="w-3 h-3" />
                                COMPLETED
                              </div>
                            )}
                          </div>

                          {/* Submissions section for open bounties */}
                          {bounty.status === "open" && (
                            <div className="pt-3 border-t border-border/30">
                              <BountySubmissions
                                bountyId={bounty.id}
                                bountyCreatorWallet={bounty.wallet_address}
                                currentWallet={publicKey?.toBase58() || null}
                                onApprove={(submissionId, winnerWallet) => 
                                  handleApproveSubmission(bounty.id, submissionId, winnerWallet)
                                }
                                isProcessing={processingBounty === bounty.id}
                              />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
