import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import Navbar from "@/components/Navbar";
import { SocialMediaListingDialog } from "@/components/SocialMediaListingDialog";
import { EditSocialMediaListingDialog } from "@/components/EditSocialMediaListingDialog";
import { useSocialMedia, SocialMediaPlatform, SocialMediaListing } from "@/hooks/useSocialMedia";
import { useAuth } from "@/hooks/useAuth";
import { useMessages } from "@/hooks/useMessages";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  Users,
  DollarSign,
  TrendingUp,
  Facebook,
  Send,
  Youtube,
  Music2,
  Twitter,
  Instagram,
  CheckCircle2,
  Shield,
  MessageSquare,
  Heart,
  ShoppingCart,
  Edit,
  Trash2
} from "lucide-react";

const platformIcons: Record<SocialMediaPlatform, any> = {
  facebook: Facebook,
  telegram: Send,
  youtube: Youtube,
  tiktok: Music2,
  twitter: Twitter,
  instagram: Instagram
};

const platformColors: Record<SocialMediaPlatform, string> = {
  facebook: "bg-blue-500/10 text-blue-500",
  telegram: "bg-sky-500/10 text-sky-500",
  youtube: "bg-red-500/10 text-red-500",
  tiktok: "bg-pink-500/10 text-pink-500",
  twitter: "bg-blue-400/10 text-blue-400",
  instagram: "bg-purple-500/10 text-purple-500"
};

const SocialMediaMarketplace = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { createConversation } = useMessages();
  const [searchQuery, setSearchQuery] = useState("");
  const [listings, setListings] = useState<SocialMediaListing[]>([]);
  const [filteredListings, setFilteredListings] = useState<SocialMediaListing[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("All Platforms");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<SocialMediaListing | null>(null);
  const [editingListing, setEditingListing] = useState<SocialMediaListing | null>(null);
  const [deletingListingId, setDeletingListingId] = useState<string | null>(null);
  const [transferUsername, setTransferUsername] = useState("");
  const [platformCounts, setPlatformCounts] = useState({
    all: 0,
    facebook: 0,
    telegram: 0,
    youtube: 0,
    tiktok: 0,
    twitter: 0,
    instagram: 0
  });
  const { getListings, addToFavorites, removeFromFavorites, checkFavorite, loading } = useSocialMedia();

  useEffect(() => {
    loadListings();
  }, []);

  useEffect(() => {
    filterListings();
  }, [searchQuery, selectedPlatform, listings]);

  const loadListings = async () => {
    const data = await getListings({ status: 'available' });
    setListings(data || []);
    
    // Load favorites status for each listing
    if (user && data) {
      const favPromises = data.map(listing => checkFavorite(listing.id));
      const favResults = await Promise.all(favPromises);
      const newFavorites = new Set<string>();
      data.forEach((listing, index) => {
        if (favResults[index]) {
          newFavorites.add(listing.id);
        }
      });
      setFavorites(newFavorites);
    }
    
    const counts = {
      all: data?.length || 0,
      facebook: data?.filter((l) => l.platform === 'facebook').length || 0,
      telegram: data?.filter((l) => l.platform === 'telegram').length || 0,
      youtube: data?.filter((l) => l.platform === 'youtube').length || 0,
      tiktok: data?.filter((l) => l.platform === 'tiktok').length || 0,
      twitter: data?.filter((l) => l.platform === 'twitter').length || 0,
      instagram: data?.filter((l) => l.platform === 'instagram').length || 0
    };
    setPlatformCounts(counts);
  };

  const filterListings = () => {
    let filtered = listings;
    
    if (selectedPlatform !== "All Platforms") {
      let platformKey = selectedPlatform.toLowerCase();
      // Handle Twitter/X special case
      if (platformKey === 'twitter/x') {
        platformKey = 'twitter';
      }
      filtered = filtered.filter((l) => l.platform === platformKey);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((l) => 
        l.account_name?.toLowerCase().includes(query) ||
        l.description?.toLowerCase().includes(query) ||
        l.platform?.toLowerCase().includes(query)
      );
    }
    
    setFilteredListings(filtered);
  };

  const handleChatWithSeller = async (listing: SocialMediaListing) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    try {
      const conversationId = await createConversation(listing.seller_id, undefined);
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

  const handleBuyAccount = (listing: SocialMediaListing) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setSelectedListing(listing);
    setBuyDialogOpen(true);
  };

  const handleProceedToPurchase = () => {
    if (!transferUsername.trim()) {
      toast({
        title: "Username required",
        description: "Please enter your username for account transfer",
        variant: "destructive"
      });
      return;
    }
    setBuyDialogOpen(false);
    toast({
      title: "Proceeding to payment",
      description: `Redirecting to escrow funding for ${selectedListing?.account_name}...`
    });
    navigate(`/escrow?listing=${selectedListing?.id}&username=${transferUsername}`);
  };

  const handleToggleFavorite = async (listingId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    
    const isFavorite = favorites.has(listingId);
    if (isFavorite) {
      const success = await removeFromFavorites(listingId);
      if (success) {
        setFavorites(prev => {
          const newSet = new Set(prev);
          newSet.delete(listingId);
          return newSet;
        });
      }
    } else {
      const success = await addToFavorites(listingId);
      if (success) {
        setFavorites(prev => new Set(prev).add(listingId));
      }
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    try {
      const { error } = await supabase
        .from('social_media_listings')
        .delete()
        .eq('id', listingId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Listing deleted successfully"
      });
      
      loadListings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setDeletingListingId(null);
    }
  };

  const categories = [
    { name: "All Platforms", count: platformCounts.all, icon: TrendingUp },
    { name: "Facebook", count: platformCounts.facebook, icon: Facebook },
    { name: "Telegram", count: platformCounts.telegram, icon: Send },
    { name: "YouTube", count: platformCounts.youtube, icon: Youtube },
    { name: "TikTok", count: platformCounts.tiktok, icon: Music2 },
    { name: "Twitter/X", count: platformCounts.twitter, icon: Twitter },
    { name: "Instagram", count: platformCounts.instagram, icon: Instagram },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-40 right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-40 left-20 w-80 h-80 bg-secondary/5 rounded-full blur-3xl"></div>
      </div>

      <Navbar />
      
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto">
          <div className="mb-10 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card border border-primary/20">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{platformCounts.all} Accounts Available</span>
              </div>
              <Button 
                onClick={() => navigate('/social-media/favorites')}
                variant="outline"
                className="gap-2"
              >
                <Heart className="w-4 h-4" />
                My Favorites
              </Button>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Buy/Sell Social Media
            </h1>
            <p className="text-lg text-muted-foreground">
              Decentralized marketplace for buying and selling verified social media accounts
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            {categories.map((category, index) => {
              const Icon = category.icon;
              const isSelected = selectedPlatform === category.name;
              return (
                <Card 
                  key={index}
                  className={`p-3 glass-card shadow-card hover:shadow-glow transition-smooth cursor-pointer group ${
                    isSelected ? 'border-primary/50 bg-primary/5' : 'border-primary/10 hover:border-primary/30'
                  }`}
                  onClick={() => setSelectedPlatform(category.name)}
                >
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center group-hover:scale-110 transition-smooth">
                      <Icon className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div>
                      <div className="font-semibold text-xs">{category.name}</div>
                      <div className="text-xs text-muted-foreground">{category.count}</div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="flex flex-col lg:flex-row gap-4 mb-10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search accounts by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 glass-card border-primary/20 focus:border-primary/40 shadow-card"
              />
            </div>
            <SocialMediaListingDialog onSuccess={loadListings} />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <Card className="p-8 text-center col-span-full">
                <p className="text-muted-foreground">Loading listings...</p>
              </Card>
            ) : filteredListings.length === 0 ? (
              <Card className="p-8 text-center col-span-full">
                <p className="text-muted-foreground">
                  {searchQuery || selectedPlatform !== "All Platforms" 
                    ? "No accounts match your filters" 
                    : "No accounts available. Be the first to list!"}
                </p>
              </Card>
            ) : filteredListings.map((listing, index) => {
              const PlatformIcon = platformIcons[listing.platform];
              const platformColor = platformColors[listing.platform];
              const isFavorite = favorites.has(listing.id);
              const firstScreenshot = listing.screenshot_urls && listing.screenshot_urls.length > 0 
                ? listing.screenshot_urls[0] 
                : listing.screenshot_url;
              
              return (
                <Card 
                  key={listing.id} 
                  className="relative overflow-hidden p-6 glass-card border-primary/10 shadow-card hover:shadow-glow transition-smooth hover:scale-[1.02] group animate-fade-in cursor-pointer"
                  style={{ animationDelay: `${0.3 + index * 0.05}s` }}
                  onClick={() => navigate(`/social-media/${listing.id}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl ${platformColor} flex items-center justify-center`}>
                      <PlatformIcon className="w-6 h-6" />
                    </div>
                    <div className="flex gap-2">
                      {listing.verification_proof && (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(listing.id);
                        }}
                      >
                        <Heart className={`w-4 h-4 transition-smooth ${isFavorite ? 'fill-destructive text-destructive' : 'text-muted-foreground hover:text-foreground'}`} />
                      </Button>
                    </div>
                  </div>

                  {firstScreenshot && (
                    <div className="mb-4 rounded-lg overflow-hidden relative">
                      <img 
                        src={firstScreenshot} 
                        alt={listing.account_name}
                        className="w-full h-32 object-cover"
                      />
                      {listing.screenshot_urls && listing.screenshot_urls.length > 1 && (
                        <Badge className="absolute bottom-2 right-2 bg-black/70 text-white">
                          +{listing.screenshot_urls.length - 1} more
                        </Badge>
                      )}
                    </div>
                  )}

                  <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-smooth">
                    {listing.account_name}
                  </h3>
                  
                  <Badge variant="outline" className="mb-3 capitalize">
                    {listing.platform}
                  </Badge>

                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {listing.description}
                  </p>

                  <div className="space-y-3 mb-5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">
                          {listing.platform === 'youtube' ? 'Subscribers' : 
                           listing.platform === 'telegram' || (listing.platform === 'facebook' && listing.metadata?.account_type === 'Group') ? 'Members' : 
                           'Followers'}
                        </div>
                        <div className="font-semibold">{listing.followers_count.toLocaleString()}</div>
                      </div>
                    </div>

                    {/* Platform-specific metadata display */}
                    {listing.metadata?.niche && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {listing.metadata.niche}
                        </Badge>
                      </div>
                    )}

                    {listing.metadata?.is_verified && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        <span className="text-xs font-medium">Verified Account</span>
                      </div>
                    )}

                    {listing.metadata?.engagement_rate && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Engagement: </span>
                        <span className="font-semibold">{listing.metadata.engagement_rate}%</span>
                      </div>
                    )}

                    {listing.metadata?.monetization_status && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Monetization: </span>
                        <span className="font-semibold">{listing.metadata.monetization_status}</span>
                      </div>
                    )}

                    {listing.metadata?.average_views && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Avg Views: </span>
                        <span className="font-semibold">{parseInt(listing.metadata.average_views).toLocaleString()}</span>
                      </div>
                    )}

                    {listing.metadata?.total_videos && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Total Videos: </span>
                        <span className="font-semibold">{listing.metadata.total_videos}</span>
                      </div>
                    )}

                    {listing.metadata?.tweets_count && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Tweets: </span>
                        <span className="font-semibold">{parseInt(listing.metadata.tweets_count).toLocaleString()}</span>
                      </div>
                    )}

                    {listing.metadata?.total_likes && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Total Likes: </span>
                        <span className="font-semibold">{parseInt(listing.metadata.total_likes).toLocaleString()}</span>
                      </div>
                    )}

                    {listing.metadata?.account_type && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Type: </span>
                        <span className="font-semibold">{listing.metadata.account_type}</span>
                      </div>
                    )}

                    {listing.metadata?.monthly_reach && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Monthly Reach: </span>
                        <span className="font-semibold">{parseInt(listing.metadata.monthly_reach).toLocaleString()}</span>
                      </div>
                    )}

                    {listing.metadata?.account_age && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Age: </span>
                        <span className="font-semibold">{listing.metadata.account_age}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2">
                      <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                        <DollarSign className="w-4 h-4 text-success" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Price</div>
                        <div className="font-semibold text-success">{listing.price_usdc} USDC</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-primary/10">
                    <div className="text-xs text-muted-foreground mb-3">
                      Seller: {listing.seller?.display_name || listing.seller?.wallet_address?.slice(0, 8) + '...'}
                    </div>
                    <div className="flex gap-2">
                      {user?.id === listing.seller_id && (
                        <>
                          <Button 
                            variant="outline"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingListing(listing);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline"
                            size="icon"
                            className="border-destructive/20 hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingListingId(listing.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </>
                      )}
                      <Button 
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleChatWithSeller(listing);
                        }}
                      >
                        <MessageSquare className="w-3 h-3" />
                        Chat
                      </Button>
                      {user?.id !== listing.seller_id && (
                        <Button 
                          size="sm"
                          className="flex-1 gap-2 shadow-glow"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBuyAccount(listing);
                          }}
                        >
                          <ShoppingCart className="w-3 h-3" />
                          Buy
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Buy Dialog */}
      <Dialog open={buyDialogOpen} onOpenChange={setBuyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purchase Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                You're about to purchase: <strong>{selectedListing?.account_name}</strong>
              </p>
              <p className="text-lg font-bold text-success">
                Price: {selectedListing?.price_usdc} USDC
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transferUsername">Your Username for Transfer</Label>
              <Input
                id="transferUsername"
                value={transferUsername}
                onChange={(e) => setTransferUsername(e.target.value)}
                placeholder="Enter your username or email for account transfer"
                required
              />
              <p className="text-xs text-muted-foreground">
                The seller will transfer the account to this username
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setBuyDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleProceedToPurchase}>
                Proceed to Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {editingListing && (
        <EditSocialMediaListingDialog
          listing={editingListing}
          open={!!editingListing}
          onOpenChange={(open) => !open && setEditingListing(null)}
          onSuccess={loadListings}
        />
      )}

      <AlertDialog open={!!deletingListingId} onOpenChange={() => setDeletingListingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Listing</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this listing? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingListingId && handleDeleteListing(deletingListingId)} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SocialMediaMarketplace;