import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Navbar from "@/components/Navbar";
import {
  MapPin,
  Star,
  Briefcase,
  Award,
  ExternalLink,
  Edit,
} from "lucide-react";

const Profile = () => {
  const portfolioItems = [
    {
      id: 1,
      title: "DeFi Yield Aggregator",
      description: "Built a comprehensive yield farming dashboard with Web3 integration",
      image: "🌾",
      tags: ["React", "Solidity", "DeFi"],
    },
    {
      id: 2,
      title: "NFT Marketplace",
      description: "Developed smart contracts and frontend for NFT minting and trading",
      image: "🎨",
      tags: ["NFT", "IPFS", "Web3"],
    },
    {
      id: 3,
      title: "DAO Governance Platform",
      description: "Created voting mechanisms and proposal system for decentralized governance",
      image: "🏛️",
      tags: ["DAO", "Governance", "Smart Contracts"],
    },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto">
          {/* Profile Header */}
          <Card className="p-8 glass-card shadow-card mb-8">
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex flex-col items-center lg:items-start">
                <Avatar className="w-32 h-32 mb-4 border-4 border-primary shadow-glow">
                  <AvatarFallback className="text-4xl">JD</AvatarFallback>
                </Avatar>
                <Button variant="outline" className="gap-2">
                  <Edit className="w-4 h-4" />
                  Edit Profile
                </Button>
              </div>

              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">Jane Doe</h1>
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <MapPin className="w-4 h-4" />
                      <span>Global • Remote</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 fill-warning text-warning" />
                    <span className="text-2xl font-bold">4.9</span>
                    <span className="text-muted-foreground">(47 reviews)</span>
                  </div>
                </div>

                <p className="text-lg mb-6">
                  Full-stack blockchain developer specializing in DeFi protocols, smart contract development, and Web3 integrations. 
                  5+ years of experience building decentralized applications on Ethereum and Polygon.
                </p>

                <div className="flex flex-wrap gap-2 mb-6">
                  {["React", "Solidity", "Web3.js", "Ethers.js", "Hardhat", "IPFS", "DeFi", "NFTs"].map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>

                <div className="grid sm:grid-cols-3 gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center">
                      <Briefcase className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">47</div>
                      <div className="text-sm text-muted-foreground">Jobs Completed</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg gradient-secondary flex items-center justify-center">
                      <Award className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">98%</div>
                      <div className="text-sm text-muted-foreground">Success Rate</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center">
                      <Star className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">15.2</div>
                      <div className="text-sm text-muted-foreground">ETH Earned</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Portfolio */}
          <div>
            <h2 className="text-2xl font-bold mb-6">Portfolio</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {portfolioItems.map((item) => (
                <Card key={item.id} className="overflow-hidden glass-card shadow-card hover:shadow-glow transition-smooth">
                  <div className="h-48 gradient-hero flex items-center justify-center text-6xl">
                    {item.image}
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                    <p className="text-muted-foreground mb-4">{item.description}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {item.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <Button variant="outline" className="w-full gap-2">
                      View Project
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Reviews Section */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Recent Reviews</h2>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6 glass-card shadow-card">
                  <div className="flex items-start gap-4">
                    <Avatar>
                      <AvatarFallback>CL</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold">Client {i}</span>
                        <span className="text-muted-foreground">•</span>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-warning text-warning" />
                          ))}
                        </div>
                      </div>
                      <p className="text-muted-foreground">
                        Excellent work! Delivered the DeFi dashboard ahead of schedule with clean code and great communication throughout the project.
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
