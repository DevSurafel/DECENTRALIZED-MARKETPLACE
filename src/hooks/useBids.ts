import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useBids = () => {
  const [loading, setLoading] = useState(false);

  const createBid = async (bidData: {
    job_id: string;
    bid_amount_usdc: number;
    estimated_duration_weeks: number;
    proposal_text: string;
  }) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to submit a bid",
          variant: "destructive"
        });
        return null;
      }

      const { data, error } = await supabase
        .from('bids')
        .insert([{
          job_id: bidData.job_id,
          bid_amount_usdc: bidData.bid_amount_usdc,
          proposal_text: bidData.proposal_text,
          freelancer_id: user.id,
          status: 'pending'
        } as any])
        .select()
        .single();

      if (error) throw error;

      // Get job details to notify client
      const { data: jobData } = await supabase
        .from('jobs')
        .select('client_id, title')
        .eq('id', bidData.job_id)
        .single();

      // Get freelancer's username
      const { data: freelancerProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();

      // Notify client via Telegram
      if (jobData?.client_id) {
        try {
          await supabase.functions.invoke('send-telegram-notification', {
            body: {
              recipient_id: jobData.client_id,
              message: `${freelancerProfile?.display_name || 'A freelancer'} submitted a proposal for "${jobData.title}"`,
              sender_id: user.id,
            }
          });
        } catch (notifError) {
          console.error('Error sending notification:', notifError);
        }
      }

      toast({
        title: "Bid submitted successfully",
        description: "The client will review your proposal"
      });
      return data;
    } catch (error) {
      console.error('Error creating bid:', error);
      toast({
        title: "Error",
        description: "Failed to submit bid",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getBidsByJobId = async (jobId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bids')
        .select(`
          *,
          freelancer:profiles!bids_freelancer_id_fkey(display_name, wallet_address, avatar_url, skills, average_rating)
        `)
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching bids:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getUserBids = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('bids')
        .select(`
          *,
          job:jobs!bids_job_id_fkey(title, budget_usdc, budget_eth, status)
        `)
        .eq('freelancer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user bids:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    createBid,
    getBidsByJobId,
    getUserBids,
    loading
  };
};