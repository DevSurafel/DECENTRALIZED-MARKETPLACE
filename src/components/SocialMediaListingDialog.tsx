import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSocialMedia, SocialMediaPlatform } from "@/hooks/useSocialMedia";
import { Plus, Upload, X, CheckCircle2, AlertCircle, Sparkles, Shield, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface SocialMediaListingDialogProps {
  onSuccess?: () => void;
}

const SCRAPER_API_URL = "https://youtube-scraper-api-5nft.onrender.com/api/scrape";

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
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<{ verified: boolean; message: string } | null>(null);
  const [hasVerified, setHasVerified] = useState(false);
  const [profileImage, setProfileImage] = useState("");

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

  const inputRef = useRef<HTMLInputElement>(null);
  const prevLinkRef = useRef<string>("");

  // Reset all scraped data when platform changes or dialog opens
  useEffect(() => {
    const code = `VERIFY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setVerificationCode(code);
    resetScrapedData();
  }, [platform, open]);

  const resetScrapedData = () => {
    setAccountName("");
    setFollowersCount("");
    setProfileImage("");
    setDescription("");
    setLinkValidation(null);
    setVerificationStatus(null);
    setHasVerified(false);
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
  };

  // Clear data when URL changes
  useEffect(() => {
    if (accountLink !== prevLinkRef.current) {
      prevLinkRef.current = accountLink;
      if (accountLink.trim() === "") {
        resetScrapedData();
      } else {
        setLinkValidation({ isValid: false, message: "Enter full URL and click outside to load data" });
      }
    }
  }, [accountLink]);

  const validateAndScrapeAccount = async (url: string) => {
    if (!url.trim()) return;

    setIsFetchingData(true);
    setLinkValidation({ isValid: false, message: "Fetching account data..." });

    try {
      const response = await fetch(SCRAPER_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), verificationCode })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setLinkValidation({ isValid: false, message: data.error || "Could not fetch account" });
        setIsFetchingData(false);
        return;
      }

      const displayName = data.name || data.username || "";
      setAccountName(displayName);

      const bioText = data.bio || data.description || "";
      if (bioText && !description) setDescription(bioText);

      let followers = 0;
      if (data.follower_count_exact) followers = parseInt(data.follower_count_exact);
      else if (data.member_count_exact) followers = parseInt(data.member_count_exact);
      else if (data.subscriber_count_exact) followers = parseInt(data.subscriber_count_exact);
      else if (data.count_exact) followers = parseInt(data.count_exact);

      if (followers > 0) setFollowersCount(followers.toString());
      
      // Handle profile image - ensure full URL for Twitter proxied images
      if (data.profile_image) {
        let imageUrl = data.profile_image;
        
        // If it's a relative proxy URL, prepend the backend base URL
        if (imageUrl.startsWith('/api/proxy-image')) {
          const backendBase = new URL(SCRAPER_API_URL).origin;
          imageUrl = `${backendBase}${imageUrl}`;
          console.log('[Avatar] Converted relative proxy URL to:', imageUrl);
        }
        
        setProfileImage(imageUrl);
      }
      
      if (data.video_count) setTotalVideos(data.video_count.toString());
      if (data.tweet_count) setTweetsCount(data.tweet_count);
      if (data.likes_count) setTotalLikes(data.likes_count);
      if (data.isVerified !== undefined) setIsVerified(data.isVerified);
      if (data.type) setAccountType(data.type);

      const codeFound = bioText.toUpperCase().includes(verificationCode.toUpperCase());

      if (codeFound) {
        setVerificationStatus({ verified: true, message: "Verification code found!" });
        setHasVerified(true);
        setLinkValidation({ isValid: true, message: "Account verified & loaded" });
        toast({ title: "Verified", description: "All data loaded successfully" });
      } else {
        setVerificationStatus({ verified: false, message: `Add "${verificationCode}" to bio & click Verify` });
        setHasVerified(false);
        setLinkValidation({ isValid: true, message: "Account found – verify ownership" });
        toast({ title: "Verify Required", description: `Add code to bio`, variant: "destructive" });
      }
    } catch (error) {
      setLinkValidation({ isValid: false, message: "Failed to load account" });
      toast({ title: "Error", description: "Try again", variant: "destructive" });
    } finally {
      setIsFetchingData(false);
    }
  };

  const handleBlur = () => {
    if (accountLink.trim() && !linkValidation?.isValid) {
      validateAndScrapeAccount(accountLink);
    }
  };

  const handleManualVerify = () => {
    if (!accountLink.trim()) {
      toast({ title: "Missing link", description: "Enter account URL first", variant: "destructive" });
      return;
    }
    validateAndScrapeAccount(accountLink);
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const validFiles: File[] = [];
    const previews: string[] = [];

    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Too large", description: `${file.name} < 5MB`, variant: "destructive" });
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

  const removeScreenshot = (i: number) => {
    setScreenshotFiles(prev => prev.filter((_, idx) => idx !== i));
    setScreenshotPreviews(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkValidation?.isValid || !hasVerified) {
      toast({ title: "Verify First", description: `Add "${verificationCode}" to bio`, variant: "destructive" });
      return;
    }

    setUploading(true);
    const screenshotUrls: string[] = [];

    if (screenshotFiles.length > 0) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not logged in");

        for (const file of screenshotFiles) {
          const fileExt = file.name.split('.').pop() || 'jpg';
          const fileName = `${Math.random().toString(36)}.${fileExt}`;
          const filePath = `screenshots/${fileName}`;

          const { error } = await supabase.storage
            .from('social-media-screenshots')
            .upload(filePath, file);

          if (error) throw error;

          const { data: { publicUrl } } = supabase.storage
            .from('social-media-screenshots')
            .getPublicUrl(filePath);

          screenshotUrls.push(publicUrl);
        }
      } catch (err) {
        toast({ title: "Upload failed", description: "Try again", variant: "destructive" });
        setUploading(false);
        return;
      }
    }

    const metadata: Record<string, any> = {
      niche: niche || undefined,
      isVerified: isVerified || undefined,
      engagementRate: engagementRate || undefined,
      monetizationStatus: monetizationStatus || undefined,
      averageViews: averageViews ? parseInt(averageViews) : undefined,
      totalVideos: totalVideos ? parseInt(totalVideos) : undefined,
      tweetsCount: tweetsCount ? parseInt(tweetsCount) : undefined,
      totalLikes: totalLikes ? parseInt(totalLikes) : undefined,
      accountAge: accountAge || undefined,
      accountType: accountType || undefined,
      monthlyReach: monthlyReach ? parseInt(monthlyReach) : undefined,
      profileImage: profileImage || undefined,
    };

    const result = await createListing({
      platform,
      account_name: accountName.trim(),
      followers_count: parseInt(followersCount) || 0,
      description: description.trim(),
      price_usdc: parseFloat(priceUsdc),
      verification_proof: accountLink,
      screenshot_urls: screenshotUrls,
      metadata
    });

    if (result) {
      setOpen(false);
      onSuccess?.();
      toast({ title: "Listed!", description: "Your account is live" });
    }
    setUploading(false);
  };

  const getPlatformPlaceholder = () => {
    switch(platform) {
      case 'youtube': return 'https://youtube.com/@channel or UC...';
      case 'twitter': return 'https://twitter.com/username or @username';
      case 'instagram': return 'https://instagram.com/username or @username';
      case 'tiktok': return 'https://tiktok.com/@username';
      case 'facebook': return 'https://facebook.com/pagename or group';
      case 'telegram': return '@username or -1001234567890';
      default: return 'Enter account URL or @username';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="relative overflow-hidden group gap-1.5 bg-gradient-to-r from-primary to-secondary hover:shadow-lg transition-all text-xs sm:text-sm h-8 sm:h-9 px-3 sm:px-4">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span className="font-semibold">List Account</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-[96vw] sm:max-w-[550px] max-h-[92vh] overflow-hidden p-0 gap-0 bg-gradient-to-br from-background to-primary/5 border border-primary/20 shadow-2xl">
        <DialogHeader className="px-3 sm:px-4 py-2.5 bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-primary/20">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-primary to-secondary rounded-lg shadow-lg">
              <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-sm sm:text-base font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                List Social Media Account
              </DialogTitle>
              <p className="text-[10px] text-muted-foreground">Enter URL → Click outside → Auto-load</p>
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(92vh-110px)] px-3 sm:px-4 py-3">
          <div className="space-y-2.5">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Platform</Label>
              <Select value={platform} onValueChange={(v) => setPlatform(v as SocialMediaPlatform)}>
                <SelectTrigger className="h-8 text-xs bg-background/60 border-2 border-primary/20 rounded-lg">
                  <SelectValue />
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

            <Alert className="bg-blue-500/10 border-blue-500/30 p-2">
              <Shield className="h-3 w-3 text-blue-500" />
              <AlertDescription className="text-[10px] sm:text-xs space-y-1.5">
                <div><strong>Verify:</strong> Add this code to your bio:</div>
                <div className="p-2 bg-background/90 rounded font-mono text-xs font-bold text-center border border-blue-500/30 select-all">
                  {verificationCode}
                </div>
                {verificationStatus && (
                  <div className={`p-1.5 rounded flex items-center gap-1 text-[10px] ${
                    verificationStatus.verified ? 'bg-green-500/15 text-green-600' : 'bg-yellow-500/15 text-yellow-600'
                  }`}>
                    {verificationStatus.verified ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    <span>{verificationStatus.message}</span>
                  </div>
                )}
              </AlertDescription>
            </Alert>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Account Link / @Username <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  ref={inputRef}
                  value={accountLink}
                  onChange={(e) => setAccountLink(e.target.value)}
                  onBlur={handleBlur}
                  placeholder={getPlatformPlaceholder()}
                  className={`h-8 text-xs pr-8 rounded-lg ${
                    linkValidation
                      ? linkValidation.isValid ? 'border-green-500' : 'border-destructive'
                      : 'border-primary/20'
                  }`}
                  disabled={isFetchingData}
                />
                {isFetchingData ? (
                  <Loader2 className="absolute right-2 top-2 w-4 h-4 text-primary animate-spin" />
                ) : linkValidation && (
                  <div className="absolute right-2 top-2">
                    {linkValidation.isValid ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                )}
              </div>
              {linkValidation && (
                <p className={`text-[10px] ${linkValidation.isValid ? 'text-green-600' : 'text-destructive'}`}>
                  {linkValidation.message}
                </p>
              )}

              {linkValidation?.isValid && !verificationStatus?.verified && (
                <Button
                  onClick={handleManualVerify}
                  disabled={isFetchingData}
                  className="w-full h-8 text-xs rounded-lg bg-gradient-to-r from-primary to-secondary"
                >
                  {isFetchingData ? (
                    <>Fetching...</>
                  ) : (
                    <>
                      <Shield className="w-3 h-3 mr-1" />
                      Verify Account
                    </>
                  )}
                </Button>
              )}

              {verificationStatus?.verified && (
                <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded-lg border border-green-500/30">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-green-700 font-medium">Verified</span>
                </div>
              )}
            </div>

            {/* Profile Preview */}
            {(profileImage || accountName) && (
              <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                {profileImage ? (
                  <img 
                    src={profileImage} 
                    alt={accountName} 
                    className="w-12 h-12 rounded-full object-cover border-2 border-primary/30"
                    onError={(e) => {
                      console.error('[Avatar] Failed to load image:', profileImage);
                      // Fallback to letter avatar on error
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                {(!profileImage || profileImage.includes('error')) && (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm">
                    {accountName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{accountName || "Loading..."}</p>
                  <p className="text-xs text-muted-foreground">
                    {followersCount ? `${parseInt(followersCount).toLocaleString()} ${
                      platform === 'youtube' ? 'subscribers' :
                      platform === 'telegram' ? 'members' : 'followers'
                    }` : '—'}
                  </p>
                </div>
              </div>
            )}

            {/* Form Fields - Rest of the form remains the same */}
            <div className="grid grid-cols-2 gap-2">
              {(platform === 'facebook' || platform === 'telegram') && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Type</Label>
                  <Select value={accountType} onValueChange={setAccountType}>
                    <SelectTrigger className="h-8 text-xs rounded-lg"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {platform === 'facebook' ? (
                        <> <SelectItem value="Page">Page</SelectItem> <SelectItem value="Group">Group</SelectItem> </>
                      ) : (
                        <> <SelectItem value="Channel">Channel</SelectItem> <SelectItem value="Group">Group</SelectItem> <SelectItem value="Supergroup">Supergroup</SelectItem> </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {['youtube', 'instagram', 'tiktok', 'telegram', 'facebook'].includes(platform) && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Niche</Label>
                  <Input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="Gaming, Tech" className="h-8 text-xs rounded-lg" />
                </div>
              )}
              {['instagram', 'twitter', 'telegram'].includes(platform) && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Engagement %</Label>
                  <Input value={engagementRate} onChange={(e) => setEngagementRate(e.target.value)} placeholder="5.2" className="h-8 text-xs rounded-lg" />
                </div>
              )}
              {platform === 'youtube' && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Videos</Label>
                    <Input type="number" value={totalVideos} onChange={(e) => setTotalVideos(e.target.value)} placeholder="Auto" className="h-8 text-xs rounded-lg" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Avg Views</Label>
                    <Input type="number" value={averageViews} onChange={(e) => setAverageViews(e.target.value)} placeholder="50000" className="h-8 text-xs rounded-lg" />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs font-semibold">Monetization</Label>
                    <Select value={monetizationStatus} onValueChange={setMonetizationStatus}>
                      <SelectTrigger className="h-8 text-xs rounded-lg">
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
              {platform === 'tiktok' && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Avg Views</Label>
                    <Input type="number" value={averageViews} onChange={(e) => setAverageViews(e.target.value)} placeholder="25000" className="h-8 text-xs rounded-lg" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Total Likes</Label>
                    <Input type="number" value={totalLikes} onChange={(e) => setTotalLikes(e.target.value)} placeholder="Auto" className="h-8 text-xs rounded-lg" />
                  </div>
                </>
              )}
              {platform === 'twitter' && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Tweets</Label>
                    <Input type="number" value={tweetsCount} onChange={(e) => setTweetsCount(e.target.value)} placeholder="Auto" className="h-8 text-xs rounded-lg" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Age</Label>
                    <Input value={accountAge} onChange={(e) => setAccountAge(e.target.value)} placeholder="3 years" className="h-8 text-xs rounded-lg" />
                  </div>
                </>
              )}
              {platform === 'facebook' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Monthly Reach</Label>
                  <Input type="number" value={monthlyReach} onChange={(e) => setMonthlyReach(e.target.value)} placeholder="100000" className="h-8 text-xs rounded-lg" />
                </div>
              )}
            </div>

            {['instagram', 'twitter', 'tiktok', 'facebook'].includes(platform) && (
              <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg">
                <input 
                  type="checkbox" 
                  id="isVerified" 
                  checked={isVerified} 
                  onChange={(e) => setIsVerified(e.target.checked)} 
                  className="w-3.5 h-3.5" 
                />
                <Label htmlFor="isVerified" className="text-xs cursor-pointer">
                  Verified Account (Blue Check)
                </Label>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your account..."
                className="min-h-[60px] text-xs rounded-lg resize-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Price (USDC)</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  value={priceUsdc}
                  onChange={(e) => setPriceUsdc(e.target.value)}
                  placeholder="500.00"
                  required
                  className="h-8 text-xs pl-6 rounded-lg"
                />
                <span className="absolute left-2 top-2 text-xs text-muted-foreground">$</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Screenshots (Optional)</Label>
              {screenshotPreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {screenshotPreviews.map((preview, idx) => (
                    <div key={idx} className="relative group">
                      <img src={preview} alt={`Screenshot ${idx + 1}`} className="w-full h-16 object-cover rounded border" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-0.5 right-0.5 h-5 w-5 opacity-0 group-hover:opacity-100"
                        onClick={() => removeScreenshot(idx)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-2 border-dashed border-primary/20 rounded-lg p-3 text-center hover:border-primary/40 hover:bg-primary/5 transition-all">
                <Upload className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                <Label htmlFor="screenshot-upload" className="cursor-pointer text-[10px] text-muted-foreground">
                  Upload screenshots
                </Label>
                <Input id="screenshot-upload" type="file" accept="image/*" multiple className="hidden" onChange={handleScreenshotChange} />
              </div>
            </div>
          </div>
        </div>

        <div className="px-3 sm:px-4 py-2 bg-muted/30 border-t flex flex-col-reverse sm:flex-row justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} className="h-8 px-4 text-xs rounded-lg">Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || uploading || !linkValidation?.isValid || !verificationStatus?.verified}
            className="h-8 px-6 text-xs bg-gradient-to-r from-primary to-secondary rounded-lg relative overflow-hidden group"
          >
            {uploading ? "Uploading..." : loading ? "Creating..." : "List Account"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
