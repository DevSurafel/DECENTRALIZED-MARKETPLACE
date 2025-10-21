import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import Navbar from "@/components/Navbar";
import { JobPostDialog } from "@/components/JobPostDialog";
import { EditJobDialog } from "@/components/EditJobDialog";
import { useJobs } from "@/hooks/useJobs";
import { useAuth } from "@/hooks/useAuth";
import { useMessages } from "@/hooks/useMessages";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
  MessageSquare,
  Edit,
  Trash2
} from "lucide-react";

const Marketplace = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { createConversation } = useMessages();
  const [searchQuery, setSearchQuery] = useState("");
  const [jobs, setJobs] = useState<any[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All Jobs");
  const [showJobDialog, setShowJobDialog] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const [jobCounts, setJobCounts] = useState({
    all: 0,
    smartContracts: 0,
    frontend: 0,
    design: 0
  });
  const [currentPage, setCurrentPage] = useState(1);
  const jobsPerPage = 10;
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
    setCurrentPage(1); // Reset to first page on filter change
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

  const handlePostJob = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setShowJobDialog(true);
  };

  const handleChatWithClient = async (clientId: string, jobId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    try {
      const conversationId = await createConversation(clientId, jobId);
      if (conversationId) {
        navigate(`/chat?conversation=${conversationId}`);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Error",
        description: "Failed to start conversation",
        variant: "destructive"
      });
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Job deleted successfully"
      });
      
      loadJobs();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setDeletingJobId(null);
    }
  };

  const categories = [
    { name: "All Jobs", count: jobCounts.all, icon: Briefcase },
    { name: "Smart Contracts", count: jobCounts.smartContracts, icon: Sparkles },
    { name: "Frontend", count: jobCounts.frontend, icon: TrendingUp },
    { name: "Design", count: jobCounts.design, icon: Star },
    { name: "Buy/Sell Social Media", count: 0, icon: Users, isLink: true, link: "/social-media" },
  ];

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
      
      <div className="pt-24 pb-12 px-3 md:px-4">
        <div className="max-w-full md:container mx-auto md:max-w-7xl">
          {/* Header */}
          <div className="mb-10 animate-fade-in">
            <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full glass-card border border-primary/20">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{jobCounts.all} Active Projects</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Job Marketplace
            </h1>
            <p className="text-base md:text-lg text-muted-foreground">
              Browse and bid on blockchain development projects from verified clients
            </p>
          </div>

          {/* Categories */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5 md:gap-4 mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            {categories.map((category, index) => {
              const Icon = category.icon;
              const isSelected = selectedCategory === category.name;
              const isLinkCategory = 'isLink' in category && category.isLink;
              
              return (
                <Card 
                  key={index}
                  className={`p-3 md:p-4 glass-card shadow-card hover:shadow-glow transition-smooth cursor-pointer group ${
                    isSelected ? 'border-primary/50 bg-primary/5' : 'border-primary/10 hover:border-primary/30'
                  }`}
                  onClick={() => {
                    if (isLinkCategory && 'link' in category) {
                      navigate(category.link);
                    } else {
                      setSelectedCategory(category.name);
                    }
                  }}
                >
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg gradient-primary flex items-center justify-center group-hover:scale-110 transition-smooth">
                      <Icon className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <div className="font-semibold text-xs md:text-sm line-clamp-1">{category.name}</div>
                      <div className="text-[10px] md:text-xs text-muted-foreground">
                        {isLinkCategory ? 'View' : `${category.count} jobs`}
                      </div>
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
            <Button variant="outline" className="gap-2 h-12 px-6 border-primary/20 hover:border-primary/40 shadow-card hidden md:flex">
              <Filter className="w-4 h-4" />
              Filters
            </Button>
            <JobPostDialog onSuccess={loadJobs} />
          </div>

          {/* Job Listings */}
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4 md:gap-6">
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
            ) : filteredJobs.slice((currentPage - 1) * jobsPerPage, currentPage * jobsPerPage).map((job, index) => (
              <Card 
                key={job.id} 
                className="relative overflow-hidden p-4 md:p-7 glass-card border-primary/10 shadow-card hover:shadow-glow transition-smooth hover:scale-[1.01] md:hover:scale-[1.02] group animate-fade-in"
                style={{ animationDelay: `${0.3 + index * 0.1}s` }}
              >
                
                <div className="mb-4 md:mb-5">
                  <div className="flex items-start justify-between mb-2 md:mb-3 gap-2 md:gap-4">
                    <div className="flex-1">
                      <h2 className="text-lg md:text-2xl font-bold group-hover:text-primary transition-smooth mb-1 md:mb-2 line-clamp-2">{job.title}</h2>
                      <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(job.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs md:text-base text-muted-foreground mb-3 md:mb-5 leading-relaxed line-clamp-3 md:line-clamp-none">{job.description}</p>
                  
                  <div className="flex flex-wrap gap-1 md:gap-2 mb-3 md:mb-5">
                    {job.skills_required?.slice(0, 3).map((skill: string) => (
                      <Badge key={skill} variant="secondary" className="px-2 py-0.5 md:px-3 md:py-1 hover:bg-primary/20 transition-smooth text-[10px] md:text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {job.skills_required?.length > 3 && (
                      <Badge variant="outline" className="px-2 py-0.5 md:px-3 md:py-1 text-[10px] md:text-xs">
                        +{job.skills_required.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-4 md:gap-6 pt-3 md:pt-5 border-t border-primary/10">
                  <div className="grid grid-cols-2 md:flex md:flex-wrap gap-3 md:gap-6 text-xs md:text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-success/10 flex items-center justify-center">
                        <DollarSign className="w-3 h-3 md:w-4 md:h-4 text-success" />
                      </div>
                      <div>
                        <div className="text-[10px] md:text-xs text-muted-foreground">Budget</div>
                        <div className="font-semibold text-success text-xs md:text-sm">{job.budget_usdc || (job.budget_eth * 2000).toFixed(2)} USDC</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Clock className="w-3 h-3 md:w-4 md:h-4 text-primary" />
                      </div>
                      <div>
                        <div className="text-[10px] md:text-xs text-muted-foreground">Duration</div>
                        <div className="font-semibold text-xs md:text-sm">{job.duration_weeks ? `${job.duration_weeks} weeks` : 'Flexible'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                        <Users className="w-3 h-3 md:w-4 md:h-4 text-secondary" />
                      </div>
                      <div>
                        <div className="text-[10px] md:text-xs text-muted-foreground">Proposals</div>
                        <div className="font-semibold text-xs md:text-sm">{job.bids?.[0]?.count || 0} bids</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="text-[10px] md:text-xs text-muted-foreground">Client</div>
                        <div className="font-mono text-[10px] md:text-sm font-medium truncate max-w-[100px] md:max-w-none">{job.client?.display_name || job.client?.wallet_address?.slice(0, 8) + '...'}</div>
                      </div>
                    </div>
                  </div>
                  
                   <div className="flex flex-wrap gap-2 md:gap-3">
                    {user?.id === job.client_id && (
                      <>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="h-8 w-8 md:h-10 md:w-10 hover:scale-105 transition-smooth border-primary/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingJob(job);
                          }}
                        >
                          <Edit className="w-3 h-3 md:w-4 md:h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="h-8 w-8 md:h-10 md:w-10 hover:scale-105 transition-smooth border-destructive/20 hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingJobId(job.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3 md:w-4 md:h-4 text-destructive" />
                        </Button>
                      </>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1 md:flex-initial hover:scale-105 transition-smooth border-primary/20 gap-1 md:gap-2 h-8 md:h-9 text-xs md:text-sm"
                      onClick={() => handleChatWithClient(job.client_id, job.id)}
                    >
                      <MessageSquare className="w-3 h-3 md:w-4 md:h-4" />
                      Chat
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1 md:flex-initial hover:scale-105 transition-smooth border-primary/20 h-8 md:h-9 text-xs md:text-sm hidden md:inline-flex"
                      onClick={() => navigate(`/jobs/${job.id}`)}
                    >
                      View Details
                    </Button>
                    {user?.id !== job.client_id && (
                      <Button 
                        size="sm"
                        className="flex-1 md:flex-initial shadow-glow hover:scale-105 transition-smooth h-8 md:h-9 text-xs md:text-sm"
                        onClick={() => navigate(`/jobs/${job.id}`)}
                      >
                        Submit Proposal
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {filteredJobs.length > jobsPerPage && (
            <Pagination className="mt-8">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                {Array.from({ length: Math.ceil(filteredJobs.length / jobsPerPage) }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => setCurrentPage(page)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredJobs.length / jobsPerPage), p + 1))}
                    className={currentPage === Math.ceil(filteredJobs.length / jobsPerPage) ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </div>

      {editingJob && (
        <EditJobDialog
          job={editingJob}
          open={!!editingJob}
          onOpenChange={(open) => !open && setEditingJob(null)}
          onSuccess={loadJobs}
        />
      )}

      <AlertDialog open={!!deletingJobId} onOpenChange={() => setDeletingJobId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this job? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingJobId && handleDeleteJob(deletingJobId)} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Marketplace;
