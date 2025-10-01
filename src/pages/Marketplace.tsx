import { useState } from "react";
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
} from "lucide-react";

const Marketplace = () => {
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
    },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Job Marketplace</h1>
            <p className="text-muted-foreground">
              Browse and bid on blockchain development projects
            </p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search jobs by title, skills, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </Button>
            <Button>Post a Job</Button>
          </div>

          {/* Job Listings */}
          <div className="space-y-6">
            {jobs.map((job) => (
              <Card key={job.id} className="p-6 glass-card shadow-card hover:shadow-glow transition-smooth">
                <div className="mb-4">
                  <div className="flex items-start justify-between mb-2">
                    <h2 className="text-2xl font-bold">{job.title}</h2>
                    <span className="text-sm text-muted-foreground">{job.postedTime}</span>
                  </div>
                  <p className="text-muted-foreground mb-4">{job.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {job.skills.map((skill) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-4 border-t border-border">
                  <div className="flex flex-wrap gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-success" />
                      <span className="font-medium">{job.budget}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <span>{job.duration}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-secondary" />
                      <span>{job.bids} bids</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Client: </span>
                      <span className="font-mono">{job.client}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline">View Details</Button>
                    <Button>Submit Proposal</Button>
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
