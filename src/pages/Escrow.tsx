import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Lock, 
  Unlock, 
  AlertTriangle, 
  Clock, 
  CheckCircle2,
  XCircle,
  ArrowRight,
  ExternalLink
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEscrow } from "@/hooks/useEscrow";

const Escrow = () => {
  const navigate = useNavigate();
  const { approveJob, raiseDispute, loading } = useEscrow();
  const [activeEscrows, setActiveEscrows] = useState<any[]>([]);
  const [historyEscrows, setHistoryEscrows] = useState<any[]>([]);

  useEffect(() => {
    fetchEscrows();
  }, []);

  const fetchEscrows = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch jobs where user is either client or freelancer
      const { data: jobs, error } = await supabase
        .from('jobs')
        .select(`
          *,
          client:profiles!jobs_client_id_fkey(display_name, wallet_address),
          freelancer:profiles!jobs_freelancer_id_fkey(display_name, wallet_address),
          milestones:job_milestones(*),
          dispute:disputes(*)
        `)
        .or(`client_id.eq.${user.id},freelancer_id.eq.${user.id}`)
        .in('status', ['in_progress', 'under_review', 'completed', 'disputed', 'cancelled', 'refunded']);

      if (error) throw error;

      // Transform to escrow format
      const escrowData = (jobs || []).map(job => ({
        _id: job.id,
        jobId: job.id,
        jobTitle: job.title,
        amount: job.budget_eth,
        status: job.status === 'in_progress' ? 'funded' : 
                job.status === 'under_review' ? 'submitted' :
                job.status === 'disputed' ? 'disputed' :
                job.status === 'completed' ? 'completed' : 'refunded',
        transactionHash: job.contract_address || 'N/A',
        createdAt: job.created_at,
        submissionDeadline: job.deadline,
        milestones: job.milestones,
        dispute: job.dispute?.[0]
      }));

      const active = escrowData.filter(e => 
        ['funded', 'submitted', 'disputed'].includes(e.status)
      );
      const history = escrowData.filter(e => 
        ['completed', 'refunded'].includes(e.status)
      );
      
      setActiveEscrows(active);
      setHistoryEscrows(history);
    } catch (error) {
      console.error('Error fetching escrows:', error);
      toast({
        title: "Error",
        description: "Failed to fetch escrow data",
        variant: "destructive"
      });
    }
  };

  const handleApprove = async (jobId: string) => {
    const success = await approveJob(parseInt(jobId));
    if (success) {
      fetchEscrows();
    }
  };

  const handleDispute = async (jobId: string) => {
    const success = await raiseDispute(parseInt(jobId));
    if (success) {
      fetchEscrows();
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; icon: any }> = {
      funded: { color: "bg-blue-500/10 text-blue-500", icon: Lock },
      submitted: { color: "bg-yellow-500/10 text-yellow-500", icon: Clock },
      disputed: { color: "bg-red-500/10 text-red-500", icon: AlertTriangle },
      completed: { color: "bg-green-500/10 text-green-500", icon: CheckCircle2 },
      refunded: { color: "bg-gray-500/10 text-gray-500", icon: XCircle }
    };

    const variant = variants[status] || variants.funded;
    const Icon = variant.icon;

    return (
      <Badge className={variant.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status.toUpperCase()}
      </Badge>
    );
  };

  const renderEscrowCard = (escrow: any, showActions = false) => (
    <Card key={escrow._id} className="p-6 bg-card/50 backdrop-blur hover:bg-card/70 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold mb-2">{escrow.jobTitle}</h3>
          {getStatusBadge(escrow.status)}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary">{escrow.amount} ETH</p>
          <p className="text-sm text-muted-foreground">Escrow Amount</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b">
        <div>
          <p className="text-sm text-muted-foreground">Transaction Hash</p>
          <div className="flex items-center gap-2">
            <p className="font-mono text-sm truncate">{escrow.transactionHash}</p>
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </div>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Created</p>
          <p className="font-semibold">
            {new Date(escrow.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {escrow.submissionDeadline && (
        <div className="bg-muted/50 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Submission Deadline:</span>
            <span className="font-semibold">
              {new Date(escrow.submissionDeadline).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}

      {showActions && escrow.status === 'submitted' && (
        <div className="flex gap-3">
          <Button 
            onClick={() => handleApprove(escrow.jobId)}
            disabled={loading}
            className="flex-1"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Approve & Release Payment
          </Button>
          <Button 
            onClick={() => handleDispute(escrow.jobId)}
            disabled={loading}
            variant="destructive"
            className="flex-1"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Raise Dispute
          </Button>
        </div>
      )}

      {escrow.status === 'disputed' && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-destructive mb-2">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-semibold">Dispute In Progress</span>
          </div>
          <p className="text-sm text-muted-foreground">
            An arbitrator is reviewing this case. You will be notified of the resolution.
          </p>
        </div>
      )}
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Escrow Management</h1>
          <p className="text-muted-foreground">
            Secure smart contract escrow for all your jobs
          </p>
        </div>

        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="active">
              Active Escrows ({activeEscrows.length})
            </TabsTrigger>
            <TabsTrigger value="history">
              History ({historyEscrows.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeEscrows.length === 0 ? (
              <Card className="p-12 text-center bg-card/50 backdrop-blur">
                <Lock className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No Active Escrows</h3>
                <p className="text-muted-foreground mb-6">
                  Your active escrow transactions will appear here
                </p>
                <Button onClick={() => navigate('/marketplace')}>
                  Browse Jobs
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Card>
            ) : (
              activeEscrows.map(escrow => renderEscrowCard(escrow, true))
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {historyEscrows.length === 0 ? (
              <Card className="p-12 text-center bg-card/50 backdrop-blur">
                <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No History</h3>
                <p className="text-muted-foreground">
                  Completed transactions will appear here
                </p>
              </Card>
            ) : (
              historyEscrows.map(escrow => renderEscrowCard(escrow, false))
            )}
          </TabsContent>
        </Tabs>

        {/* Info Section */}
        <Card className="mt-8 p-6 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-4">
            <Lock className="h-8 w-8 text-primary flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold mb-2">How Escrow Works</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Client funds the escrow when accepting a bid - funds are locked in smart contract</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Freelancer submits work via IPFS hash</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Client approves and payment is released, or raises dispute</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Auto-release if client doesn't respond within approval window</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Platform fee (2%) is deducted from payment automatically</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Escrow;
