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

      // Create dispute record
      const { error: disputeError } = await supabase
        .from('disputes')
        .insert({
          job_id: jobId,
          raised_by: user.id,
          arbitration_deposit_eth: arbitrationDepositEth,
          status: 'pending'
        });

      if (disputeError) throw disputeError;

      // Update job status
      const { error: jobError } = await supabase
        .from('jobs')
        .update({ status: 'disputed' })
        .eq('id', jobId);

      if (jobError) throw jobError;

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

      // Update job status
      const { error: jobError } = await supabase
        .from('jobs')
        .update({ status: 'completed' })
        .eq('id', jobId);

      if (jobError) throw jobError;

      // Update reputation if penalties applied
      if (penalizeClient || slashFreelancerStake) {
        const { data: job } = await supabase
          .from('jobs')
          .select('client_id, freelancer_id')
          .eq('id', jobId)
          .single();

        if (job) {
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