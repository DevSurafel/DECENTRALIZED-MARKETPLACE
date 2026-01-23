import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useBids } from "@/hooks/useBids";
import { useJobs } from "@/hooks/useJobs";
import { supabase } from "@/integrations/supabase/anyClient";
import { toast } from "@/hooks/use-toast";
import { DollarSign, Clock, Star, CheckCircle, User } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BidsPanelProps {
  jobId: string;
  onBidAccepted: () => void;
}

export function BidsPanel({ jobId, onBidAccepted }: BidsPanelProps) {
  const [bids, setBids] = useState<any[]>([]);
  const [selectedBid, setSelectedBid] = useState<any>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const { getBidsByJobId, loading } = useBids();

  useEffect(() => {
    loadBids();
  }, [jobId]);

  const loadBids = async () => {
    const data = await getBidsByJobId(jobId);
    setBids(data || []);
  };

  const handleAcceptBid = async () => {
    if (!selectedBid) return;
    
    setAccepting(true);
    try {
      // Update bid status to accepted
      const { error: bidError } = await supabase
        .from('bids')
        .update({ status: 'accepted' })
        .eq('id', selectedBid.id);

      if (bidError) throw bidError;

      // Update job with freelancer and status to 'assigned' (waiting for funding)
      const { error: jobError } = await supabase
        .from('jobs')
        .update({
          freelancer_id: selectedBid.freelancer_id,
          accepted_bid_id: selectedBid.id,
          status: 'assigned',
          started_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      if (jobError) throw jobError;

      // Reject other bids
      const { error: rejectError } = await supabase
        .from('bids')
        .update({ status: 'rejected' })
        .eq('job_id', jobId)
        .neq('id', selectedBid.id);

      if (rejectError) throw rejectError;

      // Get job details for notification
      const { data: jobData } = await supabase
        .from('jobs')
        .select('title, client_id')
        .eq('id', jobId)
        .single();

      // Get client's display name
      const { data: clientProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', jobData?.client_id)
        .single();

      // Notify freelancer via Telegram
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.functions.invoke('send-telegram-notification', {
          body: {
            recipient_id: selectedBid.freelancer_id,
            message: `${clientProfile?.display_name || 'The client'} has accepted your proposal for "${jobData?.title}". Please wait for the client to fund the escrow with their wallet.`,
            sender_id: user?.id,
            url: `${window.location.origin}/jobs/${jobId}`,
            button_text: 'View Details'
          }
        });
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
      }

      toast({
        title: "Bid Accepted",
        description: "You can now proceed to fund the escrow for this job.",
      });

      setShowConfirm(false);
      onBidAccepted();
    } catch (error) {
      console.error('Error accepting bid:', error);
      toast({
        title: "Error",
        description: "Failed to accept bid",
        variant: "destructive"
      });
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return <Card className="p-6"><p className="text-muted-foreground">Loading proposals...</p></Card>;
  }

  if (bids.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">No proposals yet. Freelancers can submit proposals for this job.</p>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Proposals ({bids.length})</h2>
        {bids.map((bid) => (
          <Card key={bid.id} className="p-6 hover:shadow-glow transition-all">
            <div className="flex items-start gap-4 mb-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={bid.freelancer?.avatar_url} />
                <AvatarFallback>
                  <User className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-lg">
                    {bid.freelancer?.display_name || 'Freelancer'}
                  </h3>
                  <Badge variant={bid.status === 'accepted' ? 'default' : 'secondary'}>
                    {bid.status}
                  </Badge>
                </div>
                {bid.freelancer?.average_rating > 0 && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Star className="h-4 w-4 fill-warning text-warning" />
                    <span>{bid.freelancer.average_rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm whitespace-pre-line">{bid.proposal_text}</p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-success" />
                  <span><strong>{bid.bid_amount_usdc || (bid.bid_amount_eth * 2000).toFixed(2)} USDC</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>{bid.estimated_duration_weeks} weeks</span>
                </div>
              </div>

              {bid.status === 'pending' && (
                <Button
                  onClick={() => {
                    setSelectedBid(bid);
                    setShowConfirm(true);
                  }}
                  className="shadow-glow text-xs sm:text-sm h-8 sm:h-10 px-3 sm:px-4"
                >
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Accept Proposal</span>
                  <span className="sm:hidden">Accept</span>
                </Button>
              )}
            </div>

            {bid.freelancer?.skills && bid.freelancer.skills.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Skills:</p>
                <div className="flex flex-wrap gap-2">
                  {bid.freelancer.skills.map((skill: string, idx: number) => (
                    <Badge key={idx} variant="outline">{skill}</Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accept This Proposal?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to accept {selectedBid?.freelancer?.display_name || 'this freelancer'}'s proposal for {selectedBid?.bid_amount_usdc || (selectedBid?.bid_amount_eth * 2000).toFixed(2)} USDC.
              <br /><br />
              <strong>Next Steps:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>This proposal will be accepted</li>
                <li>All other proposals will be rejected</li>
                <li>You'll need to fund the escrow to start the project</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={accepting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAcceptBid} disabled={accepting}>
              {accepting ? "Accepting..." : "Accept & Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
