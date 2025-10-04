import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Briefcase, Clock, TrendingUp, Users, MessageSquare, CheckCircle, AlertCircle } from "lucide-react";
import { JobPostDialog } from "@/components/JobPostDialog";
import { useJobs } from "@/hooks/useJobs";
import { useBids } from "@/hooks/useBids";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

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
      
      const active = jobs.filter((j: any) => j.status === 'in_progress' || j.status === 'funded');
      const completed = jobs.filter((j: any) => j.status === 'completed');
      const pending = bids.filter((b: any) => b.status === 'pending');
      
      setActiveJobs(active.slice(0, 3));
      setStats({
        activeJobs: active.length,
        totalEarnings: completed.reduce((sum: number, j: any) => sum + parseFloat(j.budget_eth || 0), 0),
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
                  ${stats.totalEarnings}
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
                          {job.budget_eth} ETH
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {job.duration_weeks ? `${job.duration_weeks} weeks` : 'Flexible'}
                        </span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="hover-scale">
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
                onClick={() => window.location.href = '/chat'}
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
                onClick={() => window.location.href = '/marketplace'}
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
              
              <Card 
                className="p-4 hover:shadow-glow transition-all cursor-pointer group bg-card/50 backdrop-blur"
                onClick={() => window.location.href = '/marketplace'}
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
            
            {/* Recent Notifications */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Recent Activity</h3>
              <Card className="p-4 bg-card/50 backdrop-blur">
                <div className="space-y-3">
                  {[
                    { icon: CheckCircle, text: "Milestone completed", time: "2h ago", color: "text-success", path: "/marketplace" },
                    { icon: MessageSquare, text: "New message", time: "4h ago", color: "text-primary", path: "/chat" },
                    { icon: DollarSign, text: "Payment received", time: "1d ago", color: "text-accent", path: "/escrow" },
                  ].map((item, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-start gap-3 pb-3 border-b last:border-0 cursor-pointer hover:bg-accent/5 -mx-2 px-2 py-1 rounded transition-colors"
                      onClick={() => window.location.href = item.path}
                    >
                      <item.icon className={`h-4 w-4 mt-1 ${item.color}`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.text}</p>
                        <p className="text-xs text-muted-foreground">{item.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
