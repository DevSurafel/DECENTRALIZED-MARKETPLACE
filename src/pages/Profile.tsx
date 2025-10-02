import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  Star,
  Briefcase,
  Award,
  ExternalLink,
  Edit,
  Loader2,
} from "lucide-react";

interface Profile {
  id: string;
  display_name: string | null;
  bio: string | null;
  location: string | null;
  skills: string[] | null;
  hourly_rate: number | null;
  completed_jobs: number;
  success_rate: number;
  average_rating: number;
  total_earnings: number;
  portfolio_items: any;
}

// Sample portfolio items for demo
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

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (user) {
      fetchProfile();
    }
  }, [user, authLoading, navigate]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="pt-24 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="pt-24 px-4 text-center">
          <p className="text-muted-foreground">Profile not found</p>
        </div>
      </div>
    );
  }
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

  const displayName = profile.display_name || user?.email?.split('@')[0] || "User";
  const initials = displayName.substring(0, 2).toUpperCase();

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto">
          {/* Welcome Banner */}
          <Card className="p-6 mb-8 gradient-hero border-0 shadow-glow">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-background/20 backdrop-blur-sm flex items-center justify-center">
                <span className="text-2xl">👋</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-1">Welcome back, {displayName}!</h1>
                <p className="text-foreground/80">Here's your profile overview</p>
              </div>
            </div>
          </Card>

          {/* Profile Header */}
          <Card className="p-8 glass-card shadow-card mb-8">
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex flex-col items-center lg:items-start">
                <Avatar className="w-32 h-32 mb-4 border-4 border-primary shadow-glow">
                  <AvatarFallback className="text-4xl bg-gradient-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <Button variant="outline" className="gap-2">
                  <Edit className="w-4 h-4" />
                  Edit Profile
                </Button>
              </div>

              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-3xl font-bold mb-2">{displayName}</h2>
                    {profile.location && (
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <MapPin className="w-4 h-4" />
                        <span>{profile.location}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 fill-warning text-warning" />
                    <span className="text-2xl font-bold">{profile.average_rating.toFixed(1)}</span>
                    <span className="text-muted-foreground">({profile.completed_jobs} reviews)</span>
                  </div>
                </div>

                <p className="text-lg mb-6">
                  {profile.bio || "No bio available. Click Edit Profile to add one."}
                </p>

                <div className="flex flex-wrap gap-2 mb-6">
                  {profile.skills && profile.skills.length > 0 ? (
                    profile.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="shadow-sm">
                        {skill}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline">No skills added yet</Badge>
                  )}
                </div>

                <div className="grid sm:grid-cols-3 gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
                      <Briefcase className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{profile.completed_jobs}</div>
                      <div className="text-sm text-muted-foreground">Jobs Completed</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg gradient-secondary flex items-center justify-center shadow-glow">
                      <Award className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{profile.success_rate.toFixed(0)}%</div>
                      <div className="text-sm text-muted-foreground">Success Rate</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
                      <Star className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{profile.total_earnings.toFixed(2)}</div>
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
            {profile.portfolio_items && profile.portfolio_items.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {profile.portfolio_items.map((item: any, index: number) => (
                  <Card key={index} className="overflow-hidden glass-card shadow-card hover:shadow-glow transition-smooth">
                    <div className="h-48 gradient-hero flex items-center justify-center text-6xl">
                      {item.image || "🎨"}
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                      <p className="text-muted-foreground mb-4">{item.description}</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {item.tags?.map((tag: string) => (
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
            ) : (
              <Card className="p-8 glass-card shadow-card text-center">
                <p className="text-muted-foreground">No portfolio items yet. Add your work to showcase your skills!</p>
                <Button className="mt-4">Add Portfolio Item</Button>
              </Card>
            )}
          </div>

          {/* Mock Portfolio for Demo */}
          {(!profile.portfolio_items || profile.portfolio_items.length === 0) && (
            <div className="mt-8">
              <h3 className="text-xl font-bold mb-4 text-muted-foreground">Sample Portfolio (Add your own)</h3>
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
          )}

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
