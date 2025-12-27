import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageLayout } from "@/components/PageLayout";
import { Gift, Clock, Users, Plus, CheckCircle, Wallet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "@/integrations/supabase/client";

interface Bounty {
  id: string;
  title: string;
  description: string;
  reward: string;
  wallet_address: string;
  status: string;
  created_at: string;
}

export default function Bounties() {
  const { publicKey } = useWallet();
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showWalletPopup, setShowWalletPopup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newBounty, setNewBounty] = useState({ title: "", description: "", reward: "" });

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
      setBounties(data || []);
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

  const handleCreateBounty = async () => {
    if (!newBounty.title || !newBounty.description || !newBounty.reward) {
      toast.error("Please fill all required fields");
      return;
    }

    if (!publicKey) {
      setShowWalletPopup(true);
      setTimeout(() => setShowWalletPopup(false), 3000);
      return;
    }

    const { error } = await supabase.from('bounties').insert({
      title: newBounty.title,
      description: newBounty.description,
      reward: newBounty.reward,
      wallet_address: publicKey.toBase58()
    });

    if (error) {
      toast.error("Failed to create bounty");
      if (import.meta.env.DEV) {
        console.error(error);
      }
    } else {
      toast.success("Bounty created!");
      setNewBounty({ title: "", description: "", reward: "" });
      setShowCreateForm(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-accent/20 text-accent";
      case "in_progress": return "bg-secondary/20 text-secondary";
      case "completed": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
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
              <span className="font-pixel text-[10px]">Connect your wallet to create bounties</span>
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
          <p className="font-pixel text-[9px] text-muted-foreground mb-6">
            Fund research • Earn rewards for contributions
          </p>
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
              <h3 className="font-pixel text-sm text-foreground mb-4">Create New Bounty</h3>
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
                <Input
                  placeholder="Reward (e.g. 50 SOL, 100 USDC)"
                  value={newBounty.reward}
                  onChange={(e) => setNewBounty({ ...newBounty, reward: e.target.value })}
                  className="font-pixel text-[10px] bg-muted/30 border-border"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateBounty}
                    className="px-4 py-2 bg-accent hover:bg-accent/80 text-accent-foreground font-pixel text-[9px] rounded transition-colors"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground font-pixel text-[9px] rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
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
            <p className="font-pixel text-[10px] text-muted-foreground">No bounties yet. Create the first one!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bounties.map((bounty, index) => (
              <motion.div
                key={bounty.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="stat-card p-6 rounded-sm"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-pixel text-xs text-foreground">{bounty.title}</h3>
                      <span className={`px-2 py-1 font-pixel text-[7px] uppercase rounded ${getStatusColor(bounty.status)}`}>
                        {bounty.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="font-pixel text-[9px] text-muted-foreground leading-relaxed mb-4">
                      {bounty.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-1 text-secondary">
                        <Gift className="w-3 h-3" />
                        <span className="font-pixel text-[9px]">{bounty.reward}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span className="font-pixel text-[8px]">{formatTime(bounty.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="w-3 h-3" />
                        <span className="font-pixel text-[8px]">
                          by {bounty.wallet_address.slice(0, 4)}...{bounty.wallet_address.slice(-4)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {bounty.status === "open" && (
                    <button
                      onClick={() => toast.info("Submit feature coming soon!")}
                      className="flex items-center gap-2 px-4 py-2 bg-accent/20 hover:bg-accent/40 text-accent font-pixel text-[8px] rounded transition-colors whitespace-nowrap"
                    >
                      <CheckCircle className="w-3 h-3" />
                      SUBMIT WORK
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
