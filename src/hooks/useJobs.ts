import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useJobs = () => {
  const [loading, setLoading] = useState(false);

  const createJob = async (jobData: {
    title: string;
    description: string;
    budget_usdc: number;
    skills_required: string[];
    duration_weeks?: number;
  }) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to post a job",
          variant: "destructive"
        });
        return null;
      }

      const { data, error } = await supabase
        .from('jobs')
        .insert([{
          title: jobData.title,
          description: jobData.description,
          budget_usdc: jobData.budget_usdc,
          budget_eth: jobData.budget_usdc / 2000, // Convert for backward compatibility
          skills_required: jobData.skills_required,
          duration_weeks: jobData.duration_weeks,
          client_id: user.id,
          status: 'open'
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Job posted successfully",
        description: "Your job is now live in the marketplace"
      });
      return data;
    } catch (error) {
      console.error('Error creating job:', error);
      toast({
        title: "Error",
        description: "Failed to post job",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getJobs = async (filters?: { status?: string }) => {
    setLoading(true);
    try {
      let query = supabase
        .from('jobs')
        .select(`
          *,
          client:profiles!jobs_client_id_fkey(display_name, wallet_address),
          bids(count)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast({
        title: "Error",
        description: "Failed to load jobs",
        variant: "destructive"
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getJobById = async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          client:profiles!jobs_client_id_fkey(display_name, wallet_address, avatar_url),
          freelancer:profiles!jobs_freelancer_id_fkey(display_name, wallet_address, avatar_url),
          bids(count)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching job:', error);
      toast({
        title: "Error",
        description: "Failed to load job details",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getUserJobs = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .or(`client_id.eq.${user.id},freelancer_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user jobs:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    createJob,
    getJobs,
    getJobById,
    getUserJobs,
    loading
  };
};
