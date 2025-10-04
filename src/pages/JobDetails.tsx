import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useJobs } from "@/hooks/useJobs";
import { useBids } from "@/hooks/useBids";
import { useRevisions } from "@/hooks/useRevisions";
import { useDisputes } from "@/hooks/useDisputes";
import { useAuth } from "@/hooks/useAuth";
import { JobDetailsPanel } from "@/components/JobDetailsPanel";
import { 
  DollarSign, 
  Clock, 
  MapPin, 
  Briefcase, 
  Star,
  Send,
  ArrowLeft
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const JobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [job, setJob] = useState<any>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [proposal, setProposal] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState("");
  const { getJobById, loading } = useJobs();
  const { createBid, loading: submitting } = useBids();
  const { requestRevision, submitRevision } = useRevisions();
  const { raiseDispute } = useDisputes();

  useEffect(() => {
    if (id) {
      loadJob();
    }
  }, [id]);

  const loadJob = async () => {
    const data = await getJobById(id!);
    setJob(data);
  };

  const handleSubmitBid = async () => {
    if (!bidAmount || !proposal || !estimatedDuration || !id) {
      toast({
        title: "Missing Information",
        description: "Please fill in all bid details",
        variant: "destructive"
      });
      return;
    }

    const result = await createBid({
      job_id: id,
      bid_amount_eth: parseFloat(bidAmount),
      estimated_duration_weeks: parseInt(estimatedDuration),
      proposal_text: proposal
    });

    if (result) {
      setBidAmount("");
      setProposal("");
      setEstimatedDuration("");
    }
  };

  const handleRequestRevision = async (notes: string) => {
    if (!id) return;
    const success = await requestRevision(id, notes);
    if (success) loadJob();
  };

  const handleSubmitRevision = async (ipfsHash: string, gitHash: string) => {
    if (!id || !job) return;
    const success = await submitRevision(
      id,
      (job.current_revision_number || 0) + 1,
      ipfsHash,
      gitHash
    );
    if (success) loadJob();
  };

  const handleRaiseDispute = async () => {
    if (!id || !job) return;
    const depositAmount = ((job.budget_eth || 0) * (job.arbitration_deposit_percentage || 2)) / 100;
    const success = await raiseDispute(id, depositAmount);
    if (success) loadJob();
  };

  const getUserRole = (): 'client' | 'freelancer' | null => {
    if (!user || !job) return null;
    if (job.client_id === user.id) return 'client';
    if (job.freelancer_id === user.id) return 'freelancer';
    return null;
  };

  if (loading || !job) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Loading...</p>
          </Card>
        </main>
      </div>
    );
  }

  // Calculate time ago for posted date
  const getTimeAgo = (dateString: string) => {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  // Get skills array safely
  const skills = job.skills_required || [];
  const durationText = job.duration_weeks ? `${job.duration_weeks} weeks` : 'Flexible';

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Jobs
        </Button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Job Details */}
          <div className="lg:col-span-2 space-y-6">
            {getUserRole() ? (
              <JobDetailsPanel
                job={job}
                onRequestRevision={handleRequestRevision}
                onSubmitRevision={handleSubmitRevision}
                onRaiseDispute={handleRaiseDispute}
                userRole={getUserRole()}
              />
            ) : (
              <>
                <Card className="p-6 bg-card/50 backdrop-blur">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h1 className="text-3xl font-bold">{job.title}</h1>
                        <Badge variant="secondary">{job.status}</Badge>
                      </div>
                      <p className="text-muted-foreground">Posted {getTimeAgo(job.created_at)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 mb-6 pb-6 border-b">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Budget</p>
                        <p className="font-semibold">{job.budget_eth} ETH</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Duration</p>
                        <p className="font-semibold">{durationText}</p>
                      </div>
                    </div>
                    {job.budget_usd && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">USD Equivalent</p>
                          <p className="font-semibold">${job.budget_usd}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-3">Description</h2>
                    <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                      {job.description}
                    </p>
                  </div>

                  {skills.length > 0 && (
                    <div>
                      <h2 className="text-xl font-semibold mb-3">Required Skills</h2>
                      <div className="flex flex-wrap gap-2">
                        {skills.map((skill: string, idx: number) => (
                          <Badge key={idx} variant="secondary">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>

                {/* Bid Form - only show if user is not the client */}
                {user && job.client_id !== user.id && job.status === 'open' && (
                  <Card className="p-6 bg-card/50 backdrop-blur">
                    <h2 className="text-2xl font-bold mb-4">Submit Your Proposal</h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Your Bid Amount (ETH)
                        </label>
                        <Input
                          type="number"
                          placeholder="e.g., 4.5"
                          value={bidAmount}
                          onChange={(e) => setBidAmount(e.target.value)}
                          step="0.1"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Estimated Duration (weeks)
                        </label>
                        <Input
                          type="number"
                          placeholder="e.g., 3"
                          value={estimatedDuration}
                          onChange={(e) => setEstimatedDuration(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Cover Letter / Proposal
                        </label>
                        <Textarea
                          placeholder="Describe your experience and approach to this project..."
                          value={proposal}
                          onChange={(e) => setProposal(e.target.value)}
                          rows={8}
                          className="resize-none"
                        />
                      </div>

                      <Button 
                        onClick={handleSubmitBid}
                        disabled={submitting}
                        className="w-full shadow-glow"
                        size="lg"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {submitting ? "Submitting..." : "Submit Proposal"}
                      </Button>
                    </div>
                  </Card>
                )}
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="p-6 bg-card/50 backdrop-blur">
              <h3 className="text-lg font-semibold mb-4">Job Information</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant="secondary" className="mt-1">
                    {job.status}
                  </Badge>
                </div>

                {job.deadline && (
                  <div>
                    <p className="text-sm text-muted-foreground">Deadline</p>
                    <p className="font-semibold">{new Date(job.deadline).toLocaleDateString()}</p>
                  </div>
                )}

                {job.escrow_address && (
                  <div>
                    <p className="text-sm text-muted-foreground">Escrow Contract</p>
                    <p className="font-mono text-xs break-all">{job.escrow_address.substring(0, 20)}...</p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Posted by verified client</p>
                  <Badge variant="secondary" className="bg-success/10 text-success">
                    ✓ Verified
                  </Badge>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card/50 backdrop-blur">
              <h3 className="text-lg font-semibold mb-3">Tips for Success</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Provide a detailed proposal explaining your approach</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Set a competitive bid based on your experience</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Include relevant portfolio samples</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Be realistic with your timeline estimate</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default JobDetails;