import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSocialMedia, SocialMediaPlatform } from "@/hooks/useSocialMedia";
import { Plus, Upload, X, CheckCircle2, AlertCircle, Info, Sparkles, Shield, Loader2 } from "lucide-react";
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
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<{ verified: boolean; message: string } | null>(null);
  const [hasVerified, setHasVerified] = useState(false);
  
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

  useEffect(() => {
    if (open) {
      const code = `VERIFY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      setVerificationCode(code);
      setVerificationStatus(null);
    }
  }, [open]);

  useEffect(() => {
    const code = `VERIFY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setVerificationCode(code);
    setVerificationStatus(null);
    setHasVerified(false);
    setAccountLink("");
    setLinkValidation(null);
  }, [platform]);

  const validateTelegramIdentifier = (identifier: string): { isValid: boolean; message: string } => {
    const trimmed = identifier.trim();
    if (!trimmed) return { isValid: false, message: 'Please enter a username or channel ID' };
    const isUsername = /^@?[a-zA-Z0-9_]{5,}$/.test(trimmed);
    const isChannelId = /^-100\d{10,}$/.test(trimmed);
    const hasAtSymbol = trimmed.startsWith('@');
    if (isChannelId) return { isValid: true, message: 'Valid private channel ID' };
    if (isUsername) return { isValid: true, message: hasAtSymbol ? 'Valid username with @' : 'Valid username (@ will be added)' };
    if (/\s/.test(trimmed) || trimmed.length < 5) {
      return { isValid: false, message: 'This looks like a display name. Please provide the actual @username or channel ID instead.' };
    }
    return { isValid: false, message: 'Invalid format. Use @username (5+ chars) or -100123456789 (private channel ID)' };
  };

  const handleManualVerify = async () => {
    if (!accountLink) {
      toast({ title: "Account link required", description: "Please enter your account link/username first", variant: "destructive" });
      return;
    }
    setIsVerifying(true);
    try {
      await fetchAccountData();
      setHasVerified(true);
    } catch (error) {
      console.error("Verification error:", error);
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    if (!accountLink) {
      setLinkValidation(null);
      return;
    }
    const validateLink = async () => {
      if (platform === 'telegram') {
        const telegramValidation = validateTelegramIdentifier(accountLink);
        setLinkValidation(telegramValidation);
        if (telegramValidation.isValid) {
          let cleanedName = accountLink.trim();
          if (!cleanedName.startsWith('@') && !cleanedName.startsWith('-')) {
            cleanedName = '@' + cleanedName;
          }
          setAccountName(cleanedName);
        }
        return;
      }
      const validationResult = validateSocialMediaURL(accountLink, platform);
      if (validationResult.isValid) {
        setLinkValidation({ isValid: true, message: 'Valid URL format - Click "Verify Account" to check ownership' });
      } else {
        setLinkValidation({ isValid: false, message: validationResult.errorMessage || 'Invalid URL format' });
      }
    };
    const timeoutId = setTimeout(() => { validateLink(); }, 500);
    return () => clearTimeout(timeoutId);
  }, [accountLink, platform]);

  const fetchAccountData = async () => {
    if (!accountLink) return;
    setIsFetchingData(true);
    try {
      let cleanedLink = accountLink.trim();
      if (platform === 'telegram') {
        if (!cleanedLink.startsWith('@') && !cleanedLink.startsWith('-')) {
          cleanedLink = '@' + cleanedLink;
        }
      }
      const { data, error } = await supabase.functions.invoke('fetch-social-media-data', {
        body: { url: cleanedLink, platform, verificationCode }
      });
      if (error) throw error;
      if (data?.success && data?.data) {
        if (data.data.accountName) setAccountName(data.data.accountName);
        if (data.data.followers !== undefined) setFollowersCount(data.data.followers.toString());
        if (data.data.isVerified !== undefined) setIsVerified(data.data.isVerified);
        if (data.data.videoCount !== undefined && platform === 'youtube') setTotalVideos(data.data.videoCount.toString());
        if (data.data.verificationCodeFound) {
          setVerificationStatus({ verified: true, message: platform === 'telegram' ? 'Verification code found in channel/group description!' : 'Verification code found in account bio/description!' });
          toast({ title: "✓ Account verified", description: "Fields auto-filled with account information" });
        } else {
          const allowManualVerification = ['twitter', 'facebook'].includes(platform);
          if (allowManualVerification && data.data.accountExists) {
            setVerificationStatus({ verified: true, message: `Account found. Due to ${platform} anti-scraping measures, please upload screenshots showing the verification code in your bio.` });
            toast({ title: "⚠ Manual verification required", description: `Please upload screenshots showing "${verificationCode}" in your account bio` });
          } else {
            setVerificationStatus({ verified: false, message: platform === 'telegram' ? 'Verification code not found. Please add it to your channel/group description.' : 'Verification code not found. Please add it to your account bio/description.' });
            toast({ title: "⚠ Verification code not found", description: platform === 'telegram' ? "Please add the code to your Telegram channel/group description and try again" : "Please add the code to your account bio/description and try again", variant: "destructive" });
          }
        }
      } else if (data?.error) {
        toast({ title: "Could not fetch data", description: data.error, variant: "destructive" });
        setVerificationStatus({ verified: false, message: data.error });
      }
    } catch (error) {
      console.error("Error fetching account data:", error);
      toast({ title: "Verification failed", description: "Could not verify account. Please try again.", variant: "destructive" });
    } finally {
      setIsFetchingData(false);
    }
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const validFiles: File[] = [];
    const previews: string[] = [];
    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: `${file.name} must be less than 5MB`, variant: "destructive" });
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
    if (!linkValidation?.isValid) {
      toast({ title: "Invalid account identifier", description: platform === 'telegram' ? "Please provide a valid @username or -100... channel ID" : "Please provide a valid account link before submitting", variant: "destructive" });
      return;
    }
    if (platform === 'telegram') {
      if (!hasVerified) {
        toast({ title: "Verification Required", description: "Please click the 'Verify Account' button to verify ownership before listing", variant: "destructive" });
        return;
      }
      if (!verificationStatus?.verified) {
        toast({ title: "Verification Failed", description: `Verification code not found. Please add "${verificationCode}" to your channel/group description and verify again.`, variant: "destructive" });
        return;
      }
    }
    setUploading(true);
    const screenshotUrls: string[] = [];
    if (screenshotFiles.length > 0) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");
        for (const file of screenshotFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const filePath = `screenshots/${fileName}`;
          const { error: uploadError } = await supabase.storage.from('social-media-screenshots').upload(filePath, file);
          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage.from('social-media-screenshots').getPublicUrl(filePath);
          screenshotUrls.push(publicUrl);
        }
      } catch (error) {
        console.error('Error uploading screenshots:', error);
        toast({ title: "Upload failed", description: error instanceof Error ? error.message : "Failed to upload screenshots. Please try again.", variant: "destructive" });
        setUploading(false);
        return;
      }
    }
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
    let finalAccountName = accountName.trim();
    if (platform === 'telegram') {
      if (!finalAccountName.startsWith('@') && !finalAccountName.startsWith('-')) {
        finalAccountName = '@' + finalAccountName;
      }
    }
    const result = await createListing({
      platform, account_name: finalAccountName, followers_count: parseInt(followersCount), description, price_usdc: parseFloat(priceUsdc), verification_proof: accountLink, screenshot_urls: screenshotUrls, metadata
    });
    if (result) {
      setOpen(false);
      setAccountName(""); setFollowersCount(""); setDescription(""); setPriceUsdc(""); setAccountLink(""); setLinkValidation(null); setScreenshotFiles([]); setScreenshotPreviews([]);
      setNiche(""); setIsVerified(false); setEngagementRate(""); setMonetizationStatus(""); setAverageViews(""); setTotalVideos(""); setTweetsCount(""); setTotalLikes(""); setAccountAge(""); setAccountType(""); setMonthlyReach("");
      onSuccess?.();
    }
    setUploading(false);
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
              <p className="text-[10px] text-muted-foreground">List your account on marketplace</p>
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(92vh-110px)] px-3 sm:px-4 py-3">
          <div className="space-y-2.5">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Platform</Label>
              <Select value={platform} onValueChange={(value) => setPlatform(value as SocialMediaPlatform)}>
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

            {platform === 'telegram' && (
              <>
                <Alert className="bg-blue-500/10 border-blue-500/30 p-2">
                  <Shield className="h-3 w-3 text-blue-500" />
                  <AlertDescription className="text-[10px] sm:text-xs space-y-1.5">
                    <div><strong>Verification:</strong> Add this code to your channel description:</div>
                    <div className="p-2 bg-background/90 rounded font-mono text-xs font-bold text-center border border-blue-500/30">
                      {verificationCode}
                    </div>
                    {verificationStatus && (
                      <div className={`p-1.5 rounded flex items-center gap-1 text-[10px] ${verificationStatus.verified ? 'bg-green-500/15 text-green-600' : 'bg-yellow-500/15 text-yellow-600'}`}>
                        {verificationStatus.verified ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        <span>{verificationStatus.message}</span>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
                <Alert className="bg-primary/10 border-primary/30 p-2">
                  <Info className="h-3 w-3 text-primary" />
                  <AlertDescription className="text-[10px]">
                    <strong>Format:</strong> @username or -1001234567890
                  </AlertDescription>
                </Alert>
              </>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                {platform === 'telegram' ? 'Username/ID' : 'Account Link'}<span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  value={accountLink}
                  onChange={(e) => setAccountLink(e.target.value)}
                  placeholder={platform === 'telegram' ? '@channel or -100...' : 'Account URL'}
                  required
                  disabled={isFetchingData}
                  className={`h-8 text-xs pr-8 rounded-lg ${linkValidation ? (linkValidation.isValid ? 'border-green-500' : 'border-destructive') : 'border-primary/20'}`}
                />
                {isFetchingData ? (
                  <Loader2 className="absolute right-2 top-2 w-4 h-4 text-primary animate-spin" />
                ) : linkValidation && (
                  <div className="absolute right-2 top-2">
                    {linkValidation.isValid ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-destructive" />}
                  </div>
                )}
              </div>
              {linkValidation && (
                <p className={`text-[10px] ${linkValidation.isValid ? 'text-green-600' : 'text-destructive'}`}>
                  {linkValidation.message}
                </p>
              )}
              {platform === 'telegram' && linkValidation?.isValid && (
                <Button
                  type="button"
                  onClick={handleManualVerify}
                  disabled={isVerifying}
                  className={`w-full h-8 text-xs rounded-lg ${verificationStatus?.verified ? 'bg-green-500' : 'bg-gradient-to-r from-primary to-secondary'}`}
                >
                  {isVerifying ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Verifying...</> : verificationStatus?.verified ? <><CheckCircle2 className="w-3 h-3 mr-1" />Verified</> : <><Shield className="w-3 h-3 mr-1" />Verify</>}
                </Button>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Account Name</Label>
              <Input
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="@username"
                required
                disabled={platform === 'telegram' && !!accountLink}
                className="h-8 text-xs rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                {platform === 'youtube' ? 'Subscribers' : platform === 'telegram' ? 'Members' : 'Followers'}
              </Label>
              <Input
                type="number"
                value={followersCount}
                onChange={(e) => setFollowersCount(e.target.value)}
                placeholder="10000"
                required
                className="h-8 text-xs rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(platform === 'facebook' || platform === 'telegram') && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Type</Label>
                  <Select value={accountType} onValueChange={setAccountType}>
                    <SelectTrigger className="h-8 text-xs rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {platform === 'facebook' ? (
                        <><SelectItem value="Page">Page</SelectItem><SelectItem value="Group">Group</SelectItem></>
                      ) : (
                        <><SelectItem value="Channel">Channel</SelectItem><SelectItem value="Group">Group</SelectItem></>
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
                    <Input type="number" value={totalVideos} onChange={(e) => setTotalVideos(e.target.value)} placeholder="150" className="h-8 text-xs rounded-lg" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Avg Views</Label>
                    <Input type="number" value={averageViews} onChange={(e) => setAverageViews(e.target.value)} placeholder="50000" className="h-8 text-xs rounded-lg" />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs font-semibold">Monetization</Label>
                    <Select value={monetizationStatus} onValueChange={setMonetizationStatus}>
                      <SelectTrigger className="h-8 text-xs rounded-lg">
                        <SelectValue />
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
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Avg Views</Label>
                  <Input type="number" value={averageViews} onChange={(e) => setAverageViews(e.target.value)} placeholder="25000" className="h-8 text-xs rounded-lg" />
                </div>
              )}
              {platform === 'tiktok' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Total Likes</Label>
                  <Input type="number" value={totalLikes} onChange={(e) => setTotalLikes(e.target.value)} placeholder="500000" className="h-8 text-xs rounded-lg" />
                </div>
              )}
              {platform === 'twitter' && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Tweets</Label>
                    <Input type="number" value={tweetsCount} onChange={(e) => setTweetsCount(e.target.value)} placeholder="2500" className="h-8 text-xs rounded-lg" />
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
                <input type="checkbox" id="isVerified" checked={isVerified} onChange={(e) => setIsVerified(e.target.checked)} className="w-3.5 h-3.5" />
                <Label htmlFor="isVerified" className="text-xs cursor-pointer">Verified Account</Label>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe account..."
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
              <Label className="text-xs font-semibold">Screenshots</Label>
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
          <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-8 px-4 text-xs rounded-lg">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || uploading || !linkValidation?.isValid || (platform === 'telegram' && !verificationStatus?.verified)}
            className="h-8 px-6 text-xs bg-gradient-to-r from-primary to-secondary rounded-lg relative overflow-hidden group"
          >
            {uploading ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Uploading...</> : loading ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Creating...</> : <><div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" /><span>List Account</span></>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
