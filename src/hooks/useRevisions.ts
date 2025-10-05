import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Revision {
  id: string;
  job_id: string;
  revision_number: number;
  ipfs_hash: string;
  git_commit_hash?: string;
  submitted_by: string;
  submitted_at: string;
  notes?: string;
}

export const useRevisions = () => {
  const [loading, setLoading] = useState(false);

  const submitRevision = async (
    jobId: string,
    ipfsHash: string,
    gitCommitHash?: string,
    notes?: string
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to submit revisions",
          variant: "destructive"
        });
        return false;
      }

      // Fetch fresh job data to get current revision number
      const { data: job, error: fetchError } = await supabase
        .from('jobs')
        .select('current_revision_number, freelancer_id')
        .eq('id', jobId)
        .single();

      if (fetchError) throw fetchError;

      // Verify user is the freelancer
      if (job.freelancer_id !== user.id) {
        toast({
          title: "Access Denied",
          description: "Only the assigned freelancer can submit revisions",
          variant: "destructive"
        });
        return false;
      }

      const nextRevisionNumber = (job.current_revision_number || 0) + 1;

      // Insert revision record
      const { error: revisionError } = await supabase
        .from('job_revisions')
        .insert({
          job_id: jobId,
          revision_number: nextRevisionNumber,
          ipfs_hash: ipfsHash,
          git_commit_hash: gitCommitHash,
          submitted_by: user.id,
          notes: notes || `Revision #${nextRevisionNumber}`
        });

      if (revisionError) throw revisionError;

      // Update job
      const { error: jobError } = await supabase
        .from('jobs')
        .update({
          status: 'under_review',
          current_revision_number: nextRevisionNumber,
          ipfs_hash: ipfsHash,
          git_commit_hash: gitCommitHash,
          review_deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days
        })
        .eq('id', jobId);

      if (jobError) throw jobError;

      toast({
        title: "Revision Submitted",
        description: `Revision #${nextRevisionNumber} submitted successfully`,
      });

      return true;
    } catch (error) {
      console.error('Error submitting revision:', error);
      toast({
        title: "Failed to Submit Revision",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const requestRevision = async (jobId: string, notes: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to request revisions",
          variant: "destructive"
        });
        return false;
      }

      // Get current job data
      const { data: job, error: fetchError } = await supabase
        .from('jobs')
        .select('current_revision_number, allowed_revisions, client_id')
        .eq('id', jobId)
        .single();

      if (fetchError) throw fetchError;

      // Verify user is the client
      if (job.client_id !== user.id) {
        toast({
          title: "Access Denied",
          description: "Only the client can request revisions",
          variant: "destructive"
        });
        return false;
      }

      if (job.current_revision_number >= job.allowed_revisions) {
        toast({
          title: "Max Revisions Reached",
          description: `Maximum of ${job.allowed_revisions} revisions allowed. Consider raising a dispute.`,
          variant: "destructive"
        });
        return false;
      }

      // Update job status to revision_requested
      const { error: updateError } = await supabase
        .from('jobs')
        .update({ 
          status: 'revision_requested',
          review_deadline: null // Clear review deadline when requesting revision
        })
        .eq('id', jobId);

      if (updateError) throw updateError;

      toast({
        title: "Revision Requested",
        description: notes,
      });

      return true;
    } catch (error) {
      console.error('Error requesting revision:', error);
      toast({
        title: "Failed to Request Revision",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getRevisionsByJobId = async (jobId: string): Promise<Revision[]> => {
    try {
      const { data, error } = await supabase
        .from('job_revisions')
        .select('*')
        .eq('job_id', jobId)
        .order('revision_number', { ascending: true });

      if (error) throw error;
      return data as Revision[];
    } catch (error) {
      console.error('Error fetching revisions:', error);
      return [];
    }
  };

  return {
    submitRevision,
    requestRevision,
    getRevisionsByJobId,
    loading
  };
};