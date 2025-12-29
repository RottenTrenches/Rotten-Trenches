import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, MessageSquare, Clock, ExternalLink, User, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';

interface Submission {
  id: string;
  bounty_id: string;
  wallet_address: string;
  content: string;
  proof_url: string | null;
  status: string;
  creator_feedback: string | null;
  created_at: string;
  updated_at: string;
}

interface BountySubmissionsProps {
  bountyId: string;
  bountyCreatorWallet: string;
  currentWallet: string | null;
  onApprove: (submissionId: string, winnerWallet: string) => Promise<void>;
  isProcessing: boolean;
}

export const BountySubmissions = ({
  bountyId,
  bountyCreatorWallet,
  currentWallet,
  onApprove,
  isProcessing
}: BountySubmissionsProps) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackModal, setFeedbackModal] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [updating, setUpdating] = useState(false);

  const isCreator = currentWallet?.toLowerCase() === bountyCreatorWallet?.toLowerCase();

  useEffect(() => {
    fetchSubmissions();

    const channel = supabase
      .channel(`submissions-${bountyId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'bounty_submissions',
        filter: `bounty_id=eq.${bountyId}`
      }, () => {
        fetchSubmissions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bountyId]);

  const fetchSubmissions = async () => {
    const { data, error } = await supabase
      .from('bounty_submissions')
      .select('*')
      .eq('bounty_id', bountyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching submissions:', error);
    } else {
      setSubmissions(data || []);
    }
    setLoading(false);
  };

  const updateSubmissionStatus = async (submissionId: string, status: string, feedbackText?: string) => {
    setUpdating(true);
    
    const updateData: Record<string, unknown> = { status };
    if (feedbackText) {
      updateData.creator_feedback = feedbackText;
    }

    const { error } = await supabase
      .from('bounty_submissions')
      .update(updateData)
      .eq('id', submissionId);

    if (error) {
      toast.error('Failed to update submission');
      console.error(error);
    } else {
      toast.success(`Submission ${status.replace('_', ' ')}`);
      setFeedbackModal(null);
      setFeedback('');
      fetchSubmissions();
    }
    setUpdating(false);
  };

  const handleApprove = async (submission: Submission) => {
    await onApprove(submission.id, submission.wallet_address);
  };

  const handleReject = async (submissionId: string) => {
    await updateSubmissionStatus(submissionId, 'rejected', feedback || 'Submission does not meet requirements');
  };

  const handleRequestChanges = async (submissionId: string) => {
    if (!feedback.trim()) {
      toast.error('Please provide feedback for the changes needed');
      return;
    }
    await updateSubmissionStatus(submissionId, 'changes_requested', feedback);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-0.5 bg-secondary/20 text-secondary text-[7px] font-pixel rounded border border-secondary/30">PENDING</span>;
      case 'approved':
        return <span className="px-2 py-0.5 bg-accent/20 text-accent text-[7px] font-pixel rounded border border-accent/30">APPROVED</span>;
      case 'rejected':
        return <span className="px-2 py-0.5 bg-primary/20 text-primary text-[7px] font-pixel rounded border border-primary/30">REJECTED</span>;
      case 'changes_requested':
        return <span className="px-2 py-0.5 bg-muted text-muted-foreground text-[7px] font-pixel rounded border border-border">CHANGES NEEDED</span>;
      default:
        return null;
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

  if (loading) {
    return (
      <div className="py-4 text-center">
        <span className="font-pixel text-[9px] text-muted-foreground">Loading submissions...</span>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="py-4 text-center border-t border-border mt-4">
        <span className="font-pixel text-[9px] text-muted-foreground">No submissions yet</span>
      </div>
    );
  }

  return (
    <div className="border-t border-border mt-4 pt-4">
      <h4 className="font-pixel text-[10px] text-foreground mb-3 flex items-center gap-2">
        <MessageSquare className="w-3 h-3" />
        Submissions ({submissions.length})
      </h4>

      <div className="space-y-3">
        {submissions.map((submission) => (
          <motion.div
            key={submission.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-muted/20 rounded border border-border"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <User className="w-3 h-3 text-muted-foreground" />
                <span className="font-pixel text-[8px] text-muted-foreground">
                  {submission.wallet_address.slice(0, 4)}...{submission.wallet_address.slice(-4)}
                </span>
                {getStatusBadge(submission.status)}
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span className="font-pixel text-[7px]">{formatTime(submission.created_at)}</span>
              </div>
            </div>

            <p className="font-pixel text-[9px] text-foreground leading-relaxed mb-2">
              {submission.content}
            </p>

            {submission.proof_url && (
              <a
                href={submission.proof_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-accent hover:underline font-pixel text-[8px] mb-2"
              >
                <ExternalLink className="w-3 h-3" />
                View Proof
              </a>
            )}

            {submission.creator_feedback && (
              <div className="mt-2 p-2 bg-muted/30 rounded border border-border">
                <span className="font-pixel text-[7px] text-muted-foreground">Creator feedback:</span>
                <p className="font-pixel text-[8px] text-foreground mt-1">{submission.creator_feedback}</p>
              </div>
            )}

            {/* Creator actions */}
            {isCreator && submission.status === 'pending' && (
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={() => handleApprove(submission)}
                  disabled={isProcessing || updating}
                  className="flex items-center gap-1 px-3 py-1.5 bg-accent/20 hover:bg-accent/30 text-accent font-pixel text-[8px] rounded border border-accent/30 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <CheckCircle className="w-3 h-3" />
                  )}
                  Approve & Pay
                </button>
                <button
                  onClick={() => setFeedbackModal(`reject-${submission.id}`)}
                  disabled={updating}
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary font-pixel text-[8px] rounded border border-primary/30 disabled:opacity-50"
                >
                  <XCircle className="w-3 h-3" />
                  Reject
                </button>
                <button
                  onClick={() => setFeedbackModal(`changes-${submission.id}`)}
                  disabled={updating}
                  className="flex items-center gap-1 px-3 py-1.5 bg-muted hover:bg-muted/80 text-muted-foreground font-pixel text-[8px] rounded border border-border disabled:opacity-50"
                >
                  <MessageSquare className="w-3 h-3" />
                  Request Changes
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Feedback Modal */}
      <AnimatePresence>
        {feedbackModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setFeedbackModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md stat-card rounded-lg p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-pixel text-sm text-foreground mb-4">
                {feedbackModal.startsWith('reject') ? 'Reject Submission' : 'Request Changes'}
              </h3>
              <Textarea
                placeholder={feedbackModal.startsWith('reject') 
                  ? 'Reason for rejection (optional)...' 
                  : 'Describe what changes are needed...'}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="font-pixel text-[10px] bg-muted/30 border-border min-h-[100px] mb-4"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const submissionId = feedbackModal.split('-')[1];
                    if (feedbackModal.startsWith('reject')) {
                      handleReject(submissionId);
                    } else {
                      handleRequestChanges(submissionId);
                    }
                  }}
                  disabled={updating}
                  className="flex-1 px-4 py-2 bg-primary hover:bg-primary/80 text-primary-foreground font-pixel text-[9px] rounded disabled:opacity-50"
                >
                  {updating ? 'Submitting...' : 'Confirm'}
                </button>
                <button
                  onClick={() => {
                    setFeedbackModal(null);
                    setFeedback('');
                  }}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground font-pixel text-[9px] rounded"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
