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

  const platformReviewQuery = await supabase
    .from('platform_reviews')
    .select('id')
    .eq('user_id', currentUser.id)
    .single();

  const hasUserReview = (userReviewQuery.data?.length ?? 0) > 0;
  const hasPlatformReview = platformReviewQuery.data !== null;

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
        j.status === 'assigned' ||
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

      <main className="container mx-auto px-4 py-8 relative z-10">
        {/* Hero Section */}
        <div className="mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full glass-card border border-primary/20">
            <Briefcase className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Your Workspace</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-3 bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-lg text-gray-300">Manage your projects and track your progress</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <Card className="p-4 md:p-6 glass-card shadow-card hover:shadow-glow transition-smooth hover:scale-105 border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Active Jobs</p>
                <h3 className="text-2xl md:text-3xl font-bold mt-1 bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
                  {stats.activeJobs}
                </h3>
                <p className="text-[10px] md:text-xs text-muted-foreground mt-1">+2 this week</p>
              </div>
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="p-4 md:p-6 glass-card shadow-card hover:shadow-glow transition-smooth hover:scale-105 border-accent/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Total Earnings</p>
                <h3 className="text-xl md:text-3xl font-bold mt-1 bg-gradient-to-br from-accent to-primary bg-clip-text text-transparent">
                  {(stats.totalEarnings * 2000).toFixed(2)} USDC
                </h3>
                <p className="text-[10px] md:text-xs text-success mt-1">+15%</p>
              </div>
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-accent/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-accent" />
              </div>
            </div>
          </Card>

          <Card className="p-4 md:p-6 glass-card shadow-card hover:shadow-glow transition-smooth hover:scale-105 border-warning/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Pending Bids</p>
                <h3 className="text-2xl md:text-3xl font-bold mt-1 bg-gradient-to-br from-warning to-accent bg-clip-text text-transparent">
                  {stats.pendingBids}
                </h3>
                <p className="text-[10px] md:text-xs text-muted-foreground mt-1">Awaiting</p>
              </div>
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-warning/10 flex items-center justify-center">
                <Clock className="h-5 w-5 md:h-6 md:w-6 text-warning" />
              </div>
            </div>
          </Card>

          <Card className="p-4 md:p-6 glass-card shadow-card hover:shadow-glow transition-smooth hover:scale-105 border-success/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Completed</p>
                <h3 className="text-2xl md:text-3xl font-bold mt-1 bg-gradient-to-br from-success to-primary bg-clip-text text-transparent">
                  {stats.completedJobs}
                </h3>
                <p className="text-[10px] md:text-xs text-success mt-1">95% rate</p>
              </div>
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-success" />
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
              ) : activeJobs.map((job, idx) => {
                // Check if it's a social media purchase and parse description
                const isSocialMedia = job.title?.toLowerCase().includes('instagram') || 
                                      job.title?.toLowerCase().includes('telegram') || 
                                      job.title?.toLowerCase().includes('facebook') ||
                                      job.title?.toLowerCase().includes('twitter') ||
                                      job.title?.toLowerCase().includes('tiktok');
                
                let displayDescription = job.description;
                if (isSocialMedia && job.status === 'under_review') {
                  try {
                    const credentials = JSON.parse(job.description);
                    displayDescription = `${credentials.platform || 'Social Media'} account: ${credentials.accountName || 'N/A'}`;
                  } catch (e) {
                    displayDescription = job.description.substring(0, 100);
                  }
                } else {
                  displayDescription = job.description.substring(0, 100);
                }

                return (
                  <Card key={idx} className="p-4 md:p-6 hover:shadow-glow transition-all duration-300 bg-card/50 backdrop-blur group">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 md:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="text-base md:text-lg font-semibold group-hover:text-primary transition-colors line-clamp-1">{job.title}</h3>
                          <Badge variant="default" className="text-[10px] md:text-xs whitespace-nowrap">
                            {job.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-xs md:text-sm text-muted-foreground mb-3 line-clamp-2">{displayDescription}...</p>
                        <div className="flex flex-wrap gap-3 md:gap-4 text-xs md:text-sm">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <DollarSign className="h-3 w-3 md:h-4 md:w-4" />
                            <span className="text-xs md:text-sm">{job.budget_usdc || (job.budget_eth * 2000).toFixed(2)} USDC</span>
                          </span>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3 md:h-4 md:w-4" />
                            <span className="text-xs md:text-sm">{job.duration_weeks ? `${job.duration_weeks} weeks` : 'Flexible'}</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          className="hover-scale text-xs md:text-sm h-8 md:h-9 w-full sm:w-auto"
                          onClick={() => window.location.href = `/jobs/${job.id}`}
                        >
                          View Details
                        </Button>
                        {job.status === 'assigned' && job.client_id === user?.id && !job.escrow_address && (
                          <Button
                            size="sm"
                            className="shadow-glow text-xs md:text-sm h-8 md:h-9 w-full sm:w-auto"
                            onClick={() => window.location.href = `/jobs/${job.id}`}
                          >
                            Fund Escrow
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Quick Actions Sidebar */}
          <div>
            <h2 className="text-xl md:text-2xl font-bold mb-4">Quick Actions</h2>
            <div className="space-y-3 md:space-y-4">
              <Card
                className="p-3 md:p-4 hover:shadow-glow transition-all cursor-pointer group bg-card/50 backdrop-blur"
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
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <MessageSquare className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm md:text-base">Messages</p>
                    <p className="text-xs md:text-sm text-muted-foreground">View conversations</p>
                  </div>
                </div>
              </Card>

              <Card
                className="p-3 md:p-4 hover:shadow-glow transition-all cursor-pointer group bg-card/50 backdrop-blur"
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
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                    <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium text-sm md:text-base">Pending Reviews</p>
                    <p className="text-xs md:text-sm text-muted-foreground">Check jobs</p>
                  </div>
                </div>
              </Card>

              {/* Completed jobs for both clients and freelancers */}
              <Card
                className="p-3 md:p-4 hover:shadow-glow transition-all cursor-pointer group bg-card/50 backdrop-blur"
                onClick={handleReviewClick}
              >
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm md:text-base">Leave a Review</p>
                    <p className="text-xs md:text-sm text-muted-foreground">For your latest completed job</p>
                  </div>
                </div>
              </Card>

              <Card
                className="p-3 md:p-4 hover:shadow-glow transition-all cursor-pointer group bg-card/50 backdrop-blur"
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
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-success/10 flex items-center justify-center group-hover:bg-success/20 transition-colors">
                    <Users className="h-4 w-4 md:h-5 md:w-5 text-success" />
                  </div>
                  <div>
                    <p className="font-medium text-sm md:text-base">New Bids</p>
                    <p className="text-xs md:text-sm text-muted-foreground">View proposals</p>
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
