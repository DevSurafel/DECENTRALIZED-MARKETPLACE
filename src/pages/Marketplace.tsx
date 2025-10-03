import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import {
  Search,
  Filter,
  Clock,
  DollarSign,
  Users,
  TrendingUp,
  Briefcase,
  Sparkles,
  Star
} from "lucide-react";

const Marketplace = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const jobs = [
    {
      id: 1,
      title: "Build Decentralized Exchange Interface",
      description: "Need a React developer to build a clean DEX UI with wallet integration and swap functionality.",
      client: "0x742d...3a9f",
      budget: "1.5 ETH",
      duration: "2-3 weeks",
      skills: ["React", "Web3.js", "Tailwind"],
      bids: 8,
      postedTime: "2 hours ago",
      featured: true,
      urgent: false,
    },
    {
      id: 2,
      title: "Smart Contract Development for NFT Marketplace",
      description: "Looking for Solidity expert to develop secure smart contracts for NFT minting and trading.",
      client: "0x8b1c...4f2e",
      budget: "2.0 ETH",
      duration: "3-4 weeks",
      skills: ["Solidity", "Hardhat", "OpenZeppelin"],
      bids: 12,
      postedTime: "5 hours ago",
      featured: true,
      urgent: true,
    },
    {
      id: 3,
      title: "UI/UX Design for DeFi Dashboard",
      description: "Design a modern, intuitive dashboard for a DeFi protocol. Must have Web3 design experience.",
      client: "0x3c5d...7a8b",
      budget: "0.8 ETH",
      duration: "1-2 weeks",
      skills: ["Figma", "UI/UX", "Web3 Design"],
      bids: 15,
      postedTime: "1 day ago",
      featured: false,
      urgent: false,
    },
    {
      id: 4,
      title: "Full-Stack DApp Development",
      description: "Build a complete decentralized application with smart contracts, frontend, and IPFS integration.",
      client: "0x9a2f...5c3d",
      budget: "3.5 ETH",
      duration: "4-6 weeks",
      skills: ["React", "Solidity", "Node.js", "IPFS"],
      bids: 6,
      postedTime: "3 hours ago",
      featured: true,
      urgent: false,
    },
  ];

  const categories = [
    { name: "All Jobs", count: 127, icon: Briefcase },
    { name: "Smart Contracts", count: 34, icon: Sparkles },
    { name: "Frontend", count: 56, icon: TrendingUp },
    { name: "Design", count: 23, icon: Star },
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
              <span className="text-sm font-medium">127 Active Projects</span>
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
              return (
                <Card 
                  key={index}
                  className="p-4 glass-card border-primary/10 hover:border-primary/30 shadow-card hover:shadow-glow transition-smooth cursor-pointer group"
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
            <Button className="h-12 px-6 shadow-glow hover:scale-105 transition-smooth">
              Post a Job
            </Button>
          </div>

          {/* Job Listings */}
          <div className="space-y-6">
            {jobs.map((job, index) => (
              <Card 
                key={job.id} 
                className="relative overflow-hidden p-7 glass-card border-primary/10 shadow-card hover:shadow-glow transition-smooth hover:scale-[1.02] group animate-fade-in"
                style={{ animationDelay: `${0.3 + index * 0.1}s` }}
              >
                {job.featured && (
                  <div className="absolute top-0 right-0 px-4 py-1 bg-gradient-to-r from-primary to-secondary text-primary-foreground text-xs font-medium rounded-bl-lg">
                    Featured
                  </div>
                )}
                
                <div className="mb-5">
                  <div className="flex items-start justify-between mb-3 gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h2 className="text-2xl font-bold group-hover:text-primary transition-smooth">{job.title}</h2>
                        {job.urgent && (
                          <Badge variant="destructive" className="text-xs px-2 py-0.5">
                            Urgent
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{job.postedTime}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-5 leading-relaxed">{job.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-5">
                    {job.skills.map((skill) => (
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
                        <div className="font-semibold text-success">{job.budget}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Duration</div>
                        <div className="font-semibold">{job.duration}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                        <Users className="w-4 h-4 text-secondary" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Proposals</div>
                        <div className="font-semibold">{job.bids} bids</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="text-xs text-muted-foreground">Client</div>
                        <div className="font-mono text-sm font-medium">{job.client}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
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
