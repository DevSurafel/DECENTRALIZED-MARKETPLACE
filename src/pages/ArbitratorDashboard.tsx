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
import { Gavel, FileText, ExternalLink, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

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

  useEffect(() => {
    if (authLoading) return;
    checkAdminAccess();
  }, [user, authLoading]);

  useEffect(() => {
    if (hasAdminAccess) {
      fetchDisputes();
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
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Card className="p-8 text-center">
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
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Gavel className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Admin - Dispute Resolution</h1>
          </div>
          <p className="text-muted-foreground">Review and resolve disputes with evidence-based decisions</p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Dispute Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Pending Disputes</p>
                <p className="text-3xl font-bold text-primary">{disputes.length}</p>
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
                        <Button variant="outline" size="sm" className="w-full">
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
      </main>
    </div>
  );
}