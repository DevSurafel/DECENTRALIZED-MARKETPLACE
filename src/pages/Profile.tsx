import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import {
  MapPin,
  Star,
  Briefcase,
  Award,
  ExternalLink,
  Edit,
  Loader2,
  Plus,
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
  const { id: profileId } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);
  const [portfolioDialog, setPortfolioDialog] = useState(false);
  const [editProfileDialog, setEditProfileDialog] = useState(false);
  const isOwnProfile = !profileId || profileId === user?.id;
  const [newPortfolio, setNewPortfolio] = useState({
    title: "",
    description: "",
    image: "",
    tags: "",
    url: ""
  });
  const [editForm, setEditForm] = useState({
    display_name: "",
    bio: "",
    location: "",
    skills: "",
    hourly_rate: "",
    telegram_username: ""
  });

  useEffect(() => {
    if (!authLoading && !user && isOwnProfile) {
      navigate("/auth");
      return;
    }

    if (user || profileId) {
      fetchProfile();
    }
  }, [user, authLoading, navigate, profileId]);

  const fetchProfile = async () => {
    try {
      const targetUserId = profileId || user?.id;
      if (!targetUserId) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", targetUserId)
        .single();

      if (error) throw error;
      setProfile(data);
      
      // Initialize edit form only for own profile
      if (isOwnProfile) {
        setEditForm({
          display_name: data.display_name || "",
          bio: data.bio || "",
          location: data.location || "",
          skills: data.skills?.join(", ") || "",
          hourly_rate: data.hourly_rate?.toString() || "",
          telegram_username: data.telegram_username || ""
        });
      }
      
      // Fetch reviews
      const { data: reviewsData } = await supabase
        .from("reviews")
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_id_fkey(display_name, wallet_address)
        `)
        .eq("reviewee_id", targetUserId)
        .order("created_at", { ascending: false })
        .limit(5);
      
      setReviews(reviewsData || []);
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addPortfolioItem = async () => {
    if (!profile || !newPortfolio.title) return;
    
    const portfolioItems = profile.portfolio_items || [];
    const tags = newPortfolio.tags.split(',').map(t => t.trim()).filter(t => t);
    
    const newItem = {
      title: newPortfolio.title,
      description: newPortfolio.description,
      image: newPortfolio.image || "🎨",
      tags,
      url: newPortfolio.url
    };
    
    const { error } = await supabase
      .from("profiles")
      .update({ portfolio_items: [...portfolioItems, newItem] })
      .eq("id", user?.id);
    
    if (error) {
      toast({ title: "Error", description: "Failed to add portfolio item", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Portfolio item added" });
      setProfile({ ...profile, portfolio_items: [...portfolioItems, newItem] });
      setPortfolioDialog(false);
      setNewPortfolio({ title: "", description: "", image: "", tags: "", url: "" });
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    
    const skills = editForm.skills.split(',').map(s => s.trim()).filter(s => s);
    
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: editForm.display_name,
        bio: editForm.bio,
        location: editForm.location,
        skills,
        hourly_rate: editForm.hourly_rate ? parseFloat(editForm.hourly_rate) : null,
        telegram_username: editForm.telegram_username
      })
      .eq("id", user.id);
    
    if (error) {
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Profile updated successfully" });
      fetchProfile();
      setEditProfileDialog(false);
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
                <h1 className="text-3xl font-bold mb-1">
                  {isOwnProfile ? `Welcome back, ${displayName}!` : `${displayName}'s Profile`}
                </h1>
                <p className="text-foreground/80">
                  {isOwnProfile ? "Here's your profile overview" : "View freelancer profile and reviews"}
                </p>
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
                {isOwnProfile && (
                  <Dialog open={editProfileDialog} onOpenChange={setEditProfileDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Edit className="w-4 h-4" />
                        Edit Profile
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Profile</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Display Name</Label>
                          <Input 
                            value={editForm.display_name}
                            onChange={(e) => setEditForm({...editForm, display_name: e.target.value})}
                            placeholder="Your name"
                          />
                        </div>
                        <div>
                          <Label>Bio</Label>
                          <Textarea 
                            value={editForm.bio}
                            onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                            placeholder="Tell us about yourself"
                          />
                        </div>
                        <div>
                          <Label>Location</Label>
                          <Input 
                            value={editForm.location}
                            onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                            placeholder="City, Country"
                          />
                        </div>
                        <div>
                          <Label>Skills (comma-separated)</Label>
                          <Input 
                            value={editForm.skills}
                            onChange={(e) => setEditForm({...editForm, skills: e.target.value})}
                            placeholder="React, Solidity, Web3"
                          />
                        </div>
                        <div>
                          <Label>Hourly Rate (ETH)</Label>
                          <Input 
                            type="number"
                            step="0.01"
                            value={editForm.hourly_rate}
                            onChange={(e) => setEditForm({...editForm, hourly_rate: e.target.value})}
                            placeholder="0.05"
                          />
                        </div>
                        <div>
                          <Label>Telegram Username</Label>
                          <Input 
                            value={editForm.telegram_username}
                            onChange={(e) => setEditForm({...editForm, telegram_username: e.target.value})}
                            placeholder="@username"
                          />
                        </div>
                        <Button onClick={saveProfile} className="w-full">Save Changes</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
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
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Portfolio</h2>
              <Dialog open={portfolioDialog} onOpenChange={setPortfolioDialog}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Portfolio Item
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Portfolio Item</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Title</Label>
                      <Input 
                        value={newPortfolio.title}
                        onChange={(e) => setNewPortfolio({...newPortfolio, title: e.target.value})}
                        placeholder="Project name"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea 
                        value={newPortfolio.description}
                        onChange={(e) => setNewPortfolio({...newPortfolio, description: e.target.value})}
                        placeholder="Brief description"
                      />
                    </div>
                    <div>
                      <Label>Emoji Icon</Label>
                      <Input 
                        value={newPortfolio.image}
                        onChange={(e) => setNewPortfolio({...newPortfolio, image: e.target.value})}
                        placeholder="🎨 (emoji)"
                      />
                    </div>
                    <div>
                      <Label>Tags (comma-separated)</Label>
                      <Input 
                        value={newPortfolio.tags}
                        onChange={(e) => setNewPortfolio({...newPortfolio, tags: e.target.value})}
                        placeholder="React, Web3, DeFi"
                      />
                    </div>
                    <div>
                      <Label>Project URL</Label>
                      <Input 
                        value={newPortfolio.url}
                        onChange={(e) => setNewPortfolio({...newPortfolio, url: e.target.value})}
                        placeholder="https://..."
                      />
                    </div>
                    <Button onClick={addPortfolioItem} className="w-full">Add Item</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
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
                      {item.url && (
                        <Button 
                          variant="outline" 
                          className="w-full gap-2"
                          onClick={() => window.open(item.url, '_blank')}
                        >
                          View Project
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 glass-card shadow-card text-center">
                <p className="text-muted-foreground">No portfolio items yet. Add your work to showcase your skills!</p>
              </Card>
            )}
          </div>

          {/* Reviews Section */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Recent Reviews</h2>
            <div className="space-y-4">
              {reviews.length > 0 ? reviews.map((review) => (
                <Card key={review.id} className="p-6 glass-card shadow-card">
                  <div className="flex items-start gap-4">
                    <Avatar>
                      <AvatarFallback>
                        {review.reviewer?.display_name?.substring(0, 2).toUpperCase() || 'CL'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold">
                          {review.reviewer?.display_name || review.reviewer?.wallet_address?.slice(0, 8) + '...'}
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-4 h-4 ${i < review.rating ? 'fill-warning text-warning' : 'text-muted-foreground'}`} 
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-muted-foreground">{review.comment || "No comment provided"}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(review.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Card>
              )) : (
                <Card className="p-8 glass-card shadow-card text-center">
                  <p className="text-muted-foreground">No reviews yet</p>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
