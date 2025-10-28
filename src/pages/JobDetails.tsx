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
import { OwnershipTransferPanel } from "@/components/OwnershipTransferPanel";
import { ReviewPanel } from "@/components/ReviewPanel";
import { SocialMediaReviewPanel } from "@/components/SocialMediaReviewPanel";
import { SocialMediaCredentialSubmitPanel } from "@/components/SocialMediaCredentialSubmitPanel";
import { RatingDialog } from "@/components/RatingDialog";
import { PlatformReviewDialog } from "@/components/PlatformReviewDialog";
import { WalletConnectFunding } from "@/components/WalletConnectFunding";
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
  const { fundJob, approveJob, submitWork: submitWorkToBlockchain, checkJobFunded, getJobDetails } = useEscrow();
  const [job, setJob] = useState<any>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [proposal, setProposal] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState("");
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [hasLeftUserReview, setHasLeftUserReview] = useState(false);
  const [hasLeftPlatformReview, setHasLeftPlatformReview] = useState(false);
  const [hasSubmittedBid, setHasSubmittedBid] = useState(false);
  const [isJobFundedOnChain, setIsJobFundedOnChain] = useState<boolean | null>(null);
  const [showWalletConnectQR, setShowWalletConnectQR] = useState(false);
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
      const [{ data: userReview }, { data: existingBid }] = await Promise.all([
        supabase
          .from('reviews')
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
      setHasLeftPlatformReview(false); // Platform reviews are not job-specific
      setHasSubmittedBid(!!existingBid);
    } catch (e) {
      console.error('Error checking review flags', e);
    }
  };

  const loadJob = async (forceRefresh = false) => {
    // Force fresh data from database
    if (forceRefresh) {
      setJob(null); // Clear current job to show loading state
    }
    const data = await getJobById(id!);
    setJob(data);
    fetchReviewFlags();
    
    // Check if job is funded on blockchain (for in_progress status)
    if (data && (data.status === 'in_progress' || data.status === 'assigned')) {
      const fundCheck = await checkJobFunded(id!);
      setIsJobFundedOnChain(fundCheck.funded);
    }
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
              message: isSocialMediaPurchase() 
                ? `🔒 Purchase funded with ${amountUSDC} USDC. Please transfer account ownership to @defiescrow!`
                : `🔒 Job "${job.title}" funded with ${amountUSDC} USDC. You can start work!`,
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
        title: "Success!",
        description: isSocialMediaPurchase()
          ? "Escrow funded successfully. The seller will now transfer the account."
          : "Escrow funded successfully. The freelancer can now start working.",
      });
      
      // Add a small delay to ensure database has updated
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Force reload the job data from database
      await loadJob(true);
    }
  };

  const handleWalletConnectSuccess = async (txHash: string) => {
    if (!id || !job) return;
    
    const amountUSDC = String(job.budget_usdc || Number((job.budget_eth || 0) * 2000).toFixed(2));

    // Close the QR dialog
    setShowWalletConnectQR(false);

    // Notify freelancer via Telegram
    if (job.freelancer_id) {
      try {
        await supabase.functions.invoke('send-telegram-notification', {
          body: {
            recipient_id: job.freelancer_id,
            message: isSocialMediaPurchase() 
              ? `🔒 Purchase funded with ${amountUSDC} USDC. Please transfer account ownership to @defiescrow!`
              : `🔒 Job "${job.title}" funded with ${amountUSDC} USDC. You can start work!`,
            sender_id: user?.id,
            url: `${window.location.origin}/jobs/${id}`,
            button_text: 'View Details'
          }
        });
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
      }
    }
    
    // Mark job as funded/locked in DB immediately so UI updates and funding buttons disappear
    try {
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from('jobs')
        .update({
          status: 'in_progress' as any,
          started_at: nowIso,
          contract_address: txHash,
        })
        .eq('id', id);
      if (error) console.error('Failed to update job as funded:', error);
      // Optimistic local update to hide funding UI right away
      setJob((prev: any) => prev ? { ...prev, status: 'in_progress', started_at: nowIso, contract_address: txHash } : prev);
    } catch (e) {
      console.error('Error updating job funded state:', e);
    }
    
    toast({
      title: "Success!",
      description: isSocialMediaPurchase()
        ? "Escrow funded successfully. Redirecting to dashboard..."
        : "Escrow funded successfully. Redirecting to dashboard...",
    });
    
    // Wait a moment for the success message to be visible
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Navigate to dashboard to see the funded job
    navigate('/dashboard');
  };

  const handleSubmitWork = async (ipfsHash: string, gitHash: string, repositoryUrl: string, notes: string, walletAddress: string) => {
    if (!id) return;
    
    try {
      // Update database with submission details and freelancer wallet
      const { error } = await supabase
        .from('jobs')
        .update({
          status: 'under_review',
          ipfs_hash: ipfsHash,
          git_commit_hash: gitHash,
          repository_url: repositoryUrl || null,
          review_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        })
        .eq('id', id);

      if (error) throw error;

      // Store freelancer wallet address in their profile for payment release
      if (user?.id && walletAddress) {
        await supabase
          .from('profiles')
          .update({ wallet_address: walletAddress })
          .eq('id', user.id);
      }

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
        title: isSocialMediaPurchase() ? "Ownership Transferred" : "Work Submitted",
        description: isSocialMediaPurchase()
          ? "Transfer confirmed. The buyer will verify and release payment within 24 hours."
          : "Your work has been submitted for review. The client has 7 days to review.",
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

  const handleConfirmOwnershipTransfer = async (sellerWalletAddress: string) => {
    if (!id || !job) return;
    
    // First verify the job is funded on blockchain
    const fundCheck = await checkJobFunded(id);
    
    // Only block if we can verify AND it's not funded
    // If we can't verify due to RPC issues, allow proceeding (smart contract will enforce anyway)
    if (!fundCheck.funded && !fundCheck.canProceed) {
      toast({
        title: "Escrow Not Funded",
        description: "The client must fund the escrow before you can transfer ownership. Please wait for the client to fund the escrow.",
        variant: "destructive",
        duration: 10000
      });
      return;
    }
    
    // If RPC couldn't verify but we're allowing to proceed, warn the user
    if (!fundCheck.funded && fundCheck.canProceed && fundCheck.error?.includes('RPC')) {
      console.warn('Proceeding with transfer despite RPC verification issue:', fundCheck.error);
    }
    
    try {
      // Check if it's a Telegram purchase
      const isTelegramPurchase = job.title.toLowerCase().includes('telegram');
      
      // For Telegram purchases, verify ownership was transferred to escrow FIRST
      if (isTelegramPurchase && job.listing_id) {
        const { data: listing } = await supabase
          .from('social_media_listings')
          .select('account_name')
          .eq('id', job.listing_id)
          .single();

        if (listing?.account_name) {
          // Call backend to verify escrow owns the channel
          const transferServiceUrl = import.meta.env.VITE_TRANSFER_SERVICE_URL;
          const transferServiceSecret = import.meta.env.VITE_TRANSFER_SERVICE_SECRET;

          // Check if backend is configured
          if (!transferServiceUrl || !transferServiceSecret || 
              transferServiceUrl.includes('YOUR_') || 
              transferServiceSecret.includes('YOUR_')) {
            toast({
              title: "⚠️ Ownership Not Verified",
              description: "You must transfer channel ownership to @defiescrow before confirming. The escrow will verify ownership before releasing payment.",
              variant: "destructive",
              duration: 10000
            });
            return;
          }

          try {
            toast({
              title: "Verifying Ownership",
              description: "Checking if ownership was transferred to escrow...",
            });

            const ownershipResponse = await fetch(`${transferServiceUrl}/api/check-ownership`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-API-Secret': transferServiceSecret,
              },
              body: JSON.stringify({
                channelUsername: listing.account_name
              }),
            });

            if (!ownershipResponse.ok) {
              throw new Error(`API returned status ${ownershipResponse.status}`);
            }

            const ownershipResult = await ownershipResponse.json();
            console.log('Ownership check result:', ownershipResult);

            // Check if the response indicates ownership is NOT transferred
            if (!ownershipResult.isOwner || ownershipResult.currentRole !== 'creator') {
              toast({
                title: "❌ Ownership Not Transferred",
                description: `The channel ownership has NOT been transferred to @defiescrow yet. Current status: ${ownershipResult.currentRole || 'not owner'}. Please transfer ownership in Telegram settings first, then try again.`,
                variant: "destructive",
                duration: 15000
              });
              return;
            }

            // Ownership verified - don't show toast yet, wait for actual transfer result
            console.log('✓ Ownership verified, proceeding with transfer...');
          } catch (ownershipError: any) {
            console.error('Ownership verification error:', ownershipError);
            toast({
              title: "❌ Cannot Verify Ownership",
              description: `Failed to verify ownership transfer to @defiescrow. Error: ${ownershipError.message}. Make sure you've transferred the channel ownership first.`,
              variant: "destructive",
              duration: 12000
            });
            return;
          }
        }
      }
      
      // For Telegram: status -> awaiting_escrow_verification (escrow needs to handle transfer)
      // For others: status -> under_review (buyer needs to verify)
      const newStatus = isTelegramPurchase ? 'awaiting_escrow_verification' : 'under_review';
      
      const { error } = await supabase
        .from('jobs')
        .update({
          status: newStatus as any,
          review_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      // For Telegram purchases, trigger automated transfer
      if (isTelegramPurchase && job.listing_id) {
        try {
          // Get the channel/group username from the listing
          const { data: listing } = await supabase
            .from('social_media_listings')
            .select('account_name')
            .eq('id', job.listing_id)
            .single();

          if (listing?.account_name) {
            // Trigger the automated Telegram transfer - let edge function handle everything
            toast({
              title: "Processing Transfer",
              description: "Initiating automated Telegram ownership transfer...",
            });

            const { data: transferResult, error: transferError } = await supabase.functions.invoke(
              'telegram-auto-transfer',
              {
                body: {
                  jobId: id,
                  channelUsername: '', // Let the edge function get it from the listing
                  sellerWalletAddress: sellerWalletAddress // Pass seller's wallet for payment release
                }
              }
            );

            if (transferError) {
              console.error('Transfer error:', transferError);
              toast({
                title: "❌ Transfer Error",
                description: `Automated transfer failed: ${transferError.message}. Please check the logs.`,
                variant: "destructive",
                duration: 10000
              });
            } else if (transferResult?.success) {
              toast({
                title: "✅ Transfer Complete!",
                description: `Ownership transferred to buyer and payment auto-released to ${sellerWalletAddress.slice(0, 6)}...${sellerWalletAddress.slice(-4)}`,
                duration: 8000
              });
            }
          }
        } catch (transferError: any) {
          console.error('Error in automated transfer:', transferError);
          toast({
            title: "Transfer Issue",
            description: "Automated transfer encountered an issue. Admin will process manually.",
            variant: "destructive"
          });
        }
      }

      // Send notifications and show success toast (only if not Telegram, as Telegram auto-transfer handles its own notifications)
      if (!isTelegramPurchase) {
        toast({
          title: "✅ Transfer Confirmed",
          description: "Buyer has been notified to verify and release payment.",
          duration: 6000
        });
        
        // Notify buyer to verify (non-Telegram platforms)
        if (job.client_id) {
          try {
            await supabase.functions.invoke('send-telegram-notification', {
              body: {
                recipient_id: job.client_id,
                message: `✅ Seller has transferred ownership for "${job.title}".\n\nPlease verify and approve payment on the blockchain.`,
                sender_id: user?.id,
                url: `${window.location.origin}/job-details/${id}`,
                button_text: 'View Purchase Details'
              }
            });
          } catch (notifError) {
            console.error('Error sending notification:', notifError);
          }
        }
      } else {
        // Notify buyer to verify (non-Telegram platforms)
        if (job.client_id) {
          try {
            await supabase.functions.invoke('send-telegram-notification', {
              body: {
                recipient_id: job.client_id,
                message: `✅ Seller confirmed ownership transfer for "${job.title}".\n\nEscrow is verifying the account. You will receive access credentials shortly. Please verify and confirm receipt within 24 hours.`,
                sender_id: user?.id,
                url: `${window.location.origin}/job-details/${id}`,
                button_text: 'View Purchase Details'
              }
            });
          } catch (notifError) {
            console.error('Error sending notification:', notifError);
          }
        }
      }

      loadJob();
    } catch (error) {
      console.error('Error confirming transfer:', error);
      throw error;
    }
  };

  const handleApproveWork = async () => {
    if (!id || !job) return;
    
    try {
      // Get freelancer's wallet address from their profile
      const { data: freelancerProfile } = await supabase
        .from('profiles')
        .select('wallet_address')
        .eq('id', job.freelancer_id)
        .single();

      if (!freelancerProfile?.wallet_address) {
        toast({
          title: "Missing Wallet Address",
          description: "Freelancer hasn't provided their wallet address yet.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Processing Payment",
        description: "Releasing funds to freelancer's wallet...",
      });

      const { success, txHash } = await approveJob(id);
      if (!success) {
        // Detailed error toasts already shown by approveJob
        return;
      }

      console.log('Payment released on-chain:', txHash);

      // Update job status to completed
      const { error: jobError } = await supabase
        .from('jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (jobError) throw jobError;

      // Update listing status to sold for social media purchases
      if (isSocialMediaPurchase() && job.listing_id) {
        await supabase
          .from('social_media_listings')
          .update({ status: 'sold' })
          .eq('id', job.listing_id);
      }

      // Update freelancer stats
      try {
        await supabase.rpc('increment_completed_jobs', {
          user_id_param: job.freelancer_id
        });
      } catch (profileError) {
        console.error('Error updating profile:', profileError);
      }

      // Notify both parties via Telegram
      if (job.freelancer_id) {
        try {
          await supabase.functions.invoke('send-telegram-notification', {
            body: {
              recipient_id: job.freelancer_id,
              message: `🎉 Payment released! Funds have been sent to your wallet for "${job.title}". TX: ${txHash.substring(0, 10)}...`,
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
              message: `✅ Job "${job.title}" completed! Funds released to freelancer. TX: ${txHash.substring(0, 10)}...`,
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
        title: isSocialMediaPurchase() ? "Payment Released" : "Work Approved",
        description: `Funds released to freelancer. Transaction: ${txHash.substring(0, 10)}...`,
        duration: 8000
      });

      loadJob();
      
      // Show review dialog after successful approval
      setShowReviewDialog(true);
    } catch (error) {
      console.error('Error approving work:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to approve work and release payment",
        variant: "destructive"
      });
    }
  };

  const isSocialMediaPurchase = (): boolean => {
    return job?.title?.startsWith('Social Media Purchase:') || false;
  };

  const getUserRole = (): 'client' | 'freelancer' | null => {
    if (!user || !job) return null;
    if (job.client_id === user.id) return 'client';
    if (job.freelancer_id === user.id) return 'freelancer';
    return null;
  };

  if (loading || !job) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
        {/* Enhanced animated background */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-20 left-10 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

        <Navbar />
        <main className="container mx-auto px-4 py-8 pt-24">
          <Card className="p-8 text-center glass-card shadow-card">
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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      {/* Enhanced animated background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-20 left-10 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      <Navbar />
      
      <main className="container mx-auto px-4 py-8 pt-24 animate-fade-in">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {isSocialMediaPurchase() ? 'Back to Marketplace' : 'Back to Jobs'}
        </Button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Job Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job/Purchase Details Card - Show to everyone */}
            <Card className="p-6 glass-card shadow-card hover:shadow-glow transition-smooth">
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
                    <p className="text-sm text-muted-foreground">{isSocialMediaPurchase() ? 'Price' : 'Budget'}</p>
                    <p className="font-semibold">{job.budget_usdc || (job.budget_eth * 2000).toFixed(2)} USDC</p>
                  </div>
                </div>
                {!isSocialMediaPurchase() && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="font-semibold">{durationText}</p>
                    </div>
                  </div>
                )}
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
                <h2 className="text-xl font-semibold mb-3">
                  {isSocialMediaPurchase() ? 'Purchase Details' : 'Description'}
                </h2>
                {isSocialMediaPurchase() && job.status === 'under_review' ? (
                  // Parse and display credentials in a formatted way
                  (() => {
                    try {
                      const credentials = JSON.parse(job.description);
                      return (
                        <div className="space-y-4 bg-muted/30 p-4 rounded-lg border border-primary/10">
                          {credentials.loginEmail && (
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-primary">Login Email:</p>
                              <p className="text-muted-foreground">{credentials.loginEmail}</p>
                            </div>
                          )}
                          {credentials.loginUsername && (
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-primary">Login Username:</p>
                              <p className="text-muted-foreground">{credentials.loginUsername}</p>
                            </div>
                          )}
                          {credentials.password && (
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-primary">Password:</p>
                              <p className="text-muted-foreground font-mono">{credentials.password}</p>
                            </div>
                          )}
                          {credentials.recoveryEmail && (
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-primary">Recovery Email:</p>
                              <p className="text-muted-foreground">{credentials.recoveryEmail}</p>
                            </div>
                          )}
                          {credentials.recoveryPhone && (
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-primary">Recovery Phone:</p>
                              <p className="text-muted-foreground">{credentials.recoveryPhone}</p>
                            </div>
                          )}
                          {credentials.twoFactorBackupCodes && (
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-primary">2FA Backup Codes:</p>
                              <p className="text-muted-foreground whitespace-pre-line font-mono text-sm">{credentials.twoFactorBackupCodes}</p>
                            </div>
                          )}
                          {credentials.securityQuestions && (
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-primary">Security Questions:</p>
                              <p className="text-muted-foreground whitespace-pre-line">{credentials.securityQuestions}</p>
                            </div>
                          )}
                          {credentials.additionalNotes && (
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-primary">Additional Notes:</p>
                              <p className="text-muted-foreground whitespace-pre-line">{credentials.additionalNotes}</p>
                            </div>
                          )}
                          <div className="pt-4 border-t border-primary/10">
                            <p className="text-xs text-muted-foreground">
                              Platform: <span className="font-semibold">{credentials.platform}</span> • 
                              Account: <span className="font-semibold">{credentials.accountName}</span> • 
                              Submitted: <span className="font-semibold">{new Date(credentials.submittedAt).toLocaleString()}</span>
                            </p>
                          </div>
                        </div>
                      );
                    } catch (e) {
                      // If not valid JSON, show as plain text
                      return (
                        <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                          {job.description}
                        </p>
                      );
                    }
                  })()
                ) : (
                  <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                    {job.description}
                  </p>
                )}
              </div>

              {!isSocialMediaPurchase() && skills.length > 0 && (
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
            {getUserRole() === 'client' && job.status === 'assigned' && (
              <Card className="p-6 glass-card shadow-card">
                <h2 className="text-2xl font-bold mb-4">Fund Escrow</h2>
                <p className="text-muted-foreground mb-6">
                  {isSocialMediaPurchase() 
                    ? "You've initiated the purchase. Fund the escrow to begin the account transfer process."
                    : "You've accepted a proposal. Now fund the escrow to allow the freelancer to start working."}
                </p>
                <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Escrow Amount</span>
                    <span className="text-lg font-bold">{job.budget_usdc || (job.budget_eth * 2000).toFixed(2)} USDC</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isSocialMediaPurchase()
                      ? "Funds will be held in escrow until you confirm receipt of the account"
                      : "Funds will be held in escrow until work is approved"}
                  </p>
                </div>
                <Button 
                  onClick={() => setShowWalletConnectQR(true)} 
                  className="w-full shadow-glow" 
                  size="lg"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Scan QR to Fund Escrow
                </Button>
              </Card>
            )}

            {/* WalletConnect QR Modal */}
            {job && (
              <WalletConnectFunding
                isOpen={showWalletConnectQR}
                onClose={() => setShowWalletConnectQR(false)}
                onSuccess={handleWalletConnectSuccess}
                jobId={id!}
                freelancerAddress={job.freelancer?.wallet_address || ''}
                amountUSDC={String(job.budget_usdc || Number((job.budget_eth || 0) * 2000).toFixed(2))}
                escrowContractAddress={import.meta.env.VITE_ESCROW_CONTRACT_ADDRESS}
                usdcContractAddress="0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582"
                requiresStake={job.requires_freelancer_stake || false}
                allowedRevisions={job.allowed_revisions || 3}
              />
            )}

            {/* Client View - Review Work / Verify Transfer */}
            {getUserRole() === 'client' && job.status === 'under_review' && (
              isSocialMediaPurchase() ? (
                // Telegram purchases: do not show any panel/messages to the buyer after transfer
                job.title.toLowerCase().includes('telegram') ? null : (
                  <SocialMediaReviewPanel
                    job={job}
                    onApprove={handleApproveWork}
                    onRaiseDispute={handleRaiseDispute}
                  />
                )
              ) : (
                <ReviewPanel
                  job={job}
                  onApprove={handleApproveWork}
                  onRequestRevision={handleRequestRevision}
                  onRaiseDispute={handleRaiseDispute}
                />
              )
            )}


            {/* Client/Buyer View - Awaiting Escrow Verification (Telegram only) */}
            {getUserRole() === 'client' && job.status === 'awaiting_escrow_verification' && (
              <Card className="p-6 bg-primary/5 border-primary/20">
                <div className="flex items-start gap-4 mb-6">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-6 w-6 text-primary animate-spin" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-2">Automated Transfer in Progress</h2>
                    <p className="text-muted-foreground">
                      Seller has confirmed the transfer to escrow. Our system is automatically processing the ownership transfer to you and releasing payment to the seller.
                    </p>
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <span>⚡</span>
                    Automated Process Status
                  </h3>
                  <ul className="text-xs text-muted-foreground space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                      <span>Seller transferred ownership to escrow admin</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-primary mt-0.5 animate-spin" />
                      <span>Escrow verifying and transferring ownership to you</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-primary mt-0.5 animate-spin" />
                      <span>Smart contract auto-releasing payment to seller</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span>You'll be notified once complete (usually within minutes)</span>
                    </li>
                  </ul>
                  <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded">
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">No action needed:</strong> This entire process is fully automated. The ownership will be transferred to your Telegram account and payment will be released to the seller automatically.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Client View - Completed */}
            {getUserRole() === 'client' && job.status === 'completed' && (!hasLeftUserReview || !hasLeftPlatformReview) && (
              <Card className="p-6 bg-primary/5 border-primary/20">
                <div className="text-center mb-6">
                  <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">
                    {isSocialMediaPurchase() ? 'Purchase Complete!' : 'Project Completed!'}
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    {isSocialMediaPurchase()
                      ? 'Payment has been released to the seller'
                      : 'Funds have been released to the freelancer'}
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
                      revieweeName={job.freelancer?.display_name || (isSocialMediaPurchase() ? 'Seller' : 'Freelancer')}
                      trigger={
                        <Button className="w-full shadow-glow" size="lg">
                          {isSocialMediaPurchase() ? 'Rate Seller' : 'Rate Freelancer'}
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

            {/* Blockchain verification warning removed as requested */}

            {/* Freelancer/Seller View - Submit Work / Transfer Ownership / Submit Credentials */}
            {getUserRole() === 'freelancer' && (job.status === 'in_progress' || job.status === 'revision_requested') && (
              (() => {
                const isSmPurchase = isSocialMediaPurchase();
                
                if (isSmPurchase && job.status === 'in_progress') {
                  // Extract platform and account name from title
                  // Format: "Social Media Purchase: platform - account_name"
                  const titleParts = job.title.split(':')[1]?.trim().split(' - ') || [];
                  const platformName = titleParts[0]?.toLowerCase() || 'account';
                  const accountName = titleParts[1] || 'the account';
                  
                  // Check if it's Telegram - use old ownership transfer flow
                  if (platformName === 'telegram') {
                    return (
                      <OwnershipTransferPanel
                        jobId={id!}
                        platformName={platformName}
                        accountName={accountName}
                        onConfirmTransfer={handleConfirmOwnershipTransfer}
                      />
                    );
                  } else {
                    // For other social media - use credential submit flow
                    // Extract buyer email from job description
                    const descriptionLines = job.description?.split('\n') || [];
                    const buyerContactLine = descriptionLines.find((line: string) => line.startsWith('Buyer Contact:'));
                    const buyerEmail = buyerContactLine?.replace('Buyer Contact:', '').trim() || 'Not provided';
                    
                    return (
                      <SocialMediaCredentialSubmitPanel
                        jobId={id!}
                        platform={platformName}
                        accountName={accountName}
                        buyerEmail={buyerEmail}
                        onSubmit={() => loadJob()}
                      />
                    );
                  }
                } else {
                  // Regular job submission
                  return (
                    <WorkSubmissionPanel
                      jobId={id!}
                      onSubmit={async (ipfs, git, repoUrl, notes, walletAddr) => {
                        if (job.status === 'revision_requested') {
                          await handleSubmitRevision(ipfs, git);
                        } else {
                          await handleSubmitWork(ipfs, git, repoUrl, notes, walletAddr);
                        }
                      }}
                    />
                  );
                }
              })()
            )}

            {/* Freelancer/Seller View - Waiting for Review */}
            {getUserRole() === 'freelancer' && job.status === 'under_review' && (
              <Card className="p-6 glass-card shadow-card">
                <div className="text-center">
                  <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">
                    {isSocialMediaPurchase() ? 'Ownership Transferred ✓' : 'Work Submitted ✓'}
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    {isSocialMediaPurchase()
                      ? 'The ownership transfer has been confirmed. Waiting for buyer to verify and confirm receipt.'
                      : 'Your work has been submitted and is under review by the client.'}
                  </p>
                  <div className="p-4 bg-muted/50 rounded-lg mb-4">
                    {!isSocialMediaPurchase() && (
                      <>
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
                      </>
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

            {/* Freelancer/Seller View - Completed */}
            {getUserRole() === 'freelancer' && job.status === 'completed' && (!hasLeftUserReview || !hasLeftPlatformReview) && (
              <Card className="p-6 glass-card shadow-card border-primary/20">
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
                      revieweeName={job.client?.display_name || (isSocialMediaPurchase() ? 'Buyer' : 'Client')}
                      trigger={
                        <Button className="w-full shadow-glow" size="lg">
                          {isSocialMediaPurchase() ? 'Rate Buyer' : 'Rate Client'}
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
                <Card className="p-6 glass-card shadow-card border-primary/20">
                  <div className="text-center py-8">
                    <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Proposal Submitted</h2>
                    <p className="text-muted-foreground">
                      You've already submitted a proposal for this job. The client will review it and contact you if interested.
                    </p>
                  </div>
                </Card>
              ) : (
                  <Card className="p-6 glass-card shadow-card">
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
            <Card className="p-6 glass-card shadow-card">
              <h3 className="text-lg font-semibold mb-4">
                {isSocialMediaPurchase() ? 'Purchase Information' : 'Job Information'}
              </h3>
              
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
                  <p className="text-sm text-muted-foreground mb-2">
                    {isSocialMediaPurchase() ? 'Posted by verified seller' : 'Posted by verified client'}
                  </p>
                  <Badge variant="secondary" className="bg-success/10 text-success">
                    ✓ Verified
                  </Badge>
                </div>
              </div>
            </Card>

            {!isSocialMediaPurchase() && (
              <Card className="p-6 glass-card shadow-card">
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
            )}
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
