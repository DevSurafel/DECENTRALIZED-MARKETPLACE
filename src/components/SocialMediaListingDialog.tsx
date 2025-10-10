import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSocialMedia, SocialMediaPlatform } from "@/hooks/useSocialMedia";
import { Plus, Upload, X, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { validateSocialMediaURL } from "@/utils/socialMediaValidator";

interface SocialMediaListingDialogProps {
  onSuccess?: () => void;
}

export const SocialMediaListingDialog = ({ onSuccess }: SocialMediaListingDialogProps) => {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<SocialMediaPlatform>('instagram');
  const [accountName, setAccountName] = useState("");
  const [followersCount, setFollowersCount] = useState("");
  const [description, setDescription] = useState("");
  const [priceUsdc, setPriceUsdc] = useState("");
  const [accountLink, setAccountLink] = useState("");
  const [linkValidation, setLinkValidation] = useState<{ isValid: boolean; message: string } | null>(null);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([]);
  const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  
  // Platform-specific fields
  const [niche, setNiche] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [engagementRate, setEngagementRate] = useState("");
  const [monetizationStatus, setMonetizationStatus] = useState("");
  const [averageViews, setAverageViews] = useState("");
  const [totalVideos, setTotalVideos] = useState("");
  const [tweetsCount, setTweetsCount] = useState("");
  const [totalLikes, setTotalLikes] = useState("");
  const [accountAge, setAccountAge] = useState("");
  const [accountType, setAccountType] = useState("");
  const [monthlyReach, setMonthlyReach] = useState("");
  
  const { createListing, loading } = useSocialMedia();

  // Real-time link validation and data fetching
  useEffect(() => {
    if (!accountLink) {
      setLinkValidation(null);
      return;
    }

    const fetchAccountData = async () => {
      const validationResult = validateSocialMediaURL(accountLink, platform);
      
      if (validationResult.isValid) {
        setLinkValidation({ isValid: true, message: 'Validating and fetching data...' });
        
        // Fetch account data
        setIsFetchingData(true);
        try {
          const { data, error } = await supabase.functions.invoke('fetch-social-media-data', {
            body: { url: accountLink, platform }
          });

          if (error) throw error;

          if (data?.success && data?.data) {
            // Auto-fill fields with fetched data
            if (data.data.accountName) {
              setAccountName(data.data.accountName);
            }
            if (data.data.followers !== undefined) {
              setFollowersCount(data.data.followers.toString());
            }
            if (data.data.isVerified !== undefined) {
              setIsVerified(data.data.isVerified);
            }
            if (data.data.videoCount !== undefined && platform === 'youtube') {
              setTotalVideos(data.data.videoCount.toString());
            }

            setLinkValidation({ isValid: true, message: 'Account verified and data loaded!' });
            toast({
              title: "✓ Account data fetched",
              description: "Fields auto-filled with account information",
            });
          } else if (data?.error) {
            setLinkValidation({ 
              isValid: true, 
              message: `Valid URL but couldn't fetch data: ${data.error}. Please fill manually.` 
            });
          }
        } catch (error) {
          console.error("Error fetching account data:", error);
          setLinkValidation({ 
            isValid: true, 
            message: 'Valid URL but auto-fetch failed. Please fill manually.' 
          });
        } finally {
          setIsFetchingData(false);
        }
      } else {
        setLinkValidation({ 
          isValid: false, 
          message: validationResult.errorMessage || 'Invalid URL' 
        });
      }
    };

    const timeoutId = setTimeout(() => {
      fetchAccountData();
    }, 1000); // Debounce for 1 second

    return () => clearTimeout(timeoutId);
  }, [accountLink, platform]);

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    const validFiles: File[] = [];
    const previews: string[] = [];
    
    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} must be less than 5MB`,
          variant: "destructive"
        });
        return;
      }
      validFiles.push(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        previews.push(reader.result as string);
        if (previews.length === validFiles.length) {
          setScreenshotPreviews(prev => [...prev, ...previews]);
        }
      };
      reader.readAsDataURL(file);
    });
    
    setScreenshotFiles(prev => [...prev, ...validFiles]);
  };

  const removeScreenshot = (index: number) => {
    setScreenshotFiles(prev => prev.filter((_, i) => i !== index));
    setScreenshotPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate account link before submission
    if (!linkValidation?.isValid) {
      toast({
        title: "Invalid account link",
        description: "Please provide a valid account link before submitting",
        variant: "destructive"
      });
      return;
    }
    
    setUploading(true);
    
    const screenshotUrls: string[] = [];
    
    // Upload all screenshots if provided
    if (screenshotFiles.length > 0) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        for (const file of screenshotFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const filePath = `screenshots/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('social-media-screenshots')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('social-media-screenshots')
            .getPublicUrl(filePath);
          
          screenshotUrls.push(publicUrl);
        }
      } catch (error) {
        console.error('Error uploading screenshots:', error);
        toast({
          title: "Upload failed",
          description: "Failed to upload screenshots",
          variant: "destructive"
        });
        setUploading(false);
        return;
      }
    }
    
    // Build platform-specific metadata
    const metadata: Record<string, any> = {};
    if (niche) metadata.niche = niche;
    if (isVerified) metadata.isVerified = isVerified;
    if (engagementRate) metadata.engagementRate = engagementRate;
    if (monetizationStatus) metadata.monetizationStatus = monetizationStatus;
    if (averageViews) metadata.averageViews = parseInt(averageViews);
    if (totalVideos) metadata.totalVideos = parseInt(totalVideos);
    if (tweetsCount) metadata.tweetsCount = parseInt(tweetsCount);
    if (totalLikes) metadata.totalLikes = parseInt(totalLikes);
    if (accountAge) metadata.accountAge = accountAge;
    if (accountType) metadata.accountType = accountType;
    if (monthlyReach) metadata.monthlyReach = parseInt(monthlyReach);
    
    const result = await createListing({
      platform,
      account_name: accountName,
      followers_count: parseInt(followersCount),
      description,
      price_usdc: parseFloat(priceUsdc),
      verification_proof: accountLink,
      screenshot_urls: screenshotUrls,
      metadata
    });

    if (result) {
      setOpen(false);
      setAccountName("");
      setFollowersCount("");
      setDescription("");
      setPriceUsdc("");
      setAccountLink("");
      setLinkValidation(null);
      setScreenshotFiles([]);
      setScreenshotPreviews([]);
      setNiche("");
      setIsVerified(false);
      setEngagementRate("");
      setMonetizationStatus("");
      setAverageViews("");
      setTotalVideos("");
      setTweetsCount("");
      setTotalLikes("");
      setAccountAge("");
      setAccountType("");
      setMonthlyReach("");
      onSuccess?.();
    }
    setUploading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-glow">
          <Plus className="w-4 h-4" />
          List Account
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>List Social Media Account for Sale</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="platform">Platform</Label>
            <Select value={platform} onValueChange={(value) => setPlatform(value as SocialMediaPlatform)}>
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="telegram">Telegram</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="twitter">Twitter/X</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountLink">
              Account Link <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="accountLink"
                value={accountLink}
                onChange={(e) => setAccountLink(e.target.value)}
                placeholder={`Enter your ${platform} account URL`}
                required
                disabled={isFetchingData}
                className={linkValidation ? (linkValidation.isValid ? 'border-green-500' : 'border-destructive') : ''}
              />
              {isFetchingData ? (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : linkValidation && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {linkValidation.isValid ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-destructive" />
                  )}
                </div>
              )}
            </div>
            {isFetchingData && (
              <p className="text-xs text-primary">Fetching account data...</p>
            )}
            {!isFetchingData && linkValidation && (
              <p className={`text-xs ${linkValidation.isValid ? 'text-green-500' : 'text-destructive'}`}>
                {linkValidation.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountName">Account Name/Handle</Label>
            <Input
              id="accountName"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="@username or account name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="followersCount">
              {platform === 'youtube' ? 'Subscribers Count' : 
               platform === 'telegram' ? 'Members Count' : 
               platform === 'facebook' && accountType === 'Group' ? 'Members Count' : 
               'Followers Count'}
            </Label>
            <Input
              id="followersCount"
              type="number"
              value={followersCount}
              onChange={(e) => setFollowersCount(e.target.value)}
              placeholder="e.g., 10000"
              required
            />
          </div>

          {/* Platform-specific fields */}
          {(platform === 'facebook' || platform === 'telegram') && (
            <div className="space-y-2">
              <Label htmlFor="accountType">Account Type</Label>
              <Select value={accountType} onValueChange={setAccountType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {platform === 'facebook' ? (
                    <>
                      <SelectItem value="Page">Page</SelectItem>
                      <SelectItem value="Group">Group</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="Channel">Channel</SelectItem>
                      <SelectItem value="Group">Group</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {(platform === 'youtube' || platform === 'instagram' || platform === 'tiktok' || platform === 'telegram' || platform === 'facebook') && (
            <div className="space-y-2">
              <Label htmlFor="niche">Niche/Category</Label>
              <Input
                id="niche"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="e.g., Gaming, Fashion, Tech, Education"
              />
            </div>
          )}

          {(platform === 'instagram' || platform === 'twitter' || platform === 'tiktok' || platform === 'facebook') && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isVerified"
                checked={isVerified}
                onChange={(e) => setIsVerified(e.target.checked)}
                className="w-4 h-4 rounded border-input"
              />
              <Label htmlFor="isVerified" className="cursor-pointer">
                Verified Account
              </Label>
            </div>
          )}

          {(platform === 'instagram' || platform === 'twitter' || platform === 'telegram') && (
            <div className="space-y-2">
              <Label htmlFor="engagementRate">Engagement Rate (%)</Label>
              <Input
                id="engagementRate"
                value={engagementRate}
                onChange={(e) => setEngagementRate(e.target.value)}
                placeholder="e.g., 5.2"
              />
            </div>
          )}

          {platform === 'youtube' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="totalVideos">Total Videos</Label>
                <Input
                  id="totalVideos"
                  type="number"
                  value={totalVideos}
                  onChange={(e) => setTotalVideos(e.target.value)}
                  placeholder="e.g., 150"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="averageViews">Average Views per Video</Label>
                <Input
                  id="averageViews"
                  type="number"
                  value={averageViews}
                  onChange={(e) => setAverageViews(e.target.value)}
                  placeholder="e.g., 50000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monetizationStatus">Monetization Status</Label>
                <Select value={monetizationStatus} onValueChange={setMonetizationStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Monetized">Monetized</SelectItem>
                    <SelectItem value="Not Monetized">Not Monetized</SelectItem>
                    <SelectItem value="Eligible">Eligible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {(platform === 'tiktok' || platform === 'telegram') && (
            <div className="space-y-2">
              <Label htmlFor="averageViews">Average Views per Post</Label>
              <Input
                id="averageViews"
                type="number"
                value={averageViews}
                onChange={(e) => setAverageViews(e.target.value)}
                placeholder="e.g., 25000"
              />
            </div>
          )}

          {platform === 'tiktok' && (
            <div className="space-y-2">
              <Label htmlFor="totalLikes">Total Likes</Label>
              <Input
                id="totalLikes"
                type="number"
                value={totalLikes}
                onChange={(e) => setTotalLikes(e.target.value)}
                placeholder="e.g., 500000"
              />
            </div>
          )}

          {platform === 'twitter' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="tweetsCount">Total Tweets</Label>
                <Input
                  id="tweetsCount"
                  type="number"
                  value={tweetsCount}
                  onChange={(e) => setTweetsCount(e.target.value)}
                  placeholder="e.g., 2500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountAge">Account Age</Label>
                <Input
                  id="accountAge"
                  value={accountAge}
                  onChange={(e) => setAccountAge(e.target.value)}
                  placeholder="e.g., 3 years"
                />
              </div>
            </>
          )}

          {platform === 'facebook' && (
            <div className="space-y-2">
              <Label htmlFor="monthlyReach">Monthly Reach</Label>
              <Input
                id="monthlyReach"
                type="number"
                value={monthlyReach}
                onChange={(e) => setMonthlyReach(e.target.value)}
                placeholder="e.g., 100000"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your account, target audience, posting frequency, etc."
              className="min-h-[100px]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priceUsdc">Price (USDC)</Label>
            <Input
              id="priceUsdc"
              type="number"
              step="0.01"
              value={priceUsdc}
              onChange={(e) => setPriceUsdc(e.target.value)}
              placeholder="e.g., 500"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="screenshot">Account Screenshots (Optional - Multiple)</Label>
            <div className="flex flex-col gap-3">
              {screenshotPreviews.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {screenshotPreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img 
                        src={preview} 
                        alt={`Screenshot ${index + 1}`} 
                        className="w-full h-32 object-cover rounded-lg border border-primary/20"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={() => removeScreenshot(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-2 border-dashed border-primary/20 rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <Label htmlFor="screenshot-upload" className="cursor-pointer text-sm text-muted-foreground hover:text-primary">
                  Click to upload screenshots (multiple)
                </Label>
                <Input
                  id="screenshot-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleScreenshotChange}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Upload screenshots of your account (Max 5MB each). First image will be shown as thumbnail.
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || uploading}>
              {uploading ? "Uploading..." : loading ? "Creating..." : "List Account"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
