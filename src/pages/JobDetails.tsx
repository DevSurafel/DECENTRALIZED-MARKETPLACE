import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
import { supabase } from "@/integrations/supabase/client";

const JobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bidAmount, setBidAmount] = useState("");
  const [proposal, setProposal] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Mock job data - Replace with MongoDB edge function call
  const job = {
    id: id,
    title: "DeFi Dashboard Development",
    description: "We're looking for an experienced blockchain developer to build a comprehensive DeFi analytics dashboard. The project involves creating a responsive web application that displays real-time data from multiple DeFi protocols.\n\nKey Requirements:\n- Experience with React and TypeScript\n- Knowledge of Web3 integration\n- Familiarity with DeFi protocols (Uniswap, Aave, Compound)\n- Ability to work with GraphQL APIs\n- Strong UI/UX skills\n\nDeliverables:\n- Fully functional dashboard with real-time data\n- Responsive design for mobile and desktop\n- Documentation and code comments\n- Testing and deployment support",
    budget: 5.5,
    duration: "4-6 weeks",
    skills: ["React", "Web3", "TypeScript", "DeFi", "GraphQL"],
    status: "open",
    posted: "2 days ago",
    client: {
      name: "Alice Johnson",
      rating: 4.9,
      jobsPosted: 12,
      location: "San Francisco, CA"
    },
    bids: 5,
    featured: true
  };

  const handleSubmitBid = async () => {
    if (!bidAmount || !proposal || !estimatedDuration) {
      toast({
        title: "Missing Information",
        description: "Please fill in all bid details",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      // TODO: Call MongoDB edge function to submit bid
      console.log('Submitting bid:', { bidAmount, proposal, estimatedDuration });
      
      toast({
        title: "Bid Submitted!",
        description: "Your proposal has been sent to the client"
      });
      
      // Reset form
      setBidAmount("");
      setProposal("");
      setEstimatedDuration("");
    } catch (error) {
      console.error('Error submitting bid:', error);
      toast({
        title: "Error",
        description: "Failed to submit bid. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

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
            <Card className="p-6 bg-card/50 backdrop-blur">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-3xl font-bold">{job.title}</h1>
                    {job.featured && (
                      <Badge className="bg-accent">Featured</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">Posted {job.posted}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 mb-6 pb-6 border-b">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Budget</p>
                    <p className="font-semibold">{job.budget} ETH</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-semibold">{job.duration}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Bids</p>
                    <p className="font-semibold">{job.bids} submitted</p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-3">Description</h2>
                <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                  {job.description}
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-3">Required Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill, idx) => (
                    <Badge key={idx} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            </Card>

            {/* Bid Form */}
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
                    Estimated Duration
                  </label>
                  <Input
                    placeholder="e.g., 3 weeks"
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
          </div>

          {/* Client Info Sidebar */}
          <div className="space-y-6">
            <Card className="p-6 bg-card/50 backdrop-blur">
              <h3 className="text-lg font-semibold mb-4">About the Client</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-xl font-bold">{job.client.name}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="h-4 w-4 fill-warning text-warning" />
                    <span className="font-semibold">{job.client.rating}</span>
                    <span className="text-muted-foreground text-sm ml-1">
                      ({job.client.jobsPosted} jobs)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{job.client.location}</span>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Payment verified</p>
                  <Badge variant="secondary" className="bg-success/10 text-success">
                    ✓ Verified Client
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
