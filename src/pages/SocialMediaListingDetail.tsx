import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { useSocialMedia, SocialMediaListing } from '@/hooks/useSocialMedia';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Heart, Users, CheckCircle2, TrendingUp, DollarSign, Calendar, Award, ShoppingCart } from 'lucide-react';
import { useSocialMedia as useFavorites } from '@/hooks/useSocialMedia';
import { useAuth } from '@/hooks/useAuth';
import { useMessages } from '@/hooks/useMessages';
import { toast } from '@/hooks/use-toast';
import { SocialMediaPurchaseDialog } from '@/components/SocialMediaPurchaseDialog';


const SocialMediaListingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getListingById, loading } = useSocialMedia();
  const { addToFavorites, removeFromFavorites, checkFavorite } = useFavorites();
  const { user } = useAuth();
  const { createConversation } = useMessages();
  const [listing, setListing] = useState<SocialMediaListing | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);

  useEffect(() => {
    const fetchListing = async () => {
      if (id) {
        const data = await getListingById(id);
        setListing(data);
        if (data?.screenshot_urls && data.screenshot_urls.length > 0) {
          setSelectedImage(0);
        }
      }
    };
    fetchListing();
  }, [id]);

  useEffect(() => {
    const checkIfFavorite = async () => {
      if (id && user) {
        const favorited = await checkFavorite(id);
        setIsFavorite(favorited);
      }
    };
    checkIfFavorite();
  }, [id, user]);

  const handleFavoriteToggle = async () => {
    if (!id) return;
    
    if (isFavorite) {
      const success = await removeFromFavorites(id);
      if (success) setIsFavorite(false);
    } else {
      const success = await addToFavorites(id);
      if (success) setIsFavorite(true);
    }
  };

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      facebook: '📘',
      telegram: '📱',
      youtube: '▶️',
      tiktok: '🎵',
      twitter: '🐦',
      instagram: '📷',
    };
    return icons[platform] || '📱';
  };

  const screenshots = listing?.screenshot_urls && listing.screenshot_urls.length > 0 
    ? listing.screenshot_urls 
    : listing?.screenshot_url 
    ? [listing.screenshot_url] 
    : [];

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.03),transparent_50%)]" />
          <div className="absolute top-40 right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-40 left-20 w-80 h-80 bg-secondary/5 rounded-full blur-3xl" />
        </div>
        <Navbar />
        <div className="container mx-auto px-4 py-8 pt-24">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.03),transparent_50%)]" />
          <div className="absolute top-40 right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-40 left-20 w-80 h-80 bg-secondary/5 rounded-full blur-3xl" />
        </div>
        <Navbar />
        <div className="container mx-auto px-4 py-8 pt-24 text-center">
          <p className="text-muted-foreground">Listing not found</p>
          <Button onClick={() => navigate('/social-media')} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Marketplace
          </Button>
        </div>
      </div>
    );
  }

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
      <div className="container mx-auto px-4 py-8 pt-24 animate-fade-in">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/social-media')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Marketplace
        </Button>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Images Section */}
          <div className="space-y-4">
            <Card className="overflow-hidden glass-card shadow-card border-primary/20">
              <CardContent className="p-0">
                {screenshots.length > 0 ? (
                  <img
                    src={screenshots[selectedImage]}
                    alt={`${listing.account_name} screenshot ${selectedImage + 1}`}
                    className="w-full h-96 object-cover"
                  />
                ) : (
                  <div className="w-full h-96 bg-muted flex items-center justify-center">
                    <p className="text-muted-foreground">No screenshot available</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {screenshots.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {screenshots.map((url, index) => (
                  <Card
                    key={index}
                    className={`cursor-pointer overflow-hidden glass-card transition-smooth ${
                      selectedImage === index ? 'ring-2 ring-primary shadow-glow' : 'opacity-60 hover:opacity-100'
                    }`}
                    onClick={() => setSelectedImage(index)}
                  >
                    <CardContent className="p-0">
                      <img
                        src={url}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-20 object-cover"
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-3xl">{getPlatformIcon(listing.platform)}</span>
                  <Badge variant="secondary" className="capitalize">
                    {listing.platform}
                  </Badge>
                  {listing.metadata?.isVerified && (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified
                    </Badge>
                  )}
                </div>
                <h1 className="text-3xl font-bold mb-2">{listing.account_name}</h1>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{listing.followers_count.toLocaleString()} followers</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleFavoriteToggle}
              >
                <Heart className={`w-5 h-5 transition-smooth ${isFavorite ? 'fill-destructive text-destructive' : ''}`} />
              </Button>
            </div>

            <Card className="glass-card shadow-card border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Price</p>
                    <p className="text-3xl font-bold text-primary">${listing.price_usdc.toLocaleString()}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <div>
              <h2 className="text-xl font-semibold mb-3">Description</h2>
              <p className="text-muted-foreground leading-relaxed">{listing.description}</p>
            </div>

            {listing.metadata && (
              <div>
                <h2 className="text-xl font-semibold mb-3">Account Details</h2>
                <div className="grid grid-cols-2 gap-4">
                  {listing.metadata.niche && (
                    <Card className="glass-card shadow-card">
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground mb-1">Niche</p>
                        <p className="font-medium">{listing.metadata.niche}</p>
                      </CardContent>
                    </Card>
                  )}
                  {listing.metadata.engagementRate && (
                    <Card className="glass-card shadow-card">
                      <CardContent className="p-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Engagement Rate</p>
                          <p className="font-medium">{listing.metadata.engagementRate}%</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {listing.metadata.monetizationStatus && (
                    <Card className="glass-card shadow-card">
                      <CardContent className="p-4 flex items-center gap-2">
                        <Award className="w-4 h-4 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Monetization</p>
                          <p className="font-medium capitalize">{listing.metadata.monetizationStatus}</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {listing.metadata.averageViews && (
                    <Card className="glass-card shadow-card">
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground mb-1">Avg. Views</p>
                        <p className="font-medium">{parseInt(listing.metadata.averageViews).toLocaleString()}</p>
                      </CardContent>
                    </Card>
                  )}
                  {listing.metadata.totalVideos && (
                    <Card className="glass-card shadow-card">
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground mb-1">Total Videos</p>
                        <p className="font-medium">{parseInt(listing.metadata.totalVideos).toLocaleString()}</p>
                      </CardContent>
                    </Card>
                  )}
                  {listing.metadata.tweetsCount && (
                    <Card className="glass-card shadow-card">
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground mb-1">Total Tweets</p>
                        <p className="font-medium">{parseInt(listing.metadata.tweetsCount).toLocaleString()}</p>
                      </CardContent>
                    </Card>
                  )}
                  {listing.metadata.totalLikes && (
                    <Card className="glass-card shadow-card">
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground mb-1">Total Likes</p>
                        <p className="font-medium">{parseInt(listing.metadata.totalLikes).toLocaleString()}</p>
                      </CardContent>
                    </Card>
                  )}
                  {listing.metadata.accountAge && (
                    <Card className="glass-card shadow-card">
                      <CardContent className="p-4 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Account Age</p>
                          <p className="font-medium">{listing.metadata.accountAge}</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {listing.metadata.accountType && (
                    <Card className="glass-card shadow-card">
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground mb-1">Account Type</p>
                        <p className="font-medium capitalize">{listing.metadata.accountType}</p>
                      </CardContent>
                    </Card>
                  )}
                  {listing.metadata.monthlyReach && (
                    <Card className="glass-card shadow-card">
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground mb-1">Monthly Reach</p>
                        <p className="font-medium">{parseInt(listing.metadata.monthlyReach).toLocaleString()}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {listing.seller && (
              <Card className="glass-card shadow-card">
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold mb-3">Seller Information</h3>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={listing.seller.avatar_url} />
                      <AvatarFallback>
                        {listing.seller.display_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{listing.seller.display_name}</p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {listing.seller.wallet_address?.slice(0, 6)}...{listing.seller.wallet_address?.slice(-4)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              <Button 
                className="w-full shadow-glow" 
                size="lg"
                onClick={() => {
                  if (!user) {
                    navigate('/auth');
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
                  setShowPurchaseDialog(true);
                }}
                disabled={listing.status !== 'available'}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                {listing.status === 'available' ? 'Buy Now' : `Status: ${listing.status}`}
              </Button>
              
              <Button 
                variant="outline"
                className="w-full" 
                size="lg"
                onClick={async () => {
                  if (!user) {
                    navigate('/auth');
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
                }}
              >
                Contact Seller
              </Button>
            </div>

            {listing && (
              <SocialMediaPurchaseDialog
                open={showPurchaseDialog}
                onOpenChange={setShowPurchaseDialog}
                listing={listing}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialMediaListingDetail;
