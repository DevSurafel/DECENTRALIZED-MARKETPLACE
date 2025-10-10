import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Users, DollarSign, ExternalLink, Facebook, Send, Youtube, Twitter, Instagram, CheckCircle2 } from 'lucide-react';
import { useSocialMedia, SocialMediaListing } from '@/hooks/useSocialMedia';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const platformIcons = {
  facebook: Facebook,
  telegram: Send,
  youtube: Youtube,
  tiktok: Send,
  twitter: Twitter,
  instagram: Instagram,
};

const platformColors = {
  facebook: 'bg-blue-500',
  telegram: 'bg-sky-500',
  youtube: 'bg-red-500',
  tiktok: 'bg-pink-500',
  twitter: 'bg-blue-400',
  instagram: 'bg-gradient-to-r from-purple-500 to-pink-500',
};

export default function SocialMediaFavorites() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { getListings, removeFromFavorites, loading } = useSocialMedia();
  const [favorites, setFavorites] = useState<SocialMediaListing[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to view your favorites",
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }
    loadFavorites();
  }, [user, authLoading]);

  const loadFavorites = async () => {
    if (!user) return;
    
    // Get user's favorite listing IDs
    const { data: favData, error: favError } = await supabase
      .from('social_media_favorites')
      .select('listing_id')
      .eq('user_id', user.id);

    if (favError) {
      console.error('Error loading favorites:', favError);
      return;
    }

    const favIds = new Set(favData?.map(f => f.listing_id) || []);
    setFavoriteIds(favIds);

    if (favIds.size === 0) {
      setFavorites([]);
      return;
    }

    // Get the actual listings
    const allListings = await getListings({ status: 'available' });
    const favoriteListings = allListings.filter(listing => favIds.has(listing.id));
    setFavorites(favoriteListings);
  };

  const handleRemoveFavorite = async (listingId: string) => {
    const success = await removeFromFavorites(listingId);
    if (success) {
      setFavorites(favorites.filter(f => f.id !== listingId));
      setFavoriteIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(listingId);
        return newSet;
      });
    }
  };

  const handleViewListing = (listingId: string) => {
    navigate(`/social-media?listing=${listingId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Favorites</h1>
          <p className="text-muted-foreground">
            Social media accounts you've saved for later
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground">Loading your favorites...</p>
          </div>
        ) : favorites.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Heart className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No favorites yet</h3>
              <p className="text-muted-foreground mb-4">
                Start exploring and save accounts you're interested in
              </p>
              <Button onClick={() => navigate('/social-media')}>
                Browse Marketplace
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((listing) => {
              const Icon = platformIcons[listing.platform as keyof typeof platformIcons];
              const colorClass = platformColors[listing.platform as keyof typeof platformColors];
              const firstScreenshot = listing.screenshot_urls && listing.screenshot_urls.length > 0 
                ? listing.screenshot_urls[0] 
                : listing.screenshot_url;

              return (
                <Card 
                  key={listing.id} 
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/social-media/${listing.id}`)}
                >
                  <CardHeader className={`${colorClass} text-white p-0`}>
                    {firstScreenshot && (
                      <div className="relative">
                        <img 
                          src={firstScreenshot} 
                          alt={listing.account_name}
                          className="w-full h-40 object-cover"
                        />
                        {listing.screenshot_urls && listing.screenshot_urls.length > 1 && (
                          <Badge className="absolute bottom-2 right-2 bg-black/70 text-white">
                            +{listing.screenshot_urls.length - 1} more
                          </Badge>
                        )}
                      </div>
                    )}
                    <div className={`p-4 ${colorClass}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-6 w-6" />
                          <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                            {listing.platform}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white hover:bg-white/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFavorite(listing.id);
                          }}
                        >
                          <Heart className="h-5 w-5 fill-current" />
                        </Button>
                      </div>
                      <h3 className="text-xl font-bold mt-2">{listing.account_name}</h3>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {listing.followers_count.toLocaleString()} {listing.platform === 'youtube' ? 'subscribers' : 
                           listing.platform === 'telegram' || (listing.platform === 'facebook' && listing.metadata?.account_type === 'Group') ? 'members' : 
                           'followers'}
                        </span>
                      </div>

                      {listing.metadata?.niche && (
                        <Badge variant="outline" className="text-xs">
                          {listing.metadata.niche}
                        </Badge>
                      )}

                      {listing.metadata?.engagement_rate && (
                        <div className="text-xs text-muted-foreground">
                          Engagement: <span className="font-semibold text-foreground">{listing.metadata.engagement_rate}%</span>
                        </div>
                      )}

                      {listing.metadata?.monetization_status && (
                        <div className="text-xs text-muted-foreground">
                          Monetization: <span className="font-semibold text-foreground">{listing.metadata.monetization_status}</span>
                        </div>
                      )}

                      {listing.metadata?.average_views && (
                        <div className="text-xs text-muted-foreground">
                          Avg Views: <span className="font-semibold text-foreground">{parseInt(listing.metadata.average_views).toLocaleString()}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm pt-2 border-t">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-lg">${listing.price_usdc.toLocaleString()} USDC</span>
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {listing.description}
                      </p>
                    </div>
                  </CardContent>

                  <CardFooter className="gap-2">
                    <Button 
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/social-media/${listing.id}`);
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
