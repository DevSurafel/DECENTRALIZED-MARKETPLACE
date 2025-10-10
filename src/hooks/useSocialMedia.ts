import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type SocialMediaPlatform = 'facebook' | 'telegram' | 'youtube' | 'tiktok' | 'twitter' | 'instagram';

export interface SocialMediaListing {
  id: string;
  seller_id: string;
  platform: SocialMediaPlatform;
  account_name: string;
  followers_count: number;
  description: string;
  price_usdc: number;
  verification_proof?: string;
  screenshot_url?: string;
  screenshot_urls?: string[];
  status: 'available' | 'pending' | 'sold';
  created_at: string;
  metadata?: Record<string, any>;
  seller?: {
    display_name: string;
    wallet_address: string;
    avatar_url?: string;
  };
}

export const useSocialMedia = () => {
  const [loading, setLoading] = useState(false);

  const createListing = async (listingData: {
    platform: SocialMediaPlatform;
    account_name: string;
    followers_count: number;
    description: string;
    price_usdc: number;
    verification_proof?: string;
    screenshot_url?: string;
    screenshot_urls?: string[];
    metadata?: Record<string, any>;
  }) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to list your account",
          variant: "destructive"
        });
        return null;
      }

      const { data, error } = await supabase
        .from('social_media_listings')
        .insert([{
          seller_id: user.id,
          platform: listingData.platform,
          account_name: listingData.account_name,
          followers_count: listingData.followers_count,
          description: listingData.description,
          price_usdc: listingData.price_usdc,
          verification_proof: listingData.verification_proof,
          screenshot_url: listingData.screenshot_url,
          screenshot_urls: listingData.screenshot_urls || [],
          metadata: listingData.metadata || {},
          status: 'available'
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Listing created successfully",
        description: "Your account is now listed in the marketplace"
      });
      return data;
    } catch (error) {
      console.error('Error creating listing:', error);
      toast({
        title: "Error",
        description: "Failed to create listing",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getListings = async (filters?: { status?: string; platform?: SocialMediaPlatform }) => {
    setLoading(true);
    try {
      let query = supabase
        .from('social_media_listings')
        .select(`
          *,
          seller:profiles!seller_id(display_name, wallet_address)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.platform) {
        query = query.eq('platform', filters.platform);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as SocialMediaListing[];
    } catch (error) {
      console.error('Error fetching listings:', error);
      toast({
        title: "Error",
        description: "Failed to load listings",
        variant: "destructive"
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getListingById = async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('social_media_listings')
        .select(`
          *,
          seller:profiles!seller_id(display_name, wallet_address, avatar_url)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as SocialMediaListing;
    } catch (error) {
      console.error('Error fetching listing:', error);
      toast({
        title: "Error",
        description: "Failed to load listing details",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getUserListings = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('social_media_listings')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as SocialMediaListing[];
    } catch (error) {
      console.error('Error fetching user listings:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const updateListingStatus = async (id: string, status: 'available' | 'pending' | 'sold') => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('social_media_listings')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: `Listing marked as ${status}`
      });
      return true;
    } catch (error) {
      console.error('Error updating listing status:', error);
      toast({
        title: "Error",
        description: "Failed to update listing status",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const addToFavorites = async (listingId: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to add favorites",
          variant: "destructive"
        });
        return false;
      }

      const { error } = await supabase
        .from('social_media_favorites')
        .insert([{ user_id: user.id, listing_id: listingId }]);

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Already in favorites",
            description: "This listing is already in your favorites"
          });
          return false;
        }
        throw error;
      }

      toast({
        title: "Added to favorites",
        description: "Listing saved to your favorites"
      });
      return true;
    } catch (error) {
      console.error('Error adding to favorites:', error);
      toast({
        title: "Error",
        description: "Failed to add to favorites",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const removeFromFavorites = async (listingId: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('social_media_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('listing_id', listingId);

      if (error) throw error;

      toast({
        title: "Removed from favorites",
        description: "Listing removed from your favorites"
      });
      return true;
    } catch (error) {
      console.error('Error removing from favorites:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const checkFavorite = async (listingId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('social_media_favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('listing_id', listingId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    } catch (error) {
      console.error('Error checking favorite:', error);
      return false;
    }
  };

  return {
    createListing,
    getListings,
    getListingById,
    getUserListings,
    updateListingStatus,
    addToFavorites,
    removeFromFavorites,
    checkFavorite,
    loading
  };
};