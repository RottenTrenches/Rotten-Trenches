import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { MessageSquare, Star, Clock, ExternalLink, ShieldCheck, ShieldAlert, ArrowRightLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getBadgeById } from "@/hooks/useWornBadge";

interface Comment {
  id: string;
  kol_id: string;
  wallet_address: string;
  content: string;
  rating: number | null;
  created_at: string;
  image_url: string | null;
  trade_signature: string | null;
  kol?: {
    username: string;
    profile_pic_url: string | null;
  };
  user_profile?: {
    display_name: string | null;
    profile_pic_url: string | null;
    is_verified: boolean | null;
    worn_badge: string | null;
  } | null;
}

export default function Comments() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLatestComments();
  }, []);

  const fetchLatestComments = async () => {
    setLoading(true);
    
    // Fetch recent comments
    const { data: commentsData } = await supabase
      .from('kol_comments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (!commentsData || commentsData.length === 0) {
      setComments([]);
      setLoading(false);
      return;
    }
    
    // Get unique wallet addresses and KOL IDs
    const walletAddresses = [...new Set(commentsData.map(c => c.wallet_address))];
    const kolIds = [...new Set(commentsData.map(c => c.kol_id))];
    
    // Fetch user profiles
    const { data: profilesData } = await supabase
      .from('user_profiles')
      .select('wallet_address, display_name, profile_pic_url, is_verified, worn_badge')
      .in('wallet_address', walletAddresses);
    
    // Fetch KOLs
    const { data: kolsData } = await supabase
      .from('kols')
      .select('id, username, profile_pic_url')
      .in('id', kolIds);
    
    // Map data
    const profilesMap = new Map(
      (profilesData || []).map(p => [p.wallet_address, p])
    );
    const kolsMap = new Map(
      (kolsData || []).map(k => [k.id, k])
    );
    
    const enrichedComments = commentsData.map(comment => ({
      ...comment,
      user_profile: profilesMap.get(comment.wallet_address) || null,
      kol: kolsMap.get(comment.kol_id) || undefined,
    }));
    
    setComments(enrichedComments);
    setLoading(false);
  };

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-2.5 h-2.5 ${
            star <= rating ? "text-secondary fill-secondary" : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-pixel text-2xl text-foreground flex items-center gap-3 mb-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            Recent Comments
          </h1>
          <p className="font-pixel text-[9px] text-muted-foreground">
            Latest community reviews and discussions
          </p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <MessageSquare className="w-6 h-6 text-primary" />
            </motion.div>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
            <p className="font-pixel text-[10px] text-muted-foreground">No comments yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comment, index) => {
              const isVerified = comment.user_profile?.is_verified || false;
              
              return (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Link
                    to={`/kol/${comment.kol_id}`}
                    className="block stat-card p-4 rounded-lg hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      {/* User Avatar */}
                      <div className="relative shrink-0">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-primary/30 to-secondary/30">
                          {comment.user_profile?.profile_pic_url ? (
                            <img 
                              src={comment.user_profile.profile_pic_url} 
                              alt="User" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="font-pixel text-[7px] text-primary">
                                {(comment.user_profile?.display_name || comment.wallet_address).slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        {comment.user_profile?.worn_badge && getBadgeById(comment.user_profile.worn_badge) && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full overflow-hidden border border-background">
                            <img 
                              src={getBadgeById(comment.user_profile.worn_badge)!.badgeImage} 
                              alt="Badge"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-pixel text-[8px] text-foreground">
                            {comment.user_profile?.display_name || `${comment.wallet_address.slice(0, 6)}...${comment.wallet_address.slice(-4)}`}
                          </span>
                          {isVerified ? (
                            <ShieldCheck className="w-3 h-3 text-accent" />
                          ) : (
                            <ShieldAlert className="w-3 h-3 text-muted-foreground/50" />
                          )}
                          {comment.rating && renderStars(comment.rating)}
                          <span className="font-pixel text-[7px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {formatTime(comment.created_at)}
                          </span>
                        </div>

                        {/* Comment on KOL */}
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="font-pixel text-[7px] text-muted-foreground">on</span>
                          <div className="flex items-center gap-1.5">
                            {comment.kol?.profile_pic_url && (
                              <img 
                                src={comment.kol.profile_pic_url} 
                                alt={comment.kol.username} 
                                className="w-4 h-4 rounded-full"
                              />
                            )}
                            <span className="font-pixel text-[8px] text-primary hover:underline">
                              {comment.kol?.username || 'Unknown KOL'}
                            </span>
                          </div>
                        </div>

                        {/* Trade Link */}
                        {comment.trade_signature && (
                          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-secondary/10 border border-secondary/30 rounded mb-2">
                            <ArrowRightLeft className="w-2.5 h-2.5 text-secondary" />
                            <span className="font-pixel text-[6px] text-secondary">Linked Trade</span>
                          </div>
                        )}

                        {/* Content */}
                        <p className="font-pixel text-[9px] text-foreground/90 line-clamp-2">
                          {comment.content}
                        </p>

                        {/* Image preview */}
                        {comment.image_url && (
                          <div className="mt-2 w-16 h-12 rounded overflow-hidden bg-muted/30">
                            <img 
                              src={comment.image_url} 
                              alt="Attachment" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>

                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
