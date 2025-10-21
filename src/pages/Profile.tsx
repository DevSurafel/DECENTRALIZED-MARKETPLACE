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
import { useMessages } from "@/hooks/useMessages";
import { useJobs } from "@/hooks/useJobs";
import { useSocialMedia, SocialMediaListing } from "@/hooks/useSocialMedia";
import {
  MapPin,
  Star,
  Briefcase,
  Award,
  ExternalLink,
  Edit,
  Loader2,
  Plus,
  Camera,
  Upload,
  MessageSquare,
  DollarSign,
  Clock,
  Users,
  Facebook,
  Send,
  Youtube,
  Music2,
  Twitter,
  Instagram,
  CheckCircle2,
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
  avatar_url: string | null;
  telegram_chat_id: string | null;
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
  const [userJobs, setUserJobs] = useState<any[]>([]);
  const [userListings, setUserListings] = useState<SocialMediaListing[]>([]);
  const isOwnProfile = !profileId || profileId === user?.id;
  const { createConversation } = useMessages();
  const { getJobs } = useJobs();
  const { getListings } = useSocialMedia();
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
  const [uploading, setUploading] = useState(false);

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

      let { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", targetUserId)
        .single();

      // If profile doesn't exist and it's the current user, create it
      if (error && error.code === 'PGRST116' && isOwnProfile && user) {
        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            username: user.email?.split('@')[0] || 'user',
            full_name: user.user_metadata?.display_name || '',
          })
          .select()
          .single();
        
        if (createError) throw createError;
        data = newProfile;
      } else if (error) {
        throw error;
      }

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
      
      // Fetch reviews for this user
      const { data: reviewsData } = await supabase
        .from("reviews")
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_id_fkey(id, display_name, wallet_address, avatar_url)
        `)
        .eq("reviewee_id", targetUserId)
        .order("created_at", { ascending: false })
        .limit(5);
      
      setReviews(reviewsData || []);
      
      // Fetch user's jobs (posted by this user)
      const jobsData = await getJobs();
      const profileJobs = jobsData?.filter((job: any) => job.client_id === targetUserId) || [];
      setUserJobs(profileJobs);
      
      // Fetch user's social media listings
      const listingsData = await getListings();
      const profileListings = listingsData?.filter((listing: any) => listing.seller_id === targetUserId) || [];
      setUserListings(profileListings);
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

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !event.target.files || event.target.files.length === 0) return;
    
    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Math.random()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    setUploading(true);

    try {
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Profile picture updated successfully",
      });
      
      fetchProfile();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Error",
        description: "Failed to upload profile picture",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleConnectBot = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Error', description: 'Please log in first', variant: 'destructive' });
        return;
      }

      // Ensure profile exists before generating bot link
      if (!profile) {
        toast({ title: 'Error', description: 'Profile not found. Please refresh the page.', variant: 'destructive' });
        return;
      }

      // Ensure user has a profile record (create if missing)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user?.id)
        .single();

      if (!existingProfile && user) {
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            username: user.email?.split('@')[0] || 'user',
            full_name: user.user_metadata?.display_name || '',
          });
        
        if (createError) {
          console.error('Error creating profile:', createError);
          toast({ title: 'Error', description: 'Failed to create profile', variant: 'destructive' });
          return;
        }
      }

      const { data, error } = await supabase.functions.invoke('telegram-connect', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (error) {
        console.error('telegram-connect error:', error);
        throw error;
      }
      
      const link = (data as any)?.link;
      if (link) {
        window.open(link, '_blank');
        toast({ title: 'Open Telegram', description: 'Tap Start to link your bot.' });
      } else {
        toast({ title: 'Error', description: 'Could not generate bot link', variant: 'destructive' });
      }
    } catch (e: any) {
      console.error('connect-bot error:', e);
      const errorMsg = e?.message || 'Failed to connect bot';
      toast({ title: 'Error', description: errorMsg, variant: 'destructive' });
    }
  };

  const handleDisconnectBot = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          telegram_chat_id: null
        })
        .eq('id', user.id);

      if (error) {
        console.error('Disconnect error details:', error);
        throw error;
      }

      toast({ 
        title: 'Success', 
        description: 'Telegram bot disconnected successfully' 
      });
      
      fetchProfile();
    } catch (e: any) {
      console.error('disconnect-bot error:', e);
      const errorMsg = e?.message || e?.error_description || 'Failed to disconnect bot';
      toast({ 
        title: 'Error', 
        description: errorMsg, 
        variant: 'destructive' 
      });
    }
  };

  const handleContactUser = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to contact this user",
        variant: "destructive"
      });
      navigate("/auth");
      return;
    }

    if (!profileId) return;

    const conversationId = await createConversation(profileId);
    if (conversationId) {
      navigate(`/chat?conversation=${conversationId}`);
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
  const averageRating = reviews.length > 0
    ? parseFloat(((reviews.reduce((sum, r) => sum + (r.rating || 0), 0)) / reviews.length).toFixed(1))
    : (typeof profile.average_rating === 'number' ? profile.average_rating : 0);

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="pt-24 pb-12 px-3 md:px-4">
        <div className="mx-auto max-w-full md:container md:max-w-7xl">
          {/* Welcome Banner */}
          <Card className="p-6 mb-8 gradient-secondary border-0 shadow-glow">
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
                <div className="relative mb-4">
                  <Avatar className="w-32 h-32 border-4 border-primary shadow-glow">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt={displayName} className="object-cover" />
                    ) : (
                      <AvatarFallback className="text-4xl bg-gradient-primary">
                        {initials}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  {isOwnProfile && (
                    <label 
                      htmlFor="avatar-upload" 
                      className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center cursor-pointer shadow-lg transition-all hover-scale"
                    >
                      {uploading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-primary-foreground" />
                      ) : (
                        <Camera className="w-5 h-5 text-primary-foreground" />
                      )}
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>
                {isOwnProfile && (
                  <div className="mt-2 mb-4 flex flex-col gap-2 w-full">
                    {profile.telegram_chat_id ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleDisconnectBot}
                        className="w-full bg-green-50 border-green-200 text-green-700 hover:bg-red-50 hover:border-red-200 hover:text-red-700 dark:bg-green-950/20 dark:border-green-900 dark:text-green-400 dark:hover:bg-red-950/20 dark:hover:border-red-900 dark:hover:text-red-400"
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Bot Connected
                      </Button>
                    ) : (
                      <Button variant="secondary" onClick={handleConnectBot} className="w-full">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Connect Bot
                      </Button>
                    )}
                  </div>
                )}
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
                          <Label>Hourly Rate (USDC)</Label>
                          <Input 
                            type="number"
                            step="0.01"
                            value={editForm.hourly_rate}
                            onChange={(e) => setEditForm({...editForm, hourly_rate: e.target.value})}
                            placeholder="50"
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
                    <span className="text-2xl font-bold">{averageRating.toFixed(1)}</span>
                    <span className="text-muted-foreground">({reviews.length} reviews)</span>
                  </div>
                </div>

                <p className="text-lg mb-6">
                  {profile.bio || (isOwnProfile ? "No bio available. Click Edit Profile to add one." : "No bio available")}
                </p>

                {!isOwnProfile && (
                  <Button onClick={handleContactUser} className="mb-6 gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Contact
                  </Button>
                )}

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
                      <div className="text-sm text-muted-foreground">USDC Earned</div>
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
              {isOwnProfile && (
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
              )}
            </div>
            {profile.portfolio_items && profile.portfolio_items.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 md:gap-6 max-w-full md:max-w-7xl mx-auto px-0 md:px-4">
                {profile.portfolio_items.map((item: any, index: number) => (
                  <Card key={index} className="overflow-hidden glass-card shadow-card hover:shadow-glow transition-smooth">
                    <div className="h-24 md:h-48 gradient-hero flex items-center justify-center text-3xl md:text-6xl">
                      {item.image || "🎨"}
                    </div>
                    <div className="p-3 md:p-6">
                      <h3 className="text-sm md:text-xl font-bold mb-1 md:mb-2 line-clamp-2">{item.title}</h3>
                      <p className="text-[10px] md:text-sm text-muted-foreground mb-2 md:mb-4 line-clamp-2">{item.description}</p>
                      <div className="flex flex-wrap gap-1 md:gap-2 mb-2 md:mb-4">
                        {item.tags?.slice(0, 2).map((tag: string) => (
                          <Badge key={tag} variant="outline" className="text-[8px] md:text-xs px-1 py-0">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      {item.url && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full gap-1 text-[10px] md:text-sm h-7 md:h-9"
                          onClick={() => window.open(item.url, '_blank')}
                        >
                          View
                          <ExternalLink className="w-2 h-2 md:w-4 md:h-4" />
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 glass-card shadow-card text-center">
                <p className="text-muted-foreground">
                  {isOwnProfile 
                    ? "No portfolio items yet. Add your work to showcase your skills!" 
                    : "No portfolio items yet"}
                </p>
              </Card>
            )}
          </div>

          {/* Posted Jobs Section */}
          {userJobs.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold mb-6">Posted Jobs</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 md:gap-6 max-w-full md:max-w-7xl mx-auto px-0 md:px-4">
                {userJobs.map((job: any) => {
                  const platformIcons: Record<string, any> = {
                    facebook: Facebook,
                    telegram: Send,
                    youtube: Youtube,
                    tiktok: Music2,
                    twitter: Twitter,
                    instagram: Instagram
                  };
                  return (
                    <Card 
                      key={job.id} 
                      className="p-3 md:p-6 glass-card border-primary/10 shadow-card hover:shadow-glow transition-smooth hover:scale-[1.02] cursor-pointer"
                      onClick={() => navigate(`/jobs/${job.id}`)}
                    >
                      <h3 className="text-sm md:text-xl font-bold mb-1 md:mb-2 hover:text-primary transition-smooth line-clamp-2">{job.title}</h3>
                      <p className="text-[10px] md:text-sm text-muted-foreground mb-2 md:mb-4 line-clamp-2">{job.description}</p>
                      
                      <div className="flex flex-wrap gap-1 md:gap-2 mb-2 md:mb-4">
                        {job.skills_required?.slice(0, 2).map((skill: string) => (
                          <Badge key={skill} variant="secondary" className="text-[8px] md:text-xs px-1 py-0">
                            {skill}
                          </Badge>
                        ))}
                        {job.skills_required?.length > 2 && (
                          <Badge variant="outline" className="text-[8px] md:text-xs px-1 py-0">
                            +{job.skills_required.length - 2}
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 pt-2 md:pt-4 border-t border-primary/10">
                        <div className="flex items-center gap-1 md:gap-2">
                          <div className="w-5 h-5 md:w-8 md:h-8 rounded-lg bg-success/10 flex items-center justify-center">
                            <DollarSign className="w-3 h-3 md:w-4 md:h-4 text-success" />
                          </div>
                          <div>
                            <div className="text-[8px] md:text-xs text-muted-foreground">Budget</div>
                            <div className="text-[10px] md:text-sm font-semibold text-success">{job.budget_usdc || (job.budget_eth * 2000).toFixed(2)} USDC</div>
                          </div>
                        </div>
                        <Badge variant={job.status === 'open' ? 'default' : 'secondary'} className="capitalize text-[8px] md:text-xs w-fit px-1 py-0">
                          {job.status}
                        </Badge>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Social Media Listings Section */}
          {userListings.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold mb-6">Social Media Listings</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 md:gap-6 max-w-full md:max-w-7xl mx-auto px-0 md:px-4">
                {userListings.map((listing: SocialMediaListing) => {
                  const platformIcons: Record<string, any> = {
                    facebook: Facebook,
                    telegram: Send,
                    youtube: Youtube,
                    tiktok: Music2,
                    twitter: Twitter,
                    instagram: Instagram
                  };
                  const platformColors: Record<string, string> = {
                    facebook: "bg-blue-500/10 text-blue-500",
                    telegram: "bg-sky-500/10 text-sky-500",
                    youtube: "bg-red-500/10 text-red-500",
                    tiktok: "bg-pink-500/10 text-pink-500",
                    twitter: "bg-blue-400/10 text-blue-400",
                    instagram: "bg-purple-500/10 text-purple-500"
                  };
                  const PlatformIcon = platformIcons[listing.platform];
                  const platformColor = platformColors[listing.platform];
                  const firstScreenshot = listing.screenshot_urls && listing.screenshot_urls.length > 0 
                    ? listing.screenshot_urls[0] 
                    : listing.screenshot_url;
                  
                  return (
                    <Card 
                      key={listing.id} 
                      className="p-3 md:p-6 glass-card border-primary/10 shadow-card hover:shadow-glow transition-smooth hover:scale-[1.02] cursor-pointer"
                      onClick={() => navigate(`/social-media/${listing.id}`)}
                    >
                      <div className="flex items-start justify-between mb-2 md:mb-4">
                        <div className={`w-8 h-8 md:w-12 md:h-12 rounded-xl ${platformColor} flex items-center justify-center`}>
                          <PlatformIcon className="w-4 h-4 md:w-6 md:h-6" />
                        </div>
                        <div className="flex gap-1">
                          {listing.verification_proof && (
                            <Badge variant="secondary" className="gap-1 text-[8px] md:text-xs px-1 py-0">
                              <CheckCircle2 className="w-2 h-2 md:w-3 md:h-3" />
                              Verified
                            </Badge>
                          )}
                          <Badge variant={listing.status === 'available' ? 'default' : 'secondary'} className="capitalize text-[8px] md:text-xs px-1 py-0">
                            {listing.status}
                          </Badge>
                        </div>
                      </div>

                      {firstScreenshot && (
                        <div className="mb-2 md:mb-4 rounded-lg overflow-hidden">
                          <img 
                            src={firstScreenshot} 
                            alt={listing.account_name}
                            className="w-full h-20 md:h-32 object-cover"
                          />
                        </div>
                      )}

                      <h3 className="text-sm md:text-xl font-bold mb-1 md:mb-2 hover:text-primary transition-smooth line-clamp-2">
                        {listing.account_name}
                      </h3>
                      
                      <Badge variant="outline" className="mb-2 md:mb-3 capitalize text-[8px] md:text-xs px-1 py-0">
                        {listing.platform}
                      </Badge>

                      <p className="text-[10px] md:text-sm text-muted-foreground mb-2 md:mb-4 line-clamp-2">
                        {listing.description}
                      </p>

                      <div className="flex items-center justify-between pt-2 md:pt-4 border-t border-primary/10">
                        <div className="flex items-center gap-1 md:gap-2">
                          <div className="w-5 h-5 md:w-8 md:h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Users className="w-3 h-3 md:w-4 md:h-4 text-primary" />
                          </div>
                          <div>
                            <div className="text-[8px] md:text-xs text-muted-foreground">
                              {listing.platform === 'youtube' ? 'Subs' : 'Followers'}
                            </div>
                            <div className="text-[10px] md:text-sm font-semibold">{(listing.followers_count / 1000).toFixed(1)}k</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 md:gap-2">
                          <div className="w-5 h-5 md:w-8 md:h-8 rounded-lg bg-success/10 flex items-center justify-center">
                            <DollarSign className="w-3 h-3 md:w-4 md:h-4 text-success" />
                          </div>
                          <div>
                            <div className="text-[8px] md:text-xs text-muted-foreground">Price</div>
                            <div className="text-[10px] md:text-sm font-semibold text-success">{listing.price_usdc} USDC</div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reviews Section */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Recent Reviews</h2>
            <div className="space-y-4">
              {reviews.length > 0 ? reviews.map((review) => (
                <Card key={review.id} className="p-6 glass-card shadow-card">
                  <div className="flex items-start gap-4">
                    <Avatar 
                      className="cursor-pointer"
                      onClick={() => navigate(`/profile/${review.reviewer.id}`)}
                    >
                      {review.reviewer?.avatar_url ? (
                        <img src={review.reviewer.avatar_url} alt={review.reviewer.display_name || 'User'} />
                      ) : (
                        <AvatarFallback>
                          {review.reviewer?.display_name?.substring(0, 2).toUpperCase() || 'CL'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span 
                          className="font-bold cursor-pointer hover:text-primary transition-smooth"
                          onClick={() => navigate(`/profile/${review.reviewer.id}`)}
                        >
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
