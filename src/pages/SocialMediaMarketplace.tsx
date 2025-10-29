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
import { SocialMediaPurchaseDialog } from "@/components/SocialMediaPurchaseDialog";
import { useSocialMedia, SocialMediaPlatform, SocialMediaListing } from "@/hooks/useSocialMedia";
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
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [selectedListing, setSelectedListing] = useState<SocialMediaListing | null>(null);
  const [editingListing, setEditingListing] = useState<SocialMediaListing | null>(null);
  const [deletingListingId, setDeletingListingId] = useState<string | null>(null);
  const [platformCounts, setPlatformCounts] = useState({
    all: 0,
    facebook: 0,
    telegram: 0,
    youtube: 0,
    tiktok: 0,
    twitter: 0,
    instagram: 0
  });
  const [currentPage, setCurrentPage] = useState(1);
  const listingsPerPage = 18;
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
    setCurrentPage(1); // Reset to first page on filter change
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
    if (listing.seller_id === user.id) {
      toast({
        title: "Cannot Purchase",
        description: "You cannot purchase your own listing",
        variant: "destructive"
      });
      return;
    }
    setSelectedListing(listing);
    setShowPurchaseDialog(true);
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
                <span className="hidden md:inline">My Favorites</span>
              </Button>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Buy/Sell Social Media
            </h1>
            <p className="text-base md:text-lg text-muted-foreground">
              Decentralized marketplace for buying and selling verified social media accounts
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5 md:gap-3 mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            {categories.map((category, index) => {
              const Icon = category.icon;
              const isSelected = selectedPlatform === category.name;
              return (
                <Card 
                  key={index}
                  className={`p-2 md:p-3 glass-card shadow-card hover:shadow-glow transition-smooth cursor-pointer group ${
                    isSelected ? 'border-primary/50 bg-primary/5' : 'border-primary/10 hover:border-primary/30'
                  }`}
                  onClick={() => setSelectedPlatform(category.name)}
                >
                  <div className="flex flex-col items-center gap-1 md:gap-2 text-center">
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg gradient-primary flex items-center justify-center group-hover:scale-110 transition-smooth">
                      <Icon className="w-3 h-3 md:w-4 md:h-4 text-primary-foreground" />
                    </div>
                    <div>
                      <div className="font-semibold text-[10px] md:text-xs">{category.name}</div>
                      <div className="text-[10px] md:text-xs text-muted-foreground">{category.count}</div>
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

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 md:gap-6">
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
            ) : filteredListings.slice((currentPage - 1) * listingsPerPage, currentPage * listingsPerPage).map((listing, index) => {
              const PlatformIcon = platformIcons[listing.platform];
              const platformColor = platformColors[listing.platform];
              const isFavorite = favorites.has(listing.id);
              const firstScreenshot = listing.screenshot_urls && listing.screenshot_urls.length > 0 
                ? listing.screenshot_urls[0] 
                : listing.screenshot_url;
              
              return (
                <Card 
                  key={listing.id} 
                  className="relative overflow-hidden p-3 md:p-6 glass-card border-primary/10 shadow-card hover:shadow-glow transition-smooth hover:scale-[1.02] group animate-fade-in cursor-pointer"
                  style={{ animationDelay: `${0.3 + index * 0.05}s` }}
                  onClick={() => navigate(`/social-media/${listing.id}`)}
                >
                  <div className="flex items-start justify-between mb-2 md:mb-4">
                    <div className={`w-8 h-8 md:w-12 md:h-12 rounded-xl ${platformColor} flex items-center justify-center`}>
                      <PlatformIcon className="w-4 h-4 md:w-6 md:h-6" />
                    </div>
                    <div className="flex gap-1">
                      {listing.verification_proof && (
                        <Badge variant="secondary" className="gap-1 text-[8px] md:text-xs px-1 md:px-2 py-0">
                          <CheckCircle2 className="w-2 h-2 md:w-3 md:h-3" />
                          <span className="hidden md:inline">Verified</span>
                          <span className="md:hidden">V</span>
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 md:h-8 md:w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(listing.id);
                        }}
                      >
                        <Heart className={`w-3 h-3 md:w-4 md:h-4 transition-smooth ${isFavorite ? 'fill-destructive text-destructive' : 'text-muted-foreground hover:text-foreground'}`} />
                      </Button>
                    </div>
                  </div>

                  {firstScreenshot && (
                    <div className="mb-2 md:mb-4 rounded-lg overflow-hidden relative">
                      <img 
                        src={firstScreenshot} 
                        alt={listing.account_name}
                        className="w-full h-20 md:h-32 object-cover"
                      />
                      {listing.screenshot_urls && listing.screenshot_urls.length > 1 && (
                        <Badge className="absolute bottom-1 right-1 bg-black/70 text-white text-[8px] md:text-xs px-1 py-0">
                          +{listing.screenshot_urls.length - 1}
                        </Badge>
                      )}
                    </div>
                  )}

                  <h3 className="text-sm md:text-xl font-bold mb-1 md:mb-2 group-hover:text-primary transition-smooth line-clamp-2">
                    {listing.account_name}
                  </h3>
                  
                  <Badge variant="outline" className="mb-2 md:mb-3 capitalize text-[8px] md:text-xs px-1 py-0">
                    {listing.platform}
                  </Badge>

                  <p className="text-[10px] md:text-sm text-muted-foreground mb-2 md:mb-4 line-clamp-2">
                    {listing.description}
                  </p>

                  <div className="space-y-1 md:space-y-3 mb-2 md:mb-5">
                    <div className="flex items-center gap-1 md:gap-2">
                      <div className="w-5 h-5 md:w-8 md:h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Users className="w-3 h-3 md:w-4 md:h-4 text-primary" />
                      </div>
                      <div>
                        <div className="text-[8px] md:text-xs text-muted-foreground">
                          {listing.platform === 'youtube' ? 'Subs' : 
                           listing.platform === 'telegram' || (listing.platform === 'facebook' && listing.metadata?.account_type === 'Group') ? 'Members' : 
                           'Followers'}
                        </div>
                        <div className="text-[10px] md:text-sm font-semibold">{(listing.followers_count / 1000).toFixed(1)}k</div>
                      </div>
                    </div>

                    {/* Platform-specific metadata display */}
                    {listing.metadata?.niche && (
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[8px] md:text-xs px-1 py-0">
                          {listing.metadata.niche}
                        </Badge>
                      </div>
                    )}

                    {listing.metadata?.is_verified && (
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4 text-primary" />
                        <span className="text-[8px] md:text-xs font-medium">Verified</span>
                      </div>
                    )}

                    {listing.metadata?.engagement_rate && (
                      <div className="text-[8px] md:text-xs">
                        <span className="text-muted-foreground">Engagement: </span>
                        <span className="font-semibold">{listing.metadata.engagement_rate}%</span>
                      </div>
                    )}

                    {listing.metadata?.monetization_status && (
                      <div className="text-[8px] md:text-xs hidden md:block">
                        <span className="text-muted-foreground">Monetization: </span>
                        <span className="font-semibold">{listing.metadata.monetization_status}</span>
                      </div>
                    )}

                    {listing.metadata?.average_views && (
                      <div className="text-[8px] md:text-xs hidden md:block">
                        <span className="text-muted-foreground">Avg Views: </span>
                        <span className="font-semibold">{parseInt(listing.metadata.average_views).toLocaleString()}</span>
                      </div>
                    )}

                    {listing.metadata?.total_videos && (
                      <div className="text-[8px] md:text-xs hidden md:block">
                        <span className="text-muted-foreground">Total Videos: </span>
                        <span className="font-semibold">{listing.metadata.total_videos}</span>
                      </div>
                    )}

                    {listing.metadata?.tweets_count && (
                      <div className="text-[8px] md:text-xs hidden md:block">
                        <span className="text-muted-foreground">Tweets: </span>
                        <span className="font-semibold">{parseInt(listing.metadata.tweets_count).toLocaleString()}</span>
                      </div>
                    )}

                    {listing.metadata?.total_likes && (
                      <div className="text-[8px] md:text-xs hidden md:block">
                        <span className="text-muted-foreground">Total Likes: </span>
                        <span className="font-semibold">{parseInt(listing.metadata.total_likes).toLocaleString()}</span>
                      </div>
                    )}

                    {listing.metadata?.account_type && (
                      <div className="text-[8px] md:text-xs hidden md:block">
                        <span className="text-muted-foreground">Type: </span>
                        <span className="font-semibold">{listing.metadata.account_type}</span>
                      </div>
                    )}

                    {listing.metadata?.monthly_reach && (
                      <div className="text-[8px] md:text-xs hidden md:block">
                        <span className="text-muted-foreground">Monthly Reach: </span>
                        <span className="font-semibold">{parseInt(listing.metadata.monthly_reach).toLocaleString()}</span>
                      </div>
                    )}

                    {listing.metadata?.account_age && (
                      <div className="text-[8px] md:text-xs hidden md:block">
                        <span className="text-muted-foreground">Age: </span>
                        <span className="font-semibold">{listing.metadata.account_age}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1 md:gap-2 pt-1 md:pt-2">
                      <div className="w-5 h-5 md:w-8 md:h-8 rounded-lg bg-success/10 flex items-center justify-center">
                        <DollarSign className="w-3 h-3 md:w-4 md:h-4 text-success" />
                      </div>
                      <div>
                        <div className="text-[8px] md:text-xs text-muted-foreground">Price</div>
                        <div className="text-[10px] md:text-sm font-semibold text-success">{listing.price_usdc} USDC</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 md:pt-4 border-t border-primary/10">
                    <div className="text-[8px] md:text-xs text-muted-foreground mb-2 md:mb-3 truncate">
                      Seller: {listing.seller?.display_name || listing.seller?.wallet_address?.slice(0, 8) + '...'}
                    </div>
                    <div className="flex gap-1 md:gap-2">
                      {user?.id === listing.seller_id && (
                        <>
                          <Button 
                            variant="outline"
                            size="icon"
                            className="h-6 w-6 md:h-9 md:w-9"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingListing(listing);
                            }}
                          >
                            <Edit className="w-3 h-3 md:w-4 md:h-4" />
                          </Button>
                          <Button 
                            variant="outline"
                            size="icon"
                            className="h-6 w-6 md:h-9 md:w-9 border-destructive/20 hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingListingId(listing.id);
                            }}
                          >
                            <Trash2 className="w-3 h-3 md:w-4 md:h-4 text-destructive" />
                          </Button>
                        </>
                      )}
                      <Button 
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1 text-[10px] md:text-sm h-6 md:h-9"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleChatWithSeller(listing);
                        }}
                      >
                        <MessageSquare className="w-2 h-2 md:w-3 md:h-3" />
                        Chat
                      </Button>
                      {user?.id !== listing.seller_id && (
                        <Button 
                          size="sm"
                          className="flex-1 gap-1 shadow-glow text-[10px] md:text-sm h-6 md:h-9"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBuyAccount(listing);
                          }}
                        >
                          <ShoppingCart className="w-2 h-2 md:w-3 md:h-3" />
                          Buy
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {filteredListings.length > listingsPerPage && (
            <Pagination className="mt-8">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                {Array.from({ length: Math.ceil(filteredListings.length / listingsPerPage) }, (_, i) => i + 1).map((page) => (
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
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredListings.length / listingsPerPage), p + 1))}
                    className={currentPage === Math.ceil(filteredListings.length / listingsPerPage) ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </div>

      {/* Purchase Dialog */}
      {selectedListing && (
        <SocialMediaPurchaseDialog
          open={showPurchaseDialog}
          onOpenChange={setShowPurchaseDialog}
          listing={selectedListing}
        />
      )}

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

