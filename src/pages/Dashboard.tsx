import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Briefcase, Clock, TrendingUp, Users, MessageSquare, CheckCircle, AlertCircle } from "lucide-react";
import { JobPostDialog } from "@/components/JobPostDialog";
import { RecentActivity } from "@/components/RecentActivity";
import { useJobs } from "@/hooks/useJobs";
import { useBids } from "@/hooks/useBids";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const handleReviewClick = async () => {
  const authResponse = await supabase.auth.getUser();
  const currentUser = authResponse.data.user;
  if (!currentUser) return;
  
  const jobsQuery = await supabase
    .from('jobs')
    .select('id, client_id, freelancer_id')
    .eq('status', 'completed')
    .or(`freelancer_id.eq.${currentUser.id},client_id.eq.${currentUser.id}`)
    .order('updated_at', { ascending: false })
    .limit(1);
  
  const jobs = jobsQuery.data || [];
  
  if (jobs.length === 0) {
    toast({
      title: "No completed jobs",
      description: "You don't have any completed jobs yet"
    });
    return;
  }
  
  const job = jobs[0];
  const isClient = job.client_id === currentUser.id;
  
  // Check reviews separately
  const userReviewQuery = await supabase.from('reviews').select('id').match({
    job_id: job.id,
    reviewer_id: currentUser.id,
    review_type: 'user'
  });
  
  const platformReviewQuery = await supabase.from('reviews').select('id').match({
    job_id: job.id,
    reviewer_id: currentUser.id,
    review_type: 'platform'
  });
  
  const hasUserReview = (userReviewQuery.data?.length ?? 0) > 0;
  const hasPlatformReview = (platformReviewQuery.data?.length ?? 0) > 0;
  
  if (hasUserReview && hasPlatformReview) {
    toast({
      title: isClient ? "Project Completed" : "Payment Received",
      description: "You've already left reviews for this job. Thank you!"
    });
  } else {
    window.location.href = `/jobs/${job.id}`;
  }
};

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    activeJobs: 0,
    totalEarnings: 0,
    pendingBids: 0,
    completedJobs: 0
  });
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const { getUserJobs } = useJobs();
  const { getUserBids } = useBids();

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const jobs = await getUserJobs();
      const bids = await getUserBids();
      
      const active = jobs.filter((j: any) => 
        j.status === 'in_progress' || 
        j.status === 'under_review' || 
        j.status === 'revision_requested'
      );
      const completed = jobs.filter((j: any) => j.status === 'completed');
      const pending = bids.filter((b: any) => b.status === 'pending');
      
      // Fetch user's total earnings from profile
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      let totalEarnings = 0;
      
      if (currentUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('total_earnings')
          .eq('id', currentUser.id)
          .single();
        
        totalEarnings = profile?.total_earnings || 0;
      }
      
      setActiveJobs(active.slice(0, 3));
      setStats({
        activeJobs: active.length,
        totalEarnings: totalEarnings,
        pendingBids: pending.length,
        completedJobs: completed.length
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground">Manage your projects and track your progress</p>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <Card className="p-6 hover:shadow-glow transition-all duration-300 border-primary/20 bg-card/50 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Jobs</p>
                <h3 className="text-3xl font-bold mt-1 bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
                  {stats.activeJobs}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">+2 this week</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
            </div>
          </Card>
          
          <Card className="p-6 hover:shadow-glow transition-all duration-300 border-accent/20 bg-card/50 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Earnings</p>
                <h3 className="text-3xl font-bold mt-1 bg-gradient-to-br from-accent to-primary bg-clip-text text-transparent">
                  {(stats.totalEarnings * 2000).toFixed(2)} USDC
                </h3>
                <p className="text-xs text-success mt-1">+15% from last month</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-accent" />
              </div>
            </div>
          </Card>
          
          <Card className="p-6 hover:shadow-glow transition-all duration-300 border-warning/20 bg-card/50 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Bids</p>
                <h3 className="text-3xl font-bold mt-1 bg-gradient-to-br from-warning to-accent bg-clip-text text-transparent">
                  {stats.pendingBids}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">Awaiting response</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-warning" />
              </div>
            </div>
          </Card>
          
          <Card className="p-6 hover:shadow-glow transition-all duration-300 border-success/20 bg-card/50 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <h3 className="text-3xl font-bold mt-1 bg-gradient-to-br from-success to-primary bg-clip-text text-transparent">
                  {stats.completedJobs}
                </h3>
                <p className="text-xs text-success mt-1">95% success rate</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
            </div>
          </Card>
        </div>

        {/* Active Jobs & Quick Actions */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Active Projects</h2>
              <JobPostDialog 
                trigger={
                  <Button size="sm" className="shadow-glow">
                    <Briefcase className="h-4 w-4 mr-2" />
                    New Project
                  </Button>
                }
                onSuccess={fetchDashboardData}
              />
            </div>
            <div className="grid gap-4">
              {activeJobs.length === 0 ? (
                <Card className="p-6 text-center">
                  <p className="text-muted-foreground">No active projects. Start by posting a job!</p>
                </Card>
              ) : activeJobs.map((job, idx) => (
                <Card key={idx} className="p-6 hover:shadow-glow transition-all duration-300 bg-card/50 backdrop-blur group">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">{job.title}</h3>
                        <Badge variant="default" className="text-xs">
                          {job.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{job.description.substring(0, 100)}...</p>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <DollarSign className="h-4 w-4" />
                          {job.budget_usdc || (job.budget_eth * 2000).toFixed(2)} USDC
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {job.duration_weeks ? `${job.duration_weeks} weeks` : 'Flexible'}
                        </span>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="hover-scale"
                      onClick={() => window.location.href = `/jobs/${job.id}`}
                    >
                      View Details
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
          
          {/* Quick Actions Sidebar */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
            <div className="space-y-4">
              <Card 
                className="p-4 hover:shadow-glow transition-all cursor-pointer group bg-card/50 backdrop-blur"
                onClick={async () => {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) return;
                  
                  const { data: conversations } = await supabase
                    .from('conversations')
                    .select('id')
                    .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
                    .order('last_message_at', { ascending: false })
                    .limit(1);
                  
                  if (conversations?.[0]) {
                    window.location.href = `/chat?conversation=${conversations[0].id}`;
                  } else {
                    window.location.href = '/chat';
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Messages</p>
                    <p className="text-sm text-muted-foreground">View conversations</p>
                  </div>
                </div>
              </Card>
              
              <Card 
                className="p-4 hover:shadow-glow transition-all cursor-pointer group bg-card/50 backdrop-blur"
                onClick={async () => {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) return;
                  
                  const { data: reviewJobs } = await supabase
                    .from('jobs')
                    .select('id')
                    .eq('client_id', user.id)
                    .eq('status', 'under_review')
                    .order('updated_at', { ascending: false })
                    .limit(1);
                  
                  if (reviewJobs?.[0]) {
                    window.location.href = `/jobs/${reviewJobs[0].id}`;
                  } else {
                    toast({
                      title: "No pending reviews",
                      description: "You don't have any jobs awaiting review"
                    });
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                    <AlertCircle className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium">Pending Reviews</p>
                    <p className="text-sm text-muted-foreground">Check jobs</p>
                  </div>
                </div>
              </Card>

              {/* Completed jobs for both clients and freelancers */}
              <Card 
                className="p-4 hover:shadow-glow transition-all cursor-pointer group bg-card/50 backdrop-blur"
                onClick={handleReviewClick}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Leave a Review</p>
                    <p className="text-sm text-muted-foreground">For your latest completed job</p>
                  </div>
                </div>
              </Card>
              
              <Card 
                className="p-4 hover:shadow-glow transition-all cursor-pointer group bg-card/50 backdrop-blur"
                onClick={async () => {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) return;
                  
                  const { data: jobs } = await supabase
                    .from('jobs')
                    .select('id')
                    .eq('client_id', user.id)
                    .eq('status', 'open')
                    .order('created_at', { ascending: false });
                  
                  if (jobs?.[0]) {
                    window.location.href = `/jobs/${jobs[0].id}`;
                  } else {
                    toast({
                      title: "No open jobs",
                      description: "You don't have any jobs with pending bids"
                    });
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center group-hover:bg-success/20 transition-colors">
                    <Users className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="font-medium">New Bids</p>
                    <p className="text-sm text-muted-foreground">View proposals</p>
                  </div>
                </div>
              </Card>
            </div>
            
            {/* Recent Activity */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Recent Activity</h3>
              <Card className="p-4 bg-card/50 backdrop-blur">
                <RecentActivity userId={user?.id} />
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
