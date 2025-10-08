import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useJobs } from "@/hooks/useJobs";
import { useBids } from "@/hooks/useBids";
import { useRevisions } from "@/hooks/useRevisions";
import { useDisputes } from "@/hooks/useDisputes";
import { useAuth } from "@/hooks/useAuth";
import { BidsPanel } from "@/components/BidsPanel";
import { WorkSubmissionPanel } from "@/components/WorkSubmissionPanel";
import { ReviewPanel } from "@/components/ReviewPanel";
import { RatingDialog } from "@/components/RatingDialog";
import { PlatformReviewDialog } from "@/components/PlatformReviewDialog";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  DollarSign, 
  Clock, 
  Wallet,
  Send,
  ArrowLeft,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useEscrow } from "@/hooks/useEscrow";
const JobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { fundJob, approveJob, submitWork: submitWorkToBlockchain } = useEscrow();
  const [job, setJob] = useState<any>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [proposal, setProposal] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState("");
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [hasLeftUserReview, setHasLeftUserReview] = useState(false);
  const [hasLeftPlatformReview, setHasLeftPlatformReview] = useState(false);
  const [hasSubmittedBid, setHasSubmittedBid] = useState(false);
  const { getJobById, loading } = useJobs();
  const { createBid, loading: submitting } = useBids();
  const { requestRevision, submitRevision } = useRevisions();
  const { raiseDispute } = useDisputes();

  useEffect(() => {
    if (id) {
      loadJob();
    }
  }, [id]);

  // Re-fetch review flags when user becomes available
  useEffect(() => {
    if (user?.id && id) {
      fetchReviewFlags();
    }
  }, [user?.id, id]);

  const fetchReviewFlags = async () => {
    if (!id || !user?.id) return;
    try {
      const [{ data: userReview }, { data: platformReview }, { data: existingBid }] = await Promise.all([
        supabase
          .from('reviews')
          .select('id')
          .eq('job_id', id)
          .eq('reviewer_id', user.id)
          .maybeSingle(),
        supabase
          .from('platform_reviews')
          .select('id')
          .eq('job_id', id)
          .eq('reviewer_id', user.id)
          .maybeSingle(),
        supabase
          .from('bids')
          .select('id')
          .eq('job_id', id)
          .eq('freelancer_id', user.id)
          .maybeSingle(),
      ]);
      setHasLeftUserReview(!!userReview);
      setHasLeftPlatformReview(!!platformReview);
      setHasSubmittedBid(!!existingBid);
    } catch (e) {
      console.error('Error checking review flags', e);
    }
  };

  const loadJob = async () => {
    const data = await getJobById(id!);
    setJob(data);
    fetchReviewFlags();
  };

  // Real-time subscription for job updates
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`job-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `id=eq.${id}`
        },
        (payload) => {
          console.log('Job updated:', payload);
          loadJob(); // Refresh job data and review flags
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bids',
          filter: `job_id=eq.${id}`
        },
        (payload) => {
          console.log('New bid:', payload);
          fetchReviewFlags(); // Refresh bid status
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const handleSubmitBid = async () => {
    if (!bidAmount || !proposal || !estimatedDuration || !id) {
      toast({
        title: "Missing Information",
        description: "Please fill in all bid details",
        variant: "destructive"
      });
      return;
    }

    const result = await createBid({
      job_id: id,
      bid_amount_usdc: parseFloat(bidAmount),
      estimated_duration_weeks: parseInt(estimatedDuration),
      proposal_text: proposal
    });

    if (result) {
      setBidAmount("");
      setProposal("");
      setEstimatedDuration("");
      setHasSubmittedBid(true);
      loadJob();
    }
  };

  const handleRequestRevision = async (notes: string) => {
    if (!id || !job) return;
    const success = await requestRevision(id, notes);
    
    if (success && job.freelancer_id) {
      // Notify freelancer via Telegram
      try {
        await supabase.functions.invoke('send-telegram-notification', {
          body: {
            recipient_id: job.freelancer_id,
            message: `🔄 The client has requested revisions for "${job.title}". Please check the platform for details.`,
            sender_id: user?.id,
            url: `${window.location.origin}/jobs/${id}`,
            button_text: 'View Details'
          }
        });
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
      }
      
      loadJob();
    }
  };

  const handleSubmitRevision = async (ipfsHash: string, gitHash: string) => {
    if (!id || !job) return;
    
    const success = await submitRevision(
      id,
      ipfsHash,
      gitHash
    );
    if (success) await loadJob();
  };

  const handleRaiseDispute = async () => {
    if (!id || !job) return;
    const depositAmount = ((job.budget_eth || 0) * (job.arbitration_deposit_percentage || 2)) / 100;
    const success = await raiseDispute(id, depositAmount);
    if (success) loadJob();
  };

  const handleFundEscrow = async () => {
    if (!id || !job) return;

    const amountUSDC = String(job.budget_usdc || Number((job.budget_eth || 0) * 2000).toFixed(2));
    const freelancerAddress = job.freelancer?.wallet_address;
    if (!freelancerAddress) {
      toast({
        title: "Missing Wallet Address",
        description: "The freelancer does not have a wallet address on file.",
        variant: "destructive"
      });
      return;
    }

    const result = await fundJob(
      id,
      freelancerAddress,
      amountUSDC,
      job.requires_freelancer_stake || false,
      job.allowed_revisions || 3
    );

    if (result.success) {
      // Notify freelancer via Telegram
      if (job.freelancer_id) {
        try {
          await supabase.functions.invoke('send-telegram-notification', {
            body: {
              recipient_id: job.freelancer_id,
              message: `🔒 Job "${job.title}" funded with ${amountUSDC} USDC. You can start work!`,
              sender_id: user?.id,
              url: `${window.location.origin}/jobs/${id}`,
              button_text: 'View Details'
            }
          });
        } catch (notifError) {
          console.error('Error sending notification:', notifError);
        }
      }
      await loadJob();
    }
  };

  const handleSubmitWork = async (ipfsHash: string, gitHash: string, notes: string) => {
    if (!id) return;
    
    try {
      // First, submit work to blockchain
      toast({
        title: "Submitting to Blockchain",
        description: "Please confirm the transaction in MetaMask",
      });

      const blockchainResult = await submitWorkToBlockchain(id, ipfsHash, gitHash);
      
      if (!blockchainResult.success) {
        // Detailed error toasts are already shown by submitWorkToBlockchain
        return;
      }

      // Then update database
      const { error } = await supabase
        .from('jobs')
        .update({
          status: 'under_review',
          ipfs_hash: ipfsHash,
          git_commit_hash: gitHash,
          review_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          contract_address: blockchainResult.txHash,
        })
        .eq('id', id);

      if (error) throw error;

      // Notify client via Telegram
      if (job.client_id) {
        try {
          const { data: freelancerProfile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', user?.id)
            .single();

          await supabase.functions.invoke('send-telegram-notification', {
            body: {
              recipient_id: job.client_id,
              message: `📦 ${freelancerProfile?.display_name || 'The freelancer'} submitted work for "${job.title}". Review now.`,
              sender_id: user?.id,
              url: `${window.location.origin}/jobs/${id}`,
              button_text: 'View Details'
            }
          });
        } catch (notifError) {
          console.error('Error sending notification:', notifError);
        }
      }

      toast({
        title: "Work Submitted",
        description: "Your work has been submitted for review. The client has 7 days to review.",
      });

      loadJob();
    } catch (error) {
      console.error('Error submitting work:', error);
      toast({
        title: "Error",
        description: "Failed to submit work",
        variant: "destructive"
      });
    }
  };

  const handleApproveWork = async () => {
    if (!id || !job) return;
    
    const result = await approveJob(id);
    if (!result.success) return;
    
    try {
      const { error: jobError } = await supabase
        .from('jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (jobError) throw jobError;

      // Update freelancer stats
      try {
        await supabase.rpc('increment_completed_jobs', {
          freelancer_id: job.freelancer_id,
          amount: job.budget_usdc || Number((job.budget_eth || 0) * 2000),
        } as any);
      } catch (profileError) {
        console.error('Error updating profile:', profileError);
      }

      // Notify both parties via Telegram
      if (job.freelancer_id) {
        try {
          await supabase.functions.invoke('send-telegram-notification', {
            body: {
              recipient_id: job.freelancer_id,
              message: `🎉 Payment released! You received ${(job.budget_usdc || Number((job.budget_eth || 0) * 2000)).toString()} USDC for "${job.title}". Congrats!`,
              sender_id: user?.id,
              url: `${window.location.origin}/jobs/${id}`,
              button_text: 'View Job'
            }
          });
        } catch (notifError) {
          console.error('Error sending notification:', notifError);
        }
      }

      if (job.client_id) {
        try {
          await supabase.functions.invoke('send-telegram-notification', {
            body: {
              recipient_id: job.client_id,
              message: `✅ Job "${job.title}" completed! ${(job.budget_usdc || Number((job.budget_eth || 0) * 2000)).toString()} USDC released to freelancer.`,
              sender_id: user?.id,
              url: `${window.location.origin}/jobs/${id}`,
              button_text: 'View Job'
            }
          });
        } catch (notifError) {
          console.error('Error sending notification:', notifError);
        }
      }

      toast({
        title: "Work Approved",
        description: "Funds have been released to the freelancer.",
      });

      loadJob();
      
      // Show review dialog after successful approval
      setShowReviewDialog(true);
    } catch (error) {
      console.error('Error approving work:', error);
      toast({
        title: "Error",
        description: "Failed to approve work",
        variant: "destructive"
      });
    }
  };

  const getUserRole = (): 'client' | 'freelancer' | null => {
    if (!user || !job) return null;
    if (job.client_id === user.id) return 'client';
    if (job.freelancer_id === user.id) return 'freelancer';
    return null;
  };

  if (loading || !job) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Loading...</p>
          </Card>
        </main>
      </div>
    );
  }

  // Calculate time ago for posted date
  const getTimeAgo = (dateString: string) => {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  // Get skills array safely
  const skills = job.skills_required || [];
  const durationText = job.duration_weeks ? `${job.duration_weeks} weeks` : 'Flexible';

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Jobs
        </Button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Job Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Details Card - Show to everyone */}
            <Card className="p-6 bg-card/50 backdrop-blur">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-3xl font-bold">{job.title}</h1>
                    <Badge variant="secondary">{job.status.replace('_', ' ')}</Badge>
                  </div>
                  <p className="text-muted-foreground">Posted {getTimeAgo(job.created_at)}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 mb-6 pb-6 border-b">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Budget</p>
                    <p className="font-semibold">{job.budget_usdc || (job.budget_eth * 2000).toFixed(2)} USDC</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-semibold">{durationText}</p>
                  </div>
                </div>
                {job.budget_usd && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">USD Equivalent</p>
                      <p className="font-semibold">${job.budget_usd}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-3">Description</h2>
                <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                  {job.description}
                </p>
              </div>

              {skills.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-3">Required Skills</h2>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill: string, idx: number) => (
                      <Badge key={idx} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Client View - Show Proposals */}
            {getUserRole() === 'client' && job.status === 'open' && (
              <BidsPanel jobId={id!} onBidAccepted={loadJob} />
            )}

            {/* Client View - Fund Escrow */}
            {getUserRole() === 'client' && job.status === 'in_progress' && !job.escrow_address && (
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">Fund Escrow</h2>
                <p className="text-muted-foreground mb-6">
                  You've accepted a proposal. Now fund the escrow to allow the freelancer to start working.
                </p>
                <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Escrow Amount</span>
                    <span className="text-lg font-bold">{job.budget_usdc || (job.budget_eth * 2000).toFixed(2)} USDC</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Funds will be held in escrow until work is approved
                  </p>
                </div>
                <Button onClick={handleFundEscrow} className="w-full shadow-glow" size="lg">
                  <Wallet className="h-4 w-4 mr-2" />
                  Fund Escrow with Wallet
                </Button>
              </Card>
            )}

            {/* Client View - Review Work */}
            {getUserRole() === 'client' && job.status === 'under_review' && (
              <ReviewPanel
                job={job}
                onApprove={handleApproveWork}
                onRequestRevision={handleRequestRevision}
                onRaiseDispute={handleRaiseDispute}
              />
            )}

            {/* Client View - Completed */}
            {getUserRole() === 'client' && job.status === 'completed' && (!hasLeftUserReview || !hasLeftPlatformReview) && (
              <Card className="p-6 bg-primary/5 border-primary/20">
                <div className="text-center mb-6">
                  <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Project Completed!</h2>
                  <p className="text-muted-foreground mb-4">
                    Funds have been released to the freelancer
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Please leave your reviews below
                  </p>
                </div>
                <div className="space-y-3">
                  {!hasLeftUserReview && (
                    <RatingDialog
                      jobId={id!}
                      revieweeId={job.freelancer_id}
                      revieweeName={job.freelancer?.display_name || 'Freelancer'}
                      trigger={
                        <Button className="w-full shadow-glow" size="lg">
                          Rate Freelancer
                        </Button>
                      }
                      onSuccess={async () => { await fetchReviewFlags(); loadJob(); }}
                    />
                  )}
                  {!hasLeftPlatformReview && (
                    <PlatformReviewDialog
                      jobId={id!}
                      trigger={
                        <Button variant="outline" className="w-full" size="lg">
                          Review Platform
                        </Button>
                      }
                      onSuccess={async () => { await fetchReviewFlags(); loadJob(); }}
                    />
                  )}
                </div>
              </Card>
            )}

            {/* Freelancer View - Submit Work */}
            {getUserRole() === 'freelancer' && (job.status === 'in_progress' || job.status === 'revision_requested') && job.escrow_address && (
              <WorkSubmissionPanel
                jobId={id!}
                onSubmit={async (ipfs, git, notes) => {
                  if (job.status === 'revision_requested') {
                    await handleSubmitRevision(ipfs, git);
                  } else {
                    await handleSubmitWork(ipfs, git, notes);
                  }
                }}
              />
            )}

            {/* Freelancer View - Waiting for Review */}
            {getUserRole() === 'freelancer' && job.status === 'under_review' && (
              <Card className="p-6">
                <div className="text-center">
                  <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Work Submitted ✓</h2>
                  <p className="text-muted-foreground mb-4">
                    Your work has been submitted and is under review by the client.
                  </p>
                  <div className="p-4 bg-muted/50 rounded-lg mb-4">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-sm mb-1">IPFS Hash</p>
                        <p className="font-mono text-xs text-muted-foreground break-all">{job.ipfs_hash}</p>
                      </div>
                    </div>
                    {job.git_commit_hash && (
                      <div className="flex items-start gap-3">
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-sm mb-1">Git Commit</p>
                          <p className="font-mono text-xs text-muted-foreground break-all">{job.git_commit_hash}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {job.review_deadline && (
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-primary" />
                      <p className="text-muted-foreground">
                        Review deadline: {new Date(job.review_deadline).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Freelancer View - Completed */}
            {getUserRole() === 'freelancer' && job.status === 'completed' && (!hasLeftUserReview || !hasLeftPlatformReview) && (
              <Card className="p-6 bg-primary/5 border-primary/20">
                <div className="text-center mb-6">
                  <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Payment Received!</h2>
                  <p className="text-muted-foreground mb-4">
                    You've received {job.budget_usdc || (job.budget_eth * 2000).toFixed(2)} USDC
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Please leave your reviews below
                  </p>
                </div>
                <div className="space-y-3">
                  {!hasLeftUserReview && (
                    <RatingDialog
                      jobId={id!}
                      revieweeId={job.client_id}
                      revieweeName={job.client?.display_name || 'Client'}
                      trigger={
                        <Button className="w-full shadow-glow" size="lg">
                          Rate Client
                        </Button>
                      }
                      onSuccess={async () => { await fetchReviewFlags(); loadJob(); }}
                    />
                  )}
                  {!hasLeftPlatformReview && (
                    <PlatformReviewDialog
                      jobId={id!}
                      trigger={
                        <Button variant="outline" className="w-full" size="lg">
                          Review Platform
                        </Button>
                      }
                      onSuccess={async () => { await fetchReviewFlags(); loadJob(); }}
                    />
                  )}
                </div>
              </Card>
            )}

            {/* Non-participant View - Bid Form or Already Submitted */}
            {!getUserRole() && user && job.client_id !== user.id && job.status === 'open' && (
              hasSubmittedBid ? (
                <Card className="p-6 bg-card/50 backdrop-blur border-primary/20">
                  <div className="text-center py-8">
                    <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Proposal Submitted</h2>
                    <p className="text-muted-foreground">
                      You've already submitted a proposal for this job. The client will review it and contact you if interested.
                    </p>
                  </div>
                </Card>
              ) : (
                  <Card className="p-6 bg-card/50 backdrop-blur">
                    <h2 className="text-2xl font-bold mb-4">Submit Your Proposal</h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Your Bid Amount (USDC)
                        </label>
                        <Input
                          type="number"
                          placeholder="e.g., 250.00"
                          value={bidAmount}
                          onChange={(e) => setBidAmount(e.target.value)}
                          step="0.01"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Estimated Duration (weeks)
                        </label>
                        <Input
                          type="number"
                          placeholder="e.g., 3"
                          value={estimatedDuration}
                          onChange={(e) => setEstimatedDuration(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Cover Letter / Proposal
                        </label>
                        <Textarea
                          placeholder="Describe your experience and approach to this project..."
                          value={proposal}
                          onChange={(e) => setProposal(e.target.value)}
                          rows={8}
                          className="resize-none"
                        />
                      </div>

                      <Button 
                        onClick={handleSubmitBid}
                        disabled={submitting}
                        className="w-full shadow-glow"
                        size="lg"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {submitting ? "Submitting..." : "Submit Proposal"}
                      </Button>
                    </div>
                  </Card>
              )
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="p-6 bg-card/50 backdrop-blur">
              <h3 className="text-lg font-semibold mb-4">Job Information</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant="secondary" className="mt-1">
                    {job.status}
                  </Badge>
                </div>

                {job.deadline && (
                  <div>
                    <p className="text-sm text-muted-foreground">Deadline</p>
                    <p className="font-semibold">{new Date(job.deadline).toLocaleDateString()}</p>
                  </div>
                )}

                {job.escrow_address && (
                  <div>
                    <p className="text-sm text-muted-foreground">Escrow Contract</p>
                    <p className="font-mono text-xs break-all">{job.escrow_address.substring(0, 20)}...</p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Posted by verified client</p>
                  <Badge variant="secondary" className="bg-success/10 text-success">
                    ✓ Verified
                  </Badge>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card/50 backdrop-blur">
              <h3 className="text-lg font-semibold mb-3">Tips for Success</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Provide a detailed proposal explaining your approach</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Set a competitive bid based on your experience</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Include relevant portfolio samples</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Be realistic with your timeline estimate</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>

        {/* Review Dialogs after job completion */}
        <AlertDialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave Reviews</AlertDialogTitle>
              <AlertDialogDescription>
                Please take a moment to review your experience
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Review for the other party */}
              {getUserRole() === 'client' && job?.freelancer_id && (
                <div className="space-y-2">
                  <Label>Review Freelancer</Label>
                  <RatingDialog
                    jobId={id!}
                    revieweeId={job.freelancer_id}
                    revieweeName={job.freelancer?.display_name || 'Freelancer'}
                    trigger={<Button variant="outline" className="w-full">Rate Freelancer</Button>}
                  />
                </div>
              )}
              
              {getUserRole() === 'freelancer' && job?.client_id && (
                <div className="space-y-2">
                  <Label>Review Client</Label>
                  <RatingDialog
                    jobId={id!}
                    revieweeId={job.client_id}
                    revieweeName={job.client?.display_name || 'Client'}
                    trigger={<Button variant="outline" className="w-full">Rate Client</Button>}
                    onSuccess={async () => { await fetchReviewFlags(); loadJob(); }}
                  />
                </div>
              )}

              {/* Platform review */}
              <div className="space-y-2">
                <Label>Review Platform</Label>
                <PlatformReviewDialog
                  jobId={id!}
                  trigger={<Button variant="outline" className="w-full">Rate DeFiLance</Button>}
                  onSuccess={async () => { await fetchReviewFlags(); loadJob(); }}
                />
              </div>
            </div>

            <AlertDialogFooter>
              <Button onClick={() => setShowReviewDialog(false)}>
                Done
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Review Button for Freelancer after job completion */}
        {job?.status === 'completed' && getUserRole() === 'freelancer' && (!hasLeftUserReview || !hasLeftPlatformReview) && (
          <Card className="p-6 mt-6 bg-primary/5 border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Job Completed!</h3>
                <p className="text-muted-foreground">
                  Please leave a review for the client and the platform
                </p>
              </div>
              <Button onClick={() => setShowReviewDialog(true)}>
                Leave Reviews
              </Button>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
};

export default JobDetails;