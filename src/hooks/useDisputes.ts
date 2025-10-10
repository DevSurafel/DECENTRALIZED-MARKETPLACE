import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Dispute {
  id: string;
  job_id: string;
  raised_by: string;
  raised_at: string;
  arbitration_deposit_eth: number;
  status: 'pending' | 'resolved';
  resolution_notes?: string;
  client_amount_eth?: number;
  freelancer_amount_eth?: number;
  resolved_at?: string;
  resolved_by?: string;
  evidence_bundle?: any;
}

export const useDisputes = () => {
  const [loading, setLoading] = useState(false);

  const raiseDispute = async (jobId: string, arbitrationDepositEth: number): Promise<boolean> => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to raise a dispute",
          variant: "destructive"
        });
        return false;
      }

      // Fetch job details to include in evidence
      const { data: jobData } = await supabase
        .from('jobs')
        .select('title, description, ipfs_hash, git_commit_hash, budget_eth, client_id, freelancer_id')
        .eq('id', jobId)
        .single();

      // Fetch all revisions for this job
      const { data: revisions } = await supabase
        .from('job_revisions')
        .select('*')
        .eq('job_id', jobId)
        .order('submitted_at', { ascending: false });

      // Create evidence bundle with job details and work submissions
      const evidenceBundle = {
        job_title: jobData?.title,
        job_description: jobData?.description,
        submitted_work: {
          ipfs_hash: jobData?.ipfs_hash,
          git_commit_hash: jobData?.git_commit_hash,
        },
        revisions: revisions || [],
        dispute_raised_at: new Date().toISOString(),
        raised_by_user_id: user.id
      };

      // Create dispute record with evidence
      const { error: disputeError } = await supabase
        .from('disputes')
        .insert({
          job_id: jobId,
          raised_by: user.id,
          arbitration_deposit_eth: arbitrationDepositEth,
          status: 'open',
          reason: 'Dispute raised'
        });

      if (disputeError) throw disputeError;

      // Update job status to disputed
      const { error: jobUpdateError } = await supabase
        .from('jobs')
        .update({ status: 'disputed' })
        .eq('id', jobId);

      if (jobUpdateError) {
        console.error('Failed to update job status:', jobUpdateError);
      }

      // Notify both client and freelancer via Telegram
      if (jobData?.client_id && jobData?.freelancer_id) {
        const otherPartyId = user.id === jobData.client_id ? jobData.freelancer_id : jobData.client_id;
        const { data: raiserProfile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single();

        try {
          await supabase.functions.invoke('send-telegram-notification', {
            body: {
              recipient_id: otherPartyId,
              message: `⚠️ ${raiserProfile?.display_name || 'The other party'} raised a dispute for job "${jobData.title}". An arbitrator will review.`,
              sender_id: user.id,
              url: `${window.location.origin}/jobs/${jobId}`,
              button_text: 'View Details'
            }
          });
        } catch (notifError) {
          console.error('Error sending telegram notification:', notifError);
        }
      }

      toast({
        title: "Dispute Raised",
        description: `Dispute raised successfully. Arbitration deposit: ${arbitrationDepositEth} ETH. An arbitrator will review.`,
      });

      return true;
    } catch (error) {
      console.error('Error raising dispute:', error);
      toast({
        title: "Failed to Raise Dispute",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getDisputesByJobId = async (jobId: string): Promise<Dispute | null> => {
    try {
      const { data, error } = await supabase
        .from('disputes')
        .select('*')
        .eq('job_id', jobId)
        .order('raised_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as Dispute;
    } catch (error) {
      console.error('Error fetching dispute:', error);
      return null;
    }
  };

  const getPendingDisputes = async (): Promise<Dispute[]> => {
    try {
      const { data, error } = await supabase
        .from('disputes')
        .select(`
          *,
          jobs:job_id (
            title,
            client_id,
            freelancer_id
          )
        `)
        .eq('status', 'pending')
        .order('raised_at', { ascending: false });

      if (error) throw error;
      return data as Dispute[];
    } catch (error) {
      console.error('Error fetching pending disputes:', error);
      return [];
    }
  };

  const resolveDispute = async (
    disputeId: string,
    jobId: string,
    clientAmountEth: number,
    freelancerAmountEth: number,
    resolutionNotes: string,
    penalizeClient: boolean,
    slashFreelancerStake: boolean
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to resolve disputes",
          variant: "destructive"
        });
        return false;
      }

      // Check if user is arbitrator
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const isArbitrator = roles?.some(r => r.role === 'arbitrator' || r.role === 'admin');
      
      if (!isArbitrator) {
        toast({
          title: "Unauthorized",
          description: "Only arbitrators can resolve disputes",
          variant: "destructive"
        });
        return false;
      }

      // Update dispute
      const { error: disputeError } = await supabase
        .from('disputes')
        .update({
          status: 'resolved',
          resolution_notes: resolutionNotes,
          client_amount_eth: clientAmountEth,
          freelancer_amount_eth: freelancerAmountEth,
          resolved_at: new Date().toISOString(),
          resolved_by: user.id
        })
        .eq('id', disputeId);

      if (disputeError) throw disputeError;

      // Fetch job and profile details
      const { data: job } = await supabase
        .from('jobs')
        .select('client_id, freelancer_id')
        .eq('id', jobId)
        .single();

      if (!job) throw new Error('Job not found');

      // Update job status
      const { error: jobError } = await supabase
        .from('jobs')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (jobError) throw jobError;

      // Update freelancer earnings and stats (only freelancer gets earnings, not client refund)
      if (freelancerAmountEth > 0 && job.freelancer_id) {
        const { data: freelancerProfile } = await supabase
          .from('profiles')
          .select('total_earnings, completed_jobs, failed_disputes')
          .eq('id', job.freelancer_id)
          .single();

        if (freelancerProfile) {
          await supabase
            .from('profiles')
            .update({ 
              total_earnings: (freelancerProfile.total_earnings || 0) + freelancerAmountEth,
              completed_jobs: (freelancerProfile.completed_jobs || 0) + 1,
              success_rate: ((freelancerProfile.completed_jobs || 0) + 1) / 
                           ((freelancerProfile.completed_jobs || 0) + 1 + (freelancerProfile.failed_disputes || 0)) * 100
            })
            .eq('id', job.freelancer_id);
        }
      }

      // Update reputation if penalties applied
      if (penalizeClient || slashFreelancerStake) {
        if (penalizeClient) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('dispute_strikes')
            .eq('id', job.client_id)
            .single();
          
          if (profile) {
            await supabase
              .from('profiles')
              .update({ dispute_strikes: (profile.dispute_strikes || 0) + 1 })
              .eq('id', job.client_id);
          }
        }
        if (slashFreelancerStake) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('dispute_strikes')
            .eq('id', job.freelancer_id)
            .single();
          
          if (profile) {
            await supabase
              .from('profiles')
              .update({ dispute_strikes: (profile.dispute_strikes || 0) + 1 })
              .eq('id', job.freelancer_id);
          }
        }
      }

      // Notify both client and freelancer via Telegram about resolution
      try {
        const [clientNotif, freelancerNotif] = await Promise.all([
          supabase.functions.invoke('send-telegram-notification', {
            body: {
              recipient_id: job.client_id,
              message: `✅ Dispute resolved for the job. You received ${clientAmountEth} ETH.`,
              url: `${window.location.origin}/escrow`,
              button_text: 'View Escrow'
            }
          }),
          supabase.functions.invoke('send-telegram-notification', {
            body: {
              recipient_id: job.freelancer_id,
              message: `✅ Dispute resolved for the job. You received ${freelancerAmountEth} ETH.`,
              url: `${window.location.origin}/escrow`,
              button_text: 'View Escrow'
            }
          })
        ]);
      } catch (notifError) {
        console.error('Error sending resolution notifications:', notifError);
      }

      toast({
        title: "Dispute Resolved",
        description: `Dispute resolved. Client: ${clientAmountEth} ETH, Freelancer: ${freelancerAmountEth} ETH`,
      });

      return true;
    } catch (error) {
      console.error('Error resolving dispute:', error);
      toast({
        title: "Failed to Resolve Dispute",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    raiseDispute,
    getDisputesByJobId,
    getPendingDisputes,
    resolveDispute,
    loading
  };
};