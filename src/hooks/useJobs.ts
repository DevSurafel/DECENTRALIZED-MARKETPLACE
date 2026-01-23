import { useState } from 'react';
import { supabase } from '@/integrations/supabase/anyClient';
import { toast } from '@/hooks/use-toast';

export const useJobs = () => {
  const [loading, setLoading] = useState(false);

  const createJob = async (jobData: {
    title: string;
    description: string;
    budget_usdc: number;
    skills_required: string[];
    duration_weeks?: number;
    category?: string;
    experience_level?: string;
    payment_type?: string;
    project_type?: string;
    location_type?: string;
    timezone_preference?: string | null;
    freelancers_needed?: number;
    questions_for_freelancer?: string[];
    visibility?: string;
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
          budget_eth: jobData.budget_usdc / 2000,
          skills_required: jobData.skills_required,
          duration_weeks: jobData.duration_weeks,
          category: jobData.category,
          experience_level: jobData.experience_level,
          payment_type: jobData.payment_type,
          project_type: jobData.project_type,
          location_type: jobData.location_type,
          timezone_preference: jobData.timezone_preference,
          freelancers_needed: jobData.freelancers_needed || 1,
          questions_for_freelancer: jobData.questions_for_freelancer || [],
          visibility: jobData.visibility || 'public',
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
          client:profiles!client_id(display_name, wallet_address)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch bid counts for all jobs using the database function
      if (data && data.length > 0) {
        const jobsWithCounts = await Promise.all(
          data.map(async (job) => {
            const { data: countData } = await supabase
              .rpc('get_job_bid_count' as any, { job_id_param: job.id });
            return {
              ...job,
              bids: [{ count: countData || 0 }]
            };
          })
        );
        return jobsWithCounts;
      }
      
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
          client:profiles!client_id(display_name, wallet_address, avatar_url),
          freelancer:profiles!freelancer_id(display_name, wallet_address, avatar_url)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
      // Fetch bid count using database function
      const { data: bidCount } = await supabase
        .rpc('get_job_bid_count' as any, { job_id_param: id });
      
      return {
        ...data,
        bids: [{ count: bidCount || 0 }]
      };
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
