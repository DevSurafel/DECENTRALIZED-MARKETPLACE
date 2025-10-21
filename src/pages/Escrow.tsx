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

      // Fetch jobs where user is either client or freelancer (include assigned, in_progress, disputed status)
      const { data: jobs, error } = await supabase
        .from('jobs')
        .select(`
          *,
          client:profiles!client_id(display_name, wallet_address),
          freelancer:profiles!freelancer_id(display_name, wallet_address),
          milestones:job_milestones(*),
          dispute:disputes(*)
        `)
        .or(`client_id.eq.${user.id},freelancer_id.eq.${user.id}`)
        .in('status', ['assigned', 'in_progress', 'under_review', 'completed', 'cancelled']);

      if (error) throw error;

      // Transform to escrow format
      const escrowData = (jobs || []).map(job => {
        const isClient = job.client_id === user.id;
        // Check for any disputes (pending or resolved)
        const pendingDispute = job.dispute?.find((d: any) => d.status === 'pending');
        const resolvedDispute = job.dispute?.find((d: any) => d.status === 'resolved');
        
        // Determine status - show 'awaiting_funding' for assigned jobs
        let escrowStatus = job.status === 'assigned' ? 'awaiting_funding' :
                           job.status === 'in_progress' ? 'locked' : 
                           job.status === 'under_review' ? 'locked' :
                           job.status === 'completed' ? 'completed' : 
                           job.status === 'cancelled' ? 'refunded' :
                           job.status === 'refunded' ? 'refunded' : 'completed';
        
        // Only set to disputed if there's an active pending dispute
        if (pendingDispute) {
          escrowStatus = 'disputed';
        }
        
        return {
          _id: job.id,
          jobId: job.id,
          jobTitle: job.title,
          amount: job.budget_eth,
          amountUsdc: job.budget_usdc,
          status: escrowStatus,
          transactionHash: job.contract_address || 'N/A',
          createdAt: job.created_at,
          submissionDeadline: job.deadline,
          milestones: job.milestones,
          dispute: pendingDispute || resolvedDispute,
          resolvedDispute: resolvedDispute,
          isClient: isClient
        };
      });

      const active = escrowData.filter(e => 
        ['awaiting_funding', 'locked', 'disputed'].includes(e.status)
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
    const result = await approveJob(jobId);
    if (result.success) {
      fetchEscrows();
    }
  };

  const handleDispute = async (jobId: string) => {
    const result = await raiseDispute(jobId);
    if (result.success) {
      fetchEscrows();
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; icon: any; label: string }> = {
      awaiting_funding: { color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", icon: Clock, label: "AWAITING FUNDING" },
      locked: { color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: Lock, label: "FUNDED & LOCKED" },
      disputed: { color: "bg-red-500/10 text-red-500 border-red-500/20", icon: AlertTriangle, label: "DISPUTED" },
      completed: { color: "bg-green-500/10 text-green-500 border-green-500/20", icon: CheckCircle2, label: "COMPLETED" },
      refunded: { color: "bg-gray-500/10 text-gray-500 border-gray-500/20", icon: XCircle, label: "REFUNDED" }
    };

    const variant = variants[status] || variants.locked;
    const Icon = variant.icon;

    return (
      <Badge className={variant.color}>
        <Icon className="h-3 w-3 mr-1" />
        {variant.label}
      </Badge>
    );
  };

  const renderEscrowCard = (escrow: any, showActions = false) => (
    <Card key={escrow._id} className="p-6 glass-card shadow-card hover:shadow-glow transition-smooth">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold mb-2">{escrow.jobTitle}</h3>
          {getStatusBadge(escrow.status)}
        </div>
        <div className="text-right">
          <p className="text-sm font-bold">Amount</p>
          <p className="text-xl font-bold text-primary">${escrow.amountUsdc} USDC</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b">
        <div>
          <p className="text-sm text-muted-foreground">Transaction Hash</p>
          <div className="flex items-center gap-1">
            <p className="font-mono text-sm truncate">{escrow.transactionHash}</p>
            {escrow.status !== 'awaiting_funding' && escrow.transactionHash !== 'N/A' && (
              <Button
                variant="default"
                size="sm"
                onClick={() => window.open(`https://amoy.polygonscan.com/tx/${escrow.transactionHash}`, '_blank')}
              >
                View
              </Button>
            )}
          </div>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Created</p>
          <p className="font-semibold">
            {new Date(escrow.createdAt).toLocaleDateString()} at {new Date(escrow.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

      {escrow.status === 'awaiting_funding' && (
        <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-500">
            <Clock className="h-5 w-5" />
            <span className="font-semibold">Awaiting Escrow Funding</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            The proposal has been accepted. {escrow.isClient ? 'Please fund the escrow to start the project.' : 'Waiting for client to fund the escrow.'}
          </p>
          {escrow.isClient && (
            <Button 
              onClick={() => navigate(`/jobs/${escrow.jobId}`)} 
              className="mt-3 w-full"
            >
              Fund Escrow Now
            </Button>
          )}
        </div>
      )}

      {escrow.status === 'locked' && (
        <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-center gap-2 text-blue-500">
            <Lock className="h-5 w-5" />
            <span className="font-semibold">Funds Securely Locked</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Payment is held in escrow until work is completed and approved by both parties.
          </p>
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

      {escrow.status === 'completed' && escrow.resolvedDispute && (
        <div className="bg-success/10 border border-success/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-success mb-2">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-semibold">Dispute Resolved</span>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            {escrow.resolvedDispute.resolution_notes || 'The dispute has been resolved by an arbitrator.'}
          </p>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="bg-background/50 rounded p-2">
              <p className="text-xs text-muted-foreground">Client Received</p>
              <p className="font-semibold">{escrow.resolvedDispute.client_amount_eth || 0} ETH</p>
            </div>
            <div className="bg-background/50 rounded p-2">
              <p className="text-xs text-muted-foreground">Freelancer Received</p>
              <p className="font-semibold">{escrow.resolvedDispute.freelancer_amount_eth || 0} ETH</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );

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
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl md:text-6xl font-bold mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Escrow Management
          </h1>
          <p className="text-base md:text-lg text-muted-foreground">
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

          <TabsContent value="active" className="space-y-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            {activeEscrows.length === 0 ? (
              <Card className="p-12 text-center glass-card shadow-card">
                <Lock className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No Active Escrows</h3>
                <p className="text-muted-foreground mb-6">
                  Your active escrow transactions will appear here
                </p>
                <Button onClick={() => navigate('/marketplace')} className="shadow-glow">
                  Browse Jobs
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Card>
            ) : (
              activeEscrows.map(escrow => renderEscrowCard(escrow, true))
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            {historyEscrows.length === 0 ? (
              <Card className="p-12 text-center glass-card shadow-card">
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
        <Card className="mt-8 p-6 glass-card shadow-card border-primary/20 animate-fade-in" style={{ animationDelay: '0.2s' }}>
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
