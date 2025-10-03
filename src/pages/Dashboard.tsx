import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Briefcase, Clock, TrendingUp, Users, MessageSquare, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const Dashboard = () => {
  const [stats, setStats] = useState({
    activeJobs: 0,
    totalEarnings: 0,
    pendingBids: 0,
    completedJobs: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // TODO: Replace with MongoDB edge function call
      // const { data, error } = await supabase.functions.invoke('mongodb-jobs', {
      //   body: { action: 'getStats', userId: user.id }
      // });
      
      // Mock data for now
      setStats({
        activeJobs: 5,
        totalEarnings: 24500,
        pendingBids: 8,
        completedJobs: 23
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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
              <Button size="sm" className="shadow-glow">
                <Briefcase className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </div>
            <div className="grid gap-4">
              {[
                { title: "DeFi Dashboard Development", client: "Alice Johnson", budget: 5.5, deadline: "2 weeks", progress: 65, status: "In Progress" },
                { title: "Smart Contract Audit", client: "Bob Smith", budget: 8.2, deadline: "1 week", progress: 40, status: "In Progress" },
                { title: "NFT Marketplace UI", client: "Carol White", budget: 4.0, deadline: "3 weeks", progress: 85, status: "Review" }
              ].map((job, idx) => (
                <Card key={idx} className="p-6 hover:shadow-glow transition-all duration-300 bg-card/50 backdrop-blur group">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">{job.title}</h3>
                        <Badge variant={job.status === "Review" ? "secondary" : "default"} className="text-xs">
                          {job.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">Client: {job.client}</p>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <DollarSign className="h-4 w-4" />
                          {job.budget} ETH
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {job.deadline}
                        </span>
                      </div>
                      <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{job.progress}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
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
              <Card className="p-4 hover:shadow-glow transition-all cursor-pointer group bg-card/50 backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Messages</p>
                    <p className="text-sm text-muted-foreground">3 unread</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4 hover:shadow-glow transition-all cursor-pointer group bg-card/50 backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                    <AlertCircle className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium">Pending Reviews</p>
                    <p className="text-sm text-muted-foreground">2 waiting</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4 hover:shadow-glow transition-all cursor-pointer group bg-card/50 backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center group-hover:bg-success/20 transition-colors">
                    <Users className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="font-medium">New Bids</p>
                    <p className="text-sm text-muted-foreground">5 received</p>
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
                    { icon: CheckCircle, text: "Milestone completed", time: "2h ago", color: "text-success" },
                    { icon: MessageSquare, text: "New message from Alice", time: "4h ago", color: "text-primary" },
                    { icon: DollarSign, text: "Payment received: 3.2 ETH", time: "1d ago", color: "text-accent" },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 pb-3 border-b last:border-0">
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
