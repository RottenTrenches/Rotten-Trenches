import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { PageLayout } from "@/components/PageLayout";
import { Shield, Gift, Users, FileText, AlertTriangle, CheckCircle, XCircle, Clock, Trash2, Eye } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAdminRole } from "@/hooks/useAdminRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

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
}

interface Submission {
  id: string;
  bounty_id: string;
  wallet_address: string;
  content: string;
  proof_url?: string;
  status: string;
  created_at: string;
  creator_feedback?: string;
  bounty?: Bounty;
}

interface Comment {
  id: string;
  kol_id: string;
  wallet_address: string;
  content: string;
  rating?: number;
  created_at: string;
  image_url?: string;
}

interface KOL {
  id: string;
  username: string;
  twitter_handle: string;
  wallet_address?: string;
  rating?: number;
  created_at: string;
}

export default function Admin() {
  const { publicKey } = useWallet();
  const { isAdmin, isModerator, loading: roleLoading } = useAdminRole();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("bounties");
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [kols, setKols] = useState<KOL[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  useEffect(() => {
    if (isAdmin || isModerator) {
      fetchAllData();
    }
  }, [isAdmin, isModerator]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchBounties(),
      fetchSubmissions(),
      fetchComments(),
      fetchKOLs(),
    ]);
    setLoading(false);
  };

  const fetchBounties = async () => {
    const { data, error } = await supabase
      .from('bounties')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setBounties(data);
    }
  };

  const fetchSubmissions = async () => {
    const { data: submissionData, error } = await supabase
      .from('bounty_submissions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && submissionData) {
      // Fetch related bounties
      const bountyIds = [...new Set(submissionData.map(s => s.bounty_id))];
      const { data: bountyData } = await supabase
        .from('bounties')
        .select('*')
        .in('id', bountyIds);
      
      const bountyMap = new Map(bountyData?.map(b => [b.id, b]) || []);
      const enrichedSubmissions = submissionData.map(s => ({
        ...s,
        bounty: bountyMap.get(s.bounty_id)
      }));
      
      setSubmissions(enrichedSubmissions);
    }
  };

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('kol_comments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (!error && data) {
      setComments(data);
    }
  };

  const fetchKOLs = async () => {
    const { data, error } = await supabase
      .from('kols')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setKols(data);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    if (!publicKey) {
      toast.error("Wallet not connected");
      return;
    }
    
    const { data, error } = await supabase.rpc('admin_delete_comment', {
      p_comment_id: commentId,
      p_wallet_address: publicKey.toBase58()
    });
    
    const result = data as { success: boolean; error?: string } | null;
    
    if (error || !result?.success) {
      toast.error(result?.error || "Failed to delete comment");
    } else {
      toast.success("Comment deleted");
      fetchComments();
    }
  };

  const handleDeleteBounty = async (bountyId: string) => {
    if (!confirm("Are you sure you want to delete this bounty? This action cannot be undone.")) return;
    if (!publicKey) {
      toast.error("Wallet not connected");
      return;
    }
    
    const { data, error } = await supabase.rpc('admin_delete_bounty', {
      p_bounty_id: bountyId,
      p_wallet_address: publicKey.toBase58()
    });
    
    const result = data as { success: boolean; error?: string } | null;
    
    if (error || !result?.success) {
      toast.error(result?.error || "Failed to delete bounty");
    } else {
      toast.success("Bounty deleted");
      fetchBounties();
    }
  };

  const handleDeleteSubmission = async (submissionId: string) => {
    if (!confirm("Are you sure you want to delete this submission?")) return;
    if (!publicKey) {
      toast.error("Wallet not connected");
      return;
    }
    
    const { data, error } = await supabase.rpc('admin_delete_submission', {
      p_submission_id: submissionId,
      p_wallet_address: publicKey.toBase58()
    });
    
    const result = data as { success: boolean; error?: string } | null;
    
    if (error || !result?.success) {
      toast.error(result?.error || "Failed to delete submission");
    } else {
      toast.success("Submission deleted");
      fetchSubmissions();
    }
  };

  const handleDeleteKOL = async (kolId: string) => {
    if (!confirm("Are you sure you want to delete this KOL? This will also delete all related votes and comments.")) return;
    if (!publicKey) {
      toast.error("Wallet not connected");
      return;
    }
    
    const { data, error } = await supabase.rpc('admin_delete_kol', {
      p_kol_id: kolId,
      p_wallet_address: publicKey.toBase58()
    });
    
    const result = data as { success: boolean; error?: string } | null;
    
    if (error || !result?.success) {
      toast.error(result?.error || "Failed to delete KOL");
    } else {
      toast.success("KOL deleted");
      fetchKOLs();
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <span className="px-2 py-1 bg-accent/20 text-accent text-[8px] font-pixel rounded">OPEN</span>;
      case 'pending':
        return <span className="px-2 py-1 bg-secondary/20 text-secondary text-[8px] font-pixel rounded">PENDING</span>;
      case 'approved':
        return <span className="px-2 py-1 bg-accent/20 text-accent text-[8px] font-pixel rounded">APPROVED</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-destructive/20 text-destructive text-[8px] font-pixel rounded">REJECTED</span>;
      case 'changes_requested':
        return <span className="px-2 py-1 bg-secondary/20 text-secondary text-[8px] font-pixel rounded">CHANGES</span>;
      case 'completed':
        return <span className="px-2 py-1 bg-muted text-muted-foreground text-[8px] font-pixel rounded">COMPLETED</span>;
      default:
        return <span className="px-2 py-1 bg-muted text-muted-foreground text-[8px] font-pixel rounded">{status.toUpperCase()}</span>;
    }
  };

  if (roleLoading) {
    return (
      <PageLayout>
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-48" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </PageLayout>
    );
  }

  if (!publicKey) {
    return (
      <PageLayout>
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 text-secondary mx-auto mb-4" />
            <h1 className="font-pixel text-xl text-foreground mb-2">ACCESS DENIED</h1>
            <p className="font-pixel text-[10px] text-muted-foreground">
              Please connect your wallet to access the admin dashboard.
            </p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!isAdmin && !isModerator) {
    return (
      <PageLayout>
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h1 className="font-pixel text-xl text-foreground mb-2">ACCESS DENIED</h1>
            <p className="font-pixel text-[10px] text-muted-foreground">
              You don't have permission to access the admin dashboard.
            </p>
          </div>
        </div>
      </PageLayout>
    );
  }

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
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="font-pixel text-2xl md:text-3xl text-foreground">
              ADMIN DASHBOARD
            </h1>
          </div>
          <p className="font-pixel text-[9px] text-muted-foreground">
            Manage bounties, submissions, and moderate content
          </p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="stat-card p-4 rounded-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-4 h-4 text-secondary" />
              <span className="font-pixel text-[8px] text-muted-foreground">BOUNTIES</span>
            </div>
            <p className="font-pixel text-xl text-foreground">{bounties.length}</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="stat-card p-4 rounded-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-accent" />
              <span className="font-pixel text-[8px] text-muted-foreground">SUBMISSIONS</span>
            </div>
            <p className="font-pixel text-xl text-foreground">{submissions.length}</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="stat-card p-4 rounded-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="font-pixel text-[8px] text-muted-foreground">KOLS</span>
            </div>
            <p className="font-pixel text-xl text-foreground">{kols.length}</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="stat-card p-4 rounded-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-secondary" />
              <span className="font-pixel text-[8px] text-muted-foreground">PENDING</span>
            </div>
            <p className="font-pixel text-xl text-foreground">
              {submissions.filter(s => s.status === 'pending').length}
            </p>
          </motion.div>
        </div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="bounties" className="font-pixel text-[9px]">
                <Gift className="w-3 h-3 mr-1" />
                Bounties
              </TabsTrigger>
              <TabsTrigger value="submissions" className="font-pixel text-[9px]">
                <FileText className="w-3 h-3 mr-1" />
                Submissions
              </TabsTrigger>
              <TabsTrigger value="comments" className="font-pixel text-[9px]">
                <Users className="w-3 h-3 mr-1" />
                Comments
              </TabsTrigger>
              <TabsTrigger value="kols" className="font-pixel text-[9px]">
                <Users className="w-3 h-3 mr-1" />
                KOLs
              </TabsTrigger>
            </TabsList>

            {/* Bounties Tab */}
            <TabsContent value="bounties">
              <div className="stat-card rounded-sm overflow-hidden">
                {loading ? (
                  <div className="p-8">
                    <Skeleton className="h-48 w-full" />
                  </div>
                ) : bounties.length === 0 ? (
                  <div className="p-8 text-center">
                    <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="font-pixel text-[10px] text-muted-foreground">No bounties yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-pixel text-[8px]">TITLE</TableHead>
                        <TableHead className="font-pixel text-[8px]">REWARD</TableHead>
                        <TableHead className="font-pixel text-[8px]">CREATOR</TableHead>
                        <TableHead className="font-pixel text-[8px]">STATUS</TableHead>
                        <TableHead className="font-pixel text-[8px]">CREATED</TableHead>
                        <TableHead className="font-pixel text-[8px]">ACTIONS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bounties.map((bounty) => (
                        <TableRow key={bounty.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/bounties?id=${bounty.id}`)}>
                          <TableCell className="font-pixel text-[9px] max-w-[200px] truncate">
                            {bounty.title}
                          </TableCell>
                          <TableCell className="font-pixel text-[9px] text-secondary">
                            {bounty.reward}
                          </TableCell>
                          <TableCell className="font-pixel text-[8px] text-muted-foreground">
                            {truncateAddress(bounty.wallet_address)}
                          </TableCell>
                          <TableCell>{getStatusBadge(bounty.status)}</TableCell>
                          <TableCell className="font-pixel text-[8px] text-muted-foreground">
                            {formatDate(bounty.created_at)}
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBounty(bounty.id);
                              }}
                              className="p-1 hover:bg-destructive/20 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>

            {/* Submissions Tab */}
            <TabsContent value="submissions">
              <div className="stat-card rounded-sm overflow-hidden">
                {loading ? (
                  <div className="p-8">
                    <Skeleton className="h-48 w-full" />
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="p-8 text-center">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="font-pixel text-[10px] text-muted-foreground">No submissions yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-pixel text-[8px]">BOUNTY</TableHead>
                        <TableHead className="font-pixel text-[8px]">SUBMITTER</TableHead>
                        <TableHead className="font-pixel text-[8px]">STATUS</TableHead>
                        <TableHead className="font-pixel text-[8px]">SUBMITTED</TableHead>
                        <TableHead className="font-pixel text-[8px]">ACTIONS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {submissions.map((submission) => (
                        <TableRow key={submission.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setSelectedSubmission(submission)}>
                          <TableCell className="font-pixel text-[9px] max-w-[200px] truncate">
                            {submission.bounty?.title || 'Unknown Bounty'}
                          </TableCell>
                          <TableCell 
                            className="font-pixel text-[8px] text-primary cursor-pointer hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/user/${submission.wallet_address}`);
                            }}
                          >
                            {truncateAddress(submission.wallet_address)}
                          </TableCell>
                          <TableCell>{getStatusBadge(submission.status)}</TableCell>
                          <TableCell className="font-pixel text-[8px] text-muted-foreground">
                            {formatDate(submission.created_at)}
                          </TableCell>
                          <TableCell className="flex gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSubmission(submission);
                              }}
                              className="p-1 hover:bg-muted rounded transition-colors"
                            >
                              <Eye className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSubmission(submission.id);
                              }}
                              className="p-1 hover:bg-destructive/20 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>

            {/* Comments Tab */}
            <TabsContent value="comments">
              <div className="stat-card rounded-sm overflow-hidden">
                {loading ? (
                  <div className="p-8">
                    <Skeleton className="h-48 w-full" />
                  </div>
                ) : comments.length === 0 ? (
                  <div className="p-8 text-center">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="font-pixel text-[10px] text-muted-foreground">No comments yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-pixel text-[8px]">CONTENT</TableHead>
                        <TableHead className="font-pixel text-[8px]">AUTHOR</TableHead>
                        <TableHead className="font-pixel text-[8px]">RATING</TableHead>
                        <TableHead className="font-pixel text-[8px]">CREATED</TableHead>
                        <TableHead className="font-pixel text-[8px]">ACTIONS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comments.map((comment) => (
                        <TableRow key={comment.id}>
                          <TableCell className="font-pixel text-[9px] max-w-[300px] truncate">
                            {comment.content}
                          </TableCell>
                          <TableCell 
                            className="font-pixel text-[8px] text-primary cursor-pointer hover:underline"
                            onClick={() => navigate(`/user/${comment.wallet_address}`)}
                          >
                            {truncateAddress(comment.wallet_address)}
                          </TableCell>
                          <TableCell className="font-pixel text-[9px] text-secondary">
                            {comment.rating ? `${comment.rating}/5` : '-'}
                          </TableCell>
                          <TableCell className="font-pixel text-[8px] text-muted-foreground">
                            {formatDate(comment.created_at)}
                          </TableCell>
                          <TableCell className="flex gap-1">
                            <button
                              onClick={() => navigate(`/kol/${comment.kol_id}`)}
                              className="p-1 hover:bg-muted rounded transition-colors"
                              title="View KOL"
                            >
                              <Eye className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                            </button>
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="p-1 hover:bg-destructive/20 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>

            {/* KOLs Tab */}
            <TabsContent value="kols">
              <div className="stat-card rounded-sm overflow-hidden">
                {loading ? (
                  <div className="p-8">
                    <Skeleton className="h-48 w-full" />
                  </div>
                ) : kols.length === 0 ? (
                  <div className="p-8 text-center">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="font-pixel text-[10px] text-muted-foreground">No KOLs yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-pixel text-[8px]">USERNAME</TableHead>
                        <TableHead className="font-pixel text-[8px]">TWITTER</TableHead>
                        <TableHead className="font-pixel text-[8px]">WALLET</TableHead>
                        <TableHead className="font-pixel text-[8px]">RATING</TableHead>
                        <TableHead className="font-pixel text-[8px]">ADDED</TableHead>
                        <TableHead className="font-pixel text-[8px]">ACTIONS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {kols.map((kol) => (
                        <TableRow key={kol.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/kol/${kol.id}`)}>
                          <TableCell className="font-pixel text-[9px]">
                            {kol.username}
                          </TableCell>
                          <TableCell className="font-pixel text-[9px] text-primary">
                            @{kol.twitter_handle}
                          </TableCell>
                          <TableCell className="font-pixel text-[8px] text-muted-foreground">
                            {kol.wallet_address ? truncateAddress(kol.wallet_address) : '-'}
                          </TableCell>
                          <TableCell className="font-pixel text-[9px] text-secondary">
                            {kol.rating?.toFixed(1) || '0.0'}
                          </TableCell>
                          <TableCell className="font-pixel text-[8px] text-muted-foreground">
                            {formatDate(kol.created_at)}
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteKOL(kol.id);
                              }}
                              className="p-1 hover:bg-destructive/20 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Submission Detail Dialog */}
        <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-pixel text-sm flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Submission Details
              </DialogTitle>
            </DialogHeader>
            {selectedSubmission && (
              <div className="space-y-4">
                <div>
                  <p className="font-pixel text-[8px] text-muted-foreground mb-1">BOUNTY</p>
                  <p className="font-pixel text-[10px]">{selectedSubmission.bounty?.title}</p>
                </div>
                <div>
                  <p className="font-pixel text-[8px] text-muted-foreground mb-1">SUBMITTER</p>
                  <p className="font-pixel text-[9px] text-primary break-all">
                    {selectedSubmission.wallet_address}
                  </p>
                </div>
                <div>
                  <p className="font-pixel text-[8px] text-muted-foreground mb-1">STATUS</p>
                  {getStatusBadge(selectedSubmission.status)}
                </div>
                <div>
                  <p className="font-pixel text-[8px] text-muted-foreground mb-1">CONTENT</p>
                  <p className="font-pixel text-[9px] text-foreground whitespace-pre-wrap">
                    {selectedSubmission.content}
                  </p>
                </div>
                {selectedSubmission.proof_url && (
                  <div>
                    <p className="font-pixel text-[8px] text-muted-foreground mb-1">PROOF URL</p>
                    <a 
                      href={selectedSubmission.proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-pixel text-[9px] text-primary hover:underline break-all"
                    >
                      {selectedSubmission.proof_url}
                    </a>
                  </div>
                )}
                {selectedSubmission.creator_feedback && (
                  <div>
                    <p className="font-pixel text-[8px] text-muted-foreground mb-1">CREATOR FEEDBACK</p>
                    <p className="font-pixel text-[9px] text-secondary">
                      {selectedSubmission.creator_feedback}
                    </p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
}
