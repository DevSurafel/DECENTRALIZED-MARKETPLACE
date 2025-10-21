import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDisputes } from '@/hooks/useDisputes';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Gavel, FileText, ExternalLink, Clock, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function ArbitratorDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { getPendingDisputes, resolveDispute, loading } = useDisputes();
  const [disputes, setDisputes] = useState<any[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [clientAmount, setClientAmount] = useState<string>('');
  const [freelancerAmount, setFreelancerAmount] = useState<string>('');
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [penalizeClient, setPenalizeClient] = useState(false);
  const [slashStake, setSlashStake] = useState(false);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [evidenceDialogOpen, setEvidenceDialogOpen] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<any>(null);
  const [telegramTransfers, setTelegramTransfers] = useState<any[]>([]);
  const [processingTransfer, setProcessingTransfer] = useState<string | null>(null);
  const [autoProcessed, setAutoProcessed] = useState<Record<string, 'pending' | 'success' | 'error'>>({});
  const [transferLogs, setTransferLogs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (authLoading) return;
    checkAdminAccess();
  }, [user, authLoading]);

  useEffect(() => {
    if (hasAdminAccess) {
      fetchDisputes();
      fetchTelegramTransfers();
    }
  }, [hasAdminAccess]);

  const checkAdminAccess = async () => {
    if (authLoading) return;
    if (!user) {
      setCheckingAccess(false);
      navigate('/admin');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setHasAdminAccess(true);
      } else {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges",
          variant: "destructive"
        });
        navigate('/');
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/');
    } finally {
      setCheckingAccess(false);
    }
  };

  const fetchDisputes = async () => {
    const data = await getPendingDisputes();
    setDisputes(data);
  };

  const fetchTelegramTransfers = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          client:profiles!jobs_client_id_fkey(id, display_name, wallet_address),
          freelancer:profiles!jobs_freelancer_id_fkey(id, display_name, wallet_address)
        `)
        .eq('status', 'awaiting_escrow_verification' as any)
        .ilike('title', '%telegram%');

      if (error) throw error;
      setTelegramTransfers(data || []);
    } catch (error) {
      console.error('Error fetching telegram transfers:', error);
    }
  };

  // Auto-trigger Telegram transfers without manual clicks
  useEffect(() => {
    if (telegramTransfers.length === 0) return;
    telegramTransfers.forEach((job: any) => {
      if (!autoProcessed[job.id]) {
        setAutoProcessed((prev) => ({ ...prev, [job.id]: 'pending' }));
        handleCompleteTelegramTransfer(job.id).then((ok) => {
          setAutoProcessed((prev) => ({ ...prev, [job.id]: ok ? 'success' : 'error' }));
        });
      }
    });
  }, [telegramTransfers]);
  const handleCompleteTelegramTransfer = async (jobId: string): Promise<boolean> => {
    setProcessingTransfer(jobId);
    try {
      const job = telegramTransfers.find(t => t.id === jobId);
      
      // Call the automated transfer function - let it handle everything
      const { data, error: transferError } = await supabase.functions.invoke('telegram-auto-transfer', {
        body: {
          jobId: jobId,
          channelUsername: '' // Let the edge function get it from the listing
        }
      });

      if (transferError) {
        throw new Error(`Transfer failed: ${transferError.message}`);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Transfer failed');
      }

      // Notify both parties
      if (job) {
        try {
          // Notify buyer
          await supabase.functions.invoke('send-telegram-notification', {
            body: {
              recipient_id: job.client_id,
              message: `✅ Escrow has completed the transfer for "${job.title}"!\n\nYou now have full ownership of the Telegram account. Funds have been released to the seller.`,
              url: `${window.location.origin}/job-details/${jobId}`,
              button_text: 'View Details'
            }
          });

          // Notify seller
          await supabase.functions.invoke('send-telegram-notification', {
            body: {
              recipient_id: job.freelancer_id,
              message: `✅ Escrow has completed the transfer for "${job.title}"!\n\nFunds have been released to your wallet. Thank you for using our platform!`,
              url: `${window.location.origin}/job-details/${jobId}`,
              button_text: 'View Details'
            }
          });
        } catch (notifError) {
          console.error('Error sending notifications:', notifError);
        }
      }

      toast({
        title: "Transfer Completed",
        description: "Ownership transferred to buyer and funds released to seller"
      });

      setTransferLogs((prev) => ({
        ...prev,
        [jobId]: `Success: Ownership transferred to buyer and funds released. Job ${jobId}`,
      }));

      fetchTelegramTransfers();
      return true;
    } catch (error: any) {
      console.error('Error completing transfer:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to complete transfer",
        variant: "destructive"
      });
      setTransferLogs((prev) => ({
        ...prev,
        [jobId]: `Error: ${error.message || 'Failed to complete transfer'}`,
      }));
      return false;
    } finally {
      setProcessingTransfer(null);
    }
  };

  const handleResolve = async () => {
    if (!selectedDispute) return;

    const success = await resolveDispute(
      selectedDispute.id,
      selectedDispute.job_id,
      parseFloat(clientAmount),
      parseFloat(freelancerAmount),
      resolutionNotes,
      penalizeClient,
      slashStake
    );

    if (success) {
      setSelectedDispute(null);
      setClientAmount('');
      setFreelancerAmount('');
      setResolutionNotes('');
      setPenalizeClient(false);
      setSlashStake(false);
      fetchDisputes();
    }
  };

  if (checkingAccess) {
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
            <p className="text-muted-foreground">Checking access...</p>
          </Card>
        </main>
      </div>
    );
  }

  if (!hasAdminAccess) {
    return null;
  }

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
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full glass-card border border-primary/20">
            <Gavel className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Admin Dashboard</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-3 bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Dispute Resolution
          </h1>
          <p className="text-lg text-gray-300">Review and resolve disputes with evidence-based decisions</p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Admin Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Pending Disputes</p>
                <p className="text-3xl font-bold text-primary">{disputes.length}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Telegram Transfers</p>
                <p className="text-3xl font-bold text-primary">{telegramTransfers.length}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Avg. Response Time</p>
                <p className="text-3xl font-bold">2.5 days</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Resolution Rate</p>
                <p className="text-3xl font-bold">98%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Telegram Transfers Section */}
        {telegramTransfers.length > 0 && (
          <div className="space-y-4 mb-8">
            <h2 className="text-2xl font-semibold">Pending Telegram Transfers</h2>
            <p className="text-muted-foreground text-sm">
              These Telegram accounts have been transferred to @defiescrow9 by sellers. Verify ownership, transfer to buyers, and release funds.
            </p>
            
            {telegramTransfers.map((job: any) => (
              <Card key={job.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        📱 {job.title}
                        <Badge variant="secondary">Awaiting Escrow</Badge>
                      </CardTitle>
                      <CardDescription className="mt-2">
                        Transferred {new Date(job.updated_at).toLocaleDateString()} • ${job.budget_usdc} USDC
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg bg-muted/50">
                        <p className="text-sm font-medium mb-2">Buyer</p>
                        <p className="text-sm font-semibold">{job.client?.display_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {job.client?.wallet_address?.substring(0, 8)}...
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg bg-muted/50">
                        <p className="text-sm font-medium mb-2">Seller</p>
                        <p className="text-sm font-semibold">{job.freelancer?.display_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {job.freelancer?.wallet_address?.substring(0, 8)}...
                        </p>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg bg-primary/5">
                      <h4 className="font-semibold mb-2 text-sm">Escrow Instructions:</h4>
                      <ol className="text-sm space-y-1 text-muted-foreground">
                        <li>1. Verify that @defiescrow9 has full admin access to the Telegram group/channel</li>
                        <li>2. Check authenticity and member count match the listing</li>
                        <li>3. Extract buyer's Telegram username from job description</li>
                        <li>4. Transfer ownership from @defiescrow9 to buyer's Telegram account</li>
                        <li>5. The system auto-transfers ownership to the buyer and releases funds once verified</li>
                      </ol>
                    </div>

                    <div className="p-3 bg-muted/50 rounded text-sm">
                      <p className="font-medium mb-1">Buyer Contact Info:</p>
                      <p className="text-muted-foreground whitespace-pre-wrap">{job.description}</p>
                    </div>

                    {autoProcessed[job.id] === 'pending' && (
                      <Button className="w-full" disabled>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Auto-processing transfer...
                      </Button>
                    )}
                    {autoProcessed[job.id] === 'success' && (
                      <div className="w-full p-3 border rounded text-sm bg-green-500/10 text-green-600">
                        ✅ Transfer completed automatically. Funds released.
                      </div>
                    )}
                    {autoProcessed[job.id] === 'error' && (
                      <Button className="w-full" onClick={() => handleCompleteTelegramTransfer(job.id)}>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Retry Transfer
                      </Button>
                    )}
                    {!autoProcessed[job.id] && (
                      <Button className="w-full" disabled>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Waiting for seller transfer...
                      </Button>
                    )}

                    {transferLogs[job.id] && (
                      <div className="text-xs text-muted-foreground mt-2">
                        {transferLogs[job.id]}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Pending Disputes</h2>
          
          {disputes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Gavel className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No pending disputes</p>
              </CardContent>
            </Card>
          ) : (
            disputes.map((dispute: any) => (
              <Card key={dispute.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        Job Dispute #{dispute.job_id.substring(0, 8)}
                        <Badge>Pending</Badge>
                      </CardTitle>
                      <CardDescription className="mt-2">
                        Raised {new Date(dispute.raised_at).toLocaleDateString()} • Deposit: {dispute.arbitration_deposit_eth} ETH
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg bg-muted/50">
                        <p className="text-sm font-medium mb-2">Raised By</p>
                        <p className="text-sm text-muted-foreground font-mono">
                          {dispute.raised_by.substring(0, 8)}...
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg bg-muted/50">
                        <p className="text-sm font-medium mb-2">Evidence Bundle</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => {
                            setSelectedEvidence(dispute.evidence_bundle);
                            setEvidenceDialogOpen(true);
                          }}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View Evidence
                        </Button>
                      </div>
                    </div>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          className="w-full" 
                          onClick={() => setSelectedDispute(dispute)}
                        >
                          <Gavel className="h-4 w-4 mr-2" />
                          Resolve Dispute
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Resolve Dispute</DialogTitle>
                          <DialogDescription>
                            Make an evidence-based decision on fund distribution
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="clientAmount">Client Amount (ETH)</Label>
                              <Input
                                id="clientAmount"
                                type="number"
                                step="0.01"
                                value={clientAmount}
                                onChange={(e) => setClientAmount(e.target.value)}
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <Label htmlFor="freelancerAmount">Freelancer Amount (ETH)</Label>
                              <Input
                                id="freelancerAmount"
                                type="number"
                                step="0.01"
                                value={freelancerAmount}
                                onChange={(e) => setFreelancerAmount(e.target.value)}
                                placeholder="0.00"
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="notes">Resolution Notes</Label>
                            <Textarea
                              id="notes"
                              value={resolutionNotes}
                              onChange={(e) => setResolutionNotes(e.target.value)}
                              placeholder="Explain your decision based on evidence..."
                              rows={4}
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="penalizeClient"
                                checked={penalizeClient}
                                onCheckedChange={(checked) => setPenalizeClient(checked as boolean)}
                              />
                              <Label htmlFor="penalizeClient" className="cursor-pointer">
                                Penalize Client (forfeit arbitration deposit)
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="slashStake"
                                checked={slashStake}
                                onCheckedChange={(checked) => setSlashStake(checked as boolean)}
                              />
                              <Label htmlFor="slashStake" className="cursor-pointer">
                                Slash Freelancer Stake (fraudulent work)
                              </Label>
                            </div>
                          </div>

                          <Button 
                            onClick={handleResolve} 
                            disabled={loading || !clientAmount || !freelancerAmount || !resolutionNotes}
                            className="w-full"
                          >
                            Submit Resolution
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Evidence Dialog */}
        <Dialog open={evidenceDialogOpen} onOpenChange={setEvidenceDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Evidence Bundle</DialogTitle>
              <DialogDescription>
                Review all submitted evidence for this dispute
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="h-[60vh] pr-4">
              {selectedEvidence ? (
                <div className="space-y-4">
                  {Object.entries(selectedEvidence).map(([key, value]: [string, any]) => (
                    <div key={key} className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2 capitalize">{key.replace(/_/g, ' ')}</h3>
                      {typeof value === 'string' ? (
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{value}</p>
                      ) : Array.isArray(value) ? (
                        <div className="space-y-2">
                          {value.map((item, index) => (
                            <div key={index} className="p-2 bg-muted rounded">
                              {typeof item === 'string' ? (
                                <p className="text-sm">{item}</p>
                              ) : (
                                <pre className="text-xs overflow-auto">{JSON.stringify(item, null, 2)}</pre>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                          {JSON.stringify(value, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No evidence submitted yet</p>
                </div>
              )}
            </ScrollArea>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEvidenceDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
