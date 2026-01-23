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
import { supabase } from "@/integrations/supabase/anyClient";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Search,
  Clock,
  DollarSign,
  Users,
  TrendingUp,
  Briefcase,
  Sparkles,
  Star,
  MessageSquare,
  Edit,
  Trash2,
  MapPin,
  Zap,
  FolderOpen,
  Globe
} from "lucide-react";

const Marketplace = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { createConversation } = useMessages();
  const [searchQuery, setSearchQuery] = useState("");
  const [jobs, setJobs] = useState<any[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All Jobs");
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
    setCurrentPage(1);
    let filtered = jobs;
    
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

  const getExperienceLevelLabel = (level: string) => {
    switch (level) {
      case 'entry': return 'Entry Level';
      case 'intermediate': return 'Intermediate';
      case 'expert': return 'Expert';
      default: return 'Intermediate';
    }
  };

  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case 'fixed': return 'Fixed Price';
      case 'hourly': return 'Hourly';
      case 'milestone': return 'Milestone';
      default: return 'Fixed Price';
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
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">{jobCounts.all} Active Projects</span>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 text-foreground">
            Job Marketplace
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl">
            Browse and bid on blockchain development projects from verified clients
          </p>
        </div>

        {/* Categories */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
          {categories.map((category, index) => {
            const Icon = category.icon;
            const isSelected = selectedCategory === category.name;
            const isLinkCategory = 'isLink' in category && category.isLink;
            
            return (
              <Card 
                key={index}
                className={`p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
                  isSelected 
                    ? 'bg-primary/10 border-primary/30 shadow-sm' 
                    : 'bg-card border-border hover:border-primary/20'
                }`}
                onClick={() => {
                  if (isLinkCategory && 'link' in category) {
                    navigate(category.link);
                  } else {
                    setSelectedCategory(category.name);
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-foreground">{category.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {isLinkCategory ? 'View' : `${category.count} jobs`}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Search and Actions */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search jobs by title, skills, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 bg-card border-border focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
          </div>
          <JobPostDialog onSuccess={loadJobs} />
        </div>

        {/* Job Listings */}
        <div className="space-y-4">
          {loading ? (
            <Card className="p-12 text-center bg-card border-border">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground">Loading jobs...</p>
              </div>
            </Card>
          ) : filteredJobs.length === 0 ? (
            <Card className="p-12 text-center bg-card border-border">
              <div className="flex flex-col items-center gap-3">
                <Briefcase className="w-12 h-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  {searchQuery || selectedCategory !== "All Jobs" 
                    ? "No jobs match your filters" 
                    : "No jobs available. Be the first to post!"}
                </p>
              </div>
            </Card>
          ) : filteredJobs.slice((currentPage - 1) * jobsPerPage, currentPage * jobsPerPage).map((job, index) => (
            <Card 
              key={job.id} 
              className="p-5 md:p-6 bg-card border-border hover:border-primary/30 hover:shadow-lg transition-all duration-200"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4 gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg md:text-xl font-bold text-foreground mb-2 line-clamp-2 hover:text-primary transition-colors cursor-pointer" onClick={() => navigate(`/jobs/${job.id}`)}>
                    {job.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(job.created_at).toLocaleDateString()}</span>
                    </div>
                    {job.category && (
                      <div className="flex items-center gap-1.5">
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>{job.category}</span>
                      </div>
                    )}
                    {job.experience_level && (
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5" />
                        <span>{getExperienceLevelLabel(job.experience_level)}</span>
                      </div>
                    )}
                    {job.location_type && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="capitalize">{job.location_type}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm md:text-base text-muted-foreground mb-4 line-clamp-2">{job.description}</p>
              
              {/* Skills */}
              <div className="flex flex-wrap gap-2 mb-5">
                {job.skills_required?.slice(0, 5).map((skill: string) => (
                  <Badge 
                    key={skill} 
                    variant="secondary" 
                    className="px-3 py-1 text-xs font-medium bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    {skill}
                  </Badge>
                ))}
                {job.skills_required?.length > 5 && (
                  <Badge variant="outline" className="px-3 py-1 text-xs font-medium border-border text-muted-foreground">
                    +{job.skills_required.length - 5} more
                  </Badge>
                )}
              </div>

              {/* Footer */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-border">
                {/* Stats */}
                <div className="flex flex-wrap gap-4 sm:gap-6 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-success" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Budget</div>
                      <div className="font-semibold text-sm text-success">{job.budget_usdc || (job.budget_eth * 2000).toFixed(2)} USDC</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-info/10 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-info" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Duration</div>
                      <div className="font-semibold text-sm">{job.duration_weeks ? `${job.duration_weeks} weeks` : 'Flexible'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-secondary/10 flex items-center justify-center">
                      <Users className="w-4 h-4 text-secondary" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Proposals</div>
                      <div className="font-semibold text-sm">{job.bids?.[0]?.count || 0} bids</div>
                    </div>
                  </div>
                  {job.payment_type && (
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center">
                        <Globe className="w-4 h-4 text-warning" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Payment</div>
                        <div className="font-semibold text-sm">{getPaymentTypeLabel(job.payment_type)}</div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="text-xs text-muted-foreground">Client</div>
                      <div className="font-medium text-sm truncate max-w-[120px]">{job.client?.display_name || job.client?.wallet_address?.slice(0, 8) + '...'}</div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 sm:flex-shrink-0">
                  {user?.id === job.client_id && (
                    <>
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="h-10 w-10 border-border hover:bg-muted"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingJob(job);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="h-10 w-10 border-destructive/30 text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingJobId(job.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-10 px-4 border-border hover:bg-muted gap-2"
                    onClick={() => handleChatWithClient(job.client_id, job.id)}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Chat
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-10 px-4 border-border hover:bg-muted"
                    onClick={() => navigate(`/jobs/${job.id}`)}
                  >
                    View Details
                  </Button>
                  {user?.id !== job.client_id && (
                    <Button 
                      size="sm"
                      className="h-10 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
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
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:bg-muted'}
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
                  className={currentPage === Math.ceil(filteredJobs.length / jobsPerPage) ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:bg-muted'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </main>

      {editingJob && (
        <EditJobDialog
          job={editingJob}
          open={!!editingJob}
          onOpenChange={(open) => !open && setEditingJob(null)}
          onSuccess={loadJobs}
        />
      )}

      <AlertDialog open={!!deletingJobId} onOpenChange={() => setDeletingJobId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Job</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this job? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border hover:bg-muted">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deletingJobId && handleDeleteJob(deletingJobId)} 
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Marketplace;
