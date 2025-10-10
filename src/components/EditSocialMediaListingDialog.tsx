import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SocialMediaListing } from "@/hooks/useSocialMedia";

interface EditSocialMediaListingDialogProps {
  listing: SocialMediaListing;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditSocialMediaListingDialog({ listing, open, onOpenChange, onSuccess }: EditSocialMediaListingDialogProps) {
  const [accountName, setAccountName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [followersCount, setFollowersCount] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (listing) {
      setAccountName(listing.account_name || "");
      setDescription(listing.description || "");
      setPrice(listing.price_usdc?.toString() || "");
      setFollowersCount(listing.followers_count?.toString() || "");
    }
  }, [listing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('social_media_listings')
        .update({
          account_name: accountName,
          description,
          price_usdc: parseFloat(price),
          followers_count: parseInt(followersCount),
          updated_at: new Date().toISOString()
        })
        .eq('id', listing.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Listing updated successfully"
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Social Media Listing</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="accountName">Account Name</Label>
            <Input
              id="accountName"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Price (USDC)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="followersCount">
                {listing.platform === 'youtube' ? 'Subscribers' : 
                 listing.platform === 'telegram' ? 'Members' : 
                 'Followers'}
              </Label>
              <Input
                id="followersCount"
                type="number"
                value={followersCount}
                onChange={(e) => setFollowersCount(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Listing"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
