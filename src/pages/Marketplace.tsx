import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import { JobPostDialog } from "@/components/JobPostDialog";
import { useJobs } from "@/hooks/useJobs";
import {
  Search,
  Filter,
  Clock,
  DollarSign,
  Users,
  TrendingUp,
  Briefcase,
  Sparkles,
  Star,
  MessageSquare
} from "lucide-react";

const Marketplace = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [jobs, setJobs] = useState<any[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All Jobs");
  const [jobCounts, setJobCounts] = useState({
    all: 0,
    smartContracts: 0,
    frontend: 0,
    design: 0
  });
  const { getJobs, loading } = useJobs();

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    filterJobs();
  }, [searchQuery, selectedCategory, jobs]);

  const loadJobs = async () => {
    const data = await getJobs({ status: 'open' });
    setJobs(data || []);
    
    // Calculate real counts
    const counts = {
      all: data?.length || 0,
      smartContracts: data?.filter((j: any) => 
        j.skills_required?.some((s: string) => s.toLowerCase().includes('solidity') || s.toLowerCase().includes('smart contract'))
      ).length || 0,
      frontend: data?.filter((j: any) => 
        j.skills_required?.some((s: string) => s.toLowerCase().includes('react') || s.toLowerCase().includes('frontend') || s.toLowerCase().includes('vue'))
      ).length || 0,
      design: data?.filter((j: any) => 
        j.skills_required?.some((s: string) => s.toLowerCase().includes('design') || s.toLowerCase().includes('ui') || s.toLowerCase().includes('ux'))
      ).length || 0
    };
    setJobCounts(counts);
  };

  const filterJobs = () => {
    let filtered = jobs;
    
    // Filter by category
    if (selectedCategory !== "All Jobs") {
      if (selectedCategory === "Smart Contracts") {
        filtered = filtered.filter((j: any) => 
          j.skills_required?.some((s: string) => s.toLowerCase().includes('solidity') || s.toLowerCase().includes('smart contract'))
        );
      } else if (selectedCategory === "Frontend") {
        filtered = filtered.filter((j: any) => 
          j.skills_required?.some((s: string) => s.toLowerCase().includes('react') || s.toLowerCase().includes('frontend') || s.toLowerCase().includes('vue'))
        );
      } else if (selectedCategory === "Design") {
        filtered = filtered.filter((j: any) => 
          j.skills_required?.some((s: string) => s.toLowerCase().includes('design') || s.toLowerCase().includes('ui') || s.toLowerCase().includes('ux'))
        );
      }
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((j: any) => 
        j.title?.toLowerCase().includes(query) ||
        j.description?.toLowerCase().includes(query) ||
        j.skills_required?.some((s: string) => s.toLowerCase().includes(query))
      );
    }
    
    setFilteredJobs(filtered);
  };

  const categories = [
    { name: "All Jobs", count: jobCounts.all, icon: Briefcase },
    { name: "Smart Contracts", count: jobCounts.smartContracts, icon: Sparkles },
    { name: "Frontend", count: jobCounts.frontend, icon: TrendingUp },
    { name: "Design", count: jobCounts.design, icon: Star },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-40 right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-40 left-20 w-80 h-80 bg-secondary/5 rounded-full blur-3xl"></div>
      </div>

      <Navbar />
      
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto">
          {/* Header */}
          <div className="mb-10 animate-fade-in">
            <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full glass-card border border-primary/20">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{jobCounts.all} Active Projects</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Job Marketplace
            </h1>
            <p className="text-lg text-muted-foreground">
              Browse and bid on blockchain development projects from verified clients
            </p>
          </div>

          {/* Categories */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            {categories.map((category, index) => {
              const Icon = category.icon;
              const isSelected = selectedCategory === category.name;
              return (
                <Card 
                  key={index}
                  className={`p-4 glass-card shadow-card hover:shadow-glow transition-smooth cursor-pointer group ${
                    isSelected ? 'border-primary/50 bg-primary/5' : 'border-primary/10 hover:border-primary/30'
                  }`}
                  onClick={() => setSelectedCategory(category.name)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center group-hover:scale-110 transition-smooth">
                      <Icon className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{category.name}</div>
                      <div className="text-xs text-muted-foreground">{category.count} jobs</div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mb-10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search jobs by title, skills, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 glass-card border-primary/20 focus:border-primary/40 shadow-card"
              />
            </div>
            <Button variant="outline" className="gap-2 h-12 px-6 border-primary/20 hover:border-primary/40 shadow-card">
              <Filter className="w-4 h-4" />
              Filters
            </Button>
            <JobPostDialog onSuccess={loadJobs} />
          </div>

          {/* Job Listings */}
          <div className="space-y-6">
            {loading ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Loading jobs...</p>
              </Card>
            ) : filteredJobs.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">
                  {searchQuery || selectedCategory !== "All Jobs" 
                    ? "No jobs match your filters" 
                    : "No jobs available. Be the first to post!"}
                </p>
              </Card>
            ) : filteredJobs.map((job, index) => (
              <Card 
                key={job.id} 
                className="relative overflow-hidden p-7 glass-card border-primary/10 shadow-card hover:shadow-glow transition-smooth hover:scale-[1.02] group animate-fade-in"
                style={{ animationDelay: `${0.3 + index * 0.1}s` }}
              >
                
                <div className="mb-5">
                  <div className="flex items-start justify-between mb-3 gap-4">
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold group-hover:text-primary transition-smooth mb-2">{job.title}</h2>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(job.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-5 leading-relaxed">{job.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-5">
                    {job.skills_required?.map((skill: string) => (
                      <Badge key={skill} variant="secondary" className="px-3 py-1 hover:bg-primary/20 transition-smooth">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-5 border-t border-primary/10">
                  <div className="flex flex-wrap gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                        <DollarSign className="w-4 h-4 text-success" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Budget</div>
                        <div className="font-semibold text-success">{job.budget_eth} ETH</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Duration</div>
                        <div className="font-semibold">{job.duration_weeks ? `${job.duration_weeks} weeks` : 'Flexible'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                        <Users className="w-4 h-4 text-secondary" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Proposals</div>
                        <div className="font-semibold">{job.bids?.[0]?.count || 0} bids</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="text-xs text-muted-foreground">Client</div>
                        <div className="font-mono text-sm font-medium">{job.client?.display_name || job.client?.wallet_address?.slice(0, 8) + '...'}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      className="hover:scale-105 transition-smooth border-primary/20 gap-2"
                      onClick={() => navigate('/chat')}
                    >
                      <MessageSquare className="w-4 h-4" />
                      Chat
                    </Button>
                    <Button 
                      variant="outline" 
                      className="hover:scale-105 transition-smooth border-primary/20"
                      onClick={() => navigate(`/jobs/${job.id}`)}
                    >
                      View Details
                    </Button>
                    <Button 
                      className="shadow-glow hover:scale-105 transition-smooth"
                      onClick={() => navigate(`/jobs/${job.id}`)}
                    >
                      Submit Proposal
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Marketplace;
