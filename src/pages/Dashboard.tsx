import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import {
  Briefcase,
  DollarSign,
  TrendingUp,
  MessageSquare,
  Clock,
  CheckCircle,
} from "lucide-react";

const Dashboard = () => {
  // Mock data
  const stats = [
    { label: "Active Jobs", value: "3", icon: Briefcase, color: "text-primary" },
    { label: "Total Earnings", value: "$4,250", icon: DollarSign, color: "text-success" },
    { label: "Completed Jobs", value: "12", icon: CheckCircle, color: "text-secondary" },
    { label: "Pending Bids", value: "5", icon: Clock, color: "text-warning" },
  ];

  const activeJobs = [
    {
      id: 1,
      title: "Build React DApp Interface",
      client: "0x742d...3a9f",
      budget: "0.5 ETH",
      deadline: "7 days",
      status: "in-progress",
    },
    {
      id: 2,
      title: "Smart Contract Audit",
      client: "0x8b1c...4f2e",
      budget: "1.2 ETH",
      deadline: "14 days",
      status: "in-progress",
    },
    {
      id: 3,
      title: "NFT Marketplace Design",
      client: "0x3c5d...7a8b",
      budget: "0.8 ETH",
      deadline: "10 days",
      status: "review",
    },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">
              Track your jobs, earnings, and activity
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {stats.map((stat) => (
              <Card key={stat.label} className="p-6 glass-card shadow-card">
                <div className="flex items-center justify-between mb-2">
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                  <TrendingUp className="w-4 h-4 text-success" />
                </div>
                <div className="text-3xl font-bold mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </Card>
            ))}
          </div>

          {/* Active Jobs */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Active Jobs</h2>
              <Button variant="outline">View All</Button>
            </div>

            <div className="space-y-4">
              {activeJobs.map((job) => (
                <Card key={job.id} className="p-6 glass-card shadow-card hover:shadow-glow transition-smooth">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold">{job.title}</h3>
                        <Badge 
                          variant={job.status === "in-progress" ? "default" : "secondary"}
                        >
                          {job.status === "in-progress" ? "In Progress" : "Under Review"}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span>Client: {job.client}</span>
                        <span>•</span>
                        <span>Budget: {job.budget}</span>
                        <span>•</span>
                        <span>Deadline: {job.deadline}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Chat
                      </Button>
                      <Button size="sm">View Details</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h2 className="text-2xl font-bold mb-6">Recent Activity</h2>
            <Card className="p-6 glass-card shadow-card">
              <div className="space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b border-border">
                  <div className="w-2 h-2 rounded-full bg-success" />
                  <div className="flex-1">
                    <p className="font-medium">Payment received</p>
                    <p className="text-sm text-muted-foreground">0.5 ETH for "Build React DApp Interface"</p>
                  </div>
                  <span className="text-sm text-muted-foreground">2h ago</span>
                </div>
                
                <div className="flex items-center gap-4 pb-4 border-b border-border">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <div className="flex-1">
                    <p className="font-medium">New message</p>
                    <p className="text-sm text-muted-foreground">From client 0x8b1c...4f2e</p>
                  </div>
                  <span className="text-sm text-muted-foreground">5h ago</span>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-secondary" />
                  <div className="flex-1">
                    <p className="font-medium">Job completed</p>
                    <p className="text-sm text-muted-foreground">"NFT Marketplace Design" submitted for review</p>
                  </div>
                  <span className="text-sm text-muted-foreground">1d ago</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
