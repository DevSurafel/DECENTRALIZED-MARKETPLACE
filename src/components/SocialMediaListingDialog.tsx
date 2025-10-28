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

  // Generate verification code when dialog opens
  useEffect(() => {
    if (open) {
      const code = `VERIFY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      setVerificationCode(code);
      setVerificationStatus(null);
    }
  }, [open]);

  // Generate NEW verification code whenever platform changes
  useEffect(() => {
    const code = `VERIFY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setVerificationCode(code);
    setVerificationStatus(null);
    setHasVerified(false);
    setAccountLink("");
    setLinkValidation(null);
  }, [platform]);

  // Validate Telegram username/ID format
  const validateTelegramIdentifier = (identifier: string): { isValid: boolean; message: string } => {
    const trimmed = identifier.trim();
    
    if (!trimmed) {
      return { isValid: false, message: 'Please enter a username or channel ID' };
    }

    const isUsername = /^@?[a-zA-Z0-9_]{5,}$/.test(trimmed);
    const isChannelId = /^-100\d{10,}$/.test(trimmed);
    const hasAtSymbol = trimmed.startsWith('@');
    
    if (isChannelId) {
      return { isValid: true, message: 'Valid private channel ID' };
    }
    
    if (isUsername) {
      return { isValid: true, message: hasAtSymbol ? 'Valid username with @' : 'Valid username (@ will be added)' };
    }
    
    if (/\s/.test(trimmed) || trimmed.length < 5) {
      return { 
        isValid: false, 
        message: 'This looks like a display name. Please provide the actual @username or channel ID instead.' 
      };
    }
    
    return { 
      isValid: false, 
      message: 'Invalid format. Use @username (5+ chars) or -100123456789 (private channel ID)' 
    };
  };

  // Manual verification function
  const handleManualVerify = async () => {
    if (!accountLink) {
      toast({
        title: "Account link required",
        description: "Please enter your account link/username first",
        variant: "destructive"
      });
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

  // Real-time link validation
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
        setLinkValidation({ 
          isValid: true, 
          message: 'Valid URL format - Click "Verify Account" to check ownership' 
        });
      } else {
        setLinkValidation({ 
          isValid: false, 
          message: validationResult.errorMessage || 'Invalid URL format' 
        });
      }
    };

    const timeoutId = setTimeout(() => {
      validateLink();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [accountLink, platform]);

  // Fetch account data function
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
          setVerificationStatus({ 
            verified: true, 
            message: platform === 'telegram' 
              ? 'Verification code found in channel/group description!' 
              : 'Verification code found in account bio/description!' 
          });
          toast({
            title: "✓ Account verified",
            description: "Fields auto-filled with account information",
          });
        } else {
          const allowManualVerification = ['twitter', 'facebook'].includes(platform);
          
          if (allowManualVerification && data.data.accountExists) {
            setVerificationStatus({ 
              verified: true, 
              message: `Account found. Due to ${platform} anti-scraping measures, please upload screenshots showing the verification code in your bio.`
            });
            toast({
              title: "⚠ Manual verification required",
              description: `Please upload screenshots showing "${verificationCode}" in your account bio`,
            });
          } else {
            setVerificationStatus({ 
              verified: false, 
              message: platform === 'telegram'
                ? 'Verification code not found. Please add it to your channel/group description.'
                : 'Verification code not found. Please add it to your account bio/description.'
            });
            toast({
              title: "⚠ Verification code not found",
              description: platform === 'telegram'
                ? "Please add the code to your Telegram channel/group description and try again"
                : "Please add the code to your account bio/description and try again",
              variant: "destructive"
            });
          }
        }
      } else if (data?.error) {
        toast({
          title: "Could not fetch data",
          description: data.error,
          variant: "destructive"
        });
        setVerificationStatus({ verified: false, message: data.error });
      }
    } catch (error) {
      console.error("Error fetching account data:", error);
      toast({
        title: "Verification failed",
        description: "Could not verify account. Please try again.",
        variant: "destructive"
      });
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
    
    if (!linkValidation?.isValid) {
      toast({
        title: "Invalid account identifier",
        description: platform === 'telegram' 
          ? "Please provide a valid @username or -100... channel ID" 
          : "Please provide a valid account link before submitting",
        variant: "destructive"
      });
      return;
    }

    if (platform === 'telegram') {
      if (!hasVerified) {
        toast({
          title: "Verification Required",
          description: "Please click the 'Verify Account' button to verify ownership before listing",
          variant: "destructive"
        });
        return;
      }
      
      if (!verificationStatus?.verified) {
        toast({
          title: "Verification Failed",
          description: `Verification code not found. Please add "${verificationCode}" to your channel/group description and verify again.`,
          variant: "destructive"
        });
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
          description: error instanceof Error ? error.message : "Failed to upload screenshots. Please try again.",
          variant: "destructive"
        });
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
      platform,
      account_name: finalAccountName,
      followers_count: parseInt(followersCount),
      description,
      price_usdc: parseFloat(priceUsdc),
      verification_proof: accountLink,
      screenshot_urls: screenshotUrls,
      metadata
    });

    if (result) {
      setOpen(false);
      // Reset all fields
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
        <Button className="relative overflow-hidden group gap-2 bg-gradient-to-r from-primary via-primary to-secondary hover:shadow-lg hover:shadow-primary/50 transition-all duration-300 text-sm md:text-base h-10 md:h-12 px-4 md:px-6">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          <Plus className="w-4 h-4" />
          <span className="font-semibold">List Account</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-[700px] max-h-[95vh] overflow-hidden p-0 gap-0 bg-gradient-to-br from-background via-background to-primary/5 border border-primary/20 shadow-2xl">
        {/* Header */}
        <DialogHeader className="px-4 sm:px-6 py-5 pb-4 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 border-b border-primary/20">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-gradient-to-br from-primary to-secondary rounded-xl shadow-lg">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
                List Social Media Account
              </DialogTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Fill in the details to list your account on the marketplace</p>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[calc(95vh-160px)] px-4 sm:px-6 py-5">
          <div className="space-y-5">
            {/* Platform Selection */}
            <div className="space-y-2.5">
              <Label htmlFor="platform" className="text-sm font-semibold">Platform</Label>
              <Select value={platform} onValueChange={(value) => setPlatform(value as SocialMediaPlatform)}>
                <SelectTrigger className="h-12 text-base bg-background/60 backdrop-blur-sm border-2 border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl">
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

            {/* Verification Alert - Only for Telegram */}
            {platform === 'telegram' && (
              <Alert className="bg-gradient-to-r from-blue-500/10 to-blue-400/5 border-blue-500/30 shadow-md">
                <Shield className="h-4 w-4 text-blue-500" />
                <AlertDescription className="text-sm space-y-3">
                  <div>
                    <strong className="text-blue-600">Verification Required:</strong> Add this code to your channel/group description:
                  </div>
                  <div className="p-3 bg-background/90 backdrop-blur-sm rounded-lg font-mono text-base font-bold text-center border-2 border-blue-500/30 shadow-inner">
                    {verificationCode}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    This code changes when you switch platforms. Add it to your Telegram description, then click "Verify Account".
                  </p>
                  {verificationStatus && (
                    <div className={`p-3 rounded-lg flex items-center gap-2 shadow-sm ${verificationStatus.verified ? 'bg-green-500/15 text-green-600 border border-green-500/30' : 'bg-yellow-500/15 text-yellow-600 border border-yellow-500/30'}`}>
                      {verificationStatus.verified ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                      <span className="text-xs font-medium">{verificationStatus.message}</span>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Telegram Instructions */}
            {platform === 'telegram' && (
              <Alert className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30 shadow-sm">
                <Info className="h-4 w-4 text-primary" />
                <AlertDescription className="text-xs sm:text-sm space-y-2">
                  <p><strong className="text-primary">For Telegram:</strong> Enter @username or -100... channel ID</p>
                  <p><strong className="text-primary">Example:</strong> @mychannel or -1001234567890</p>
                  <p><strong className="text-primary">Find ID:</strong> Channel Info → @userinfobot</p>
                </AlertDescription>
              </Alert>
            )}

            {/* Account Link/Username */}
            <div className="space-y-2.5">
              <Label htmlFor="accountLink" className="text-sm font-semibold">
                {platform === 'telegram' ? 'Channel/Group Username or ID' : 'Account Link'} 
                <span className="text-destructive ml-1">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="accountLink"
                  value={accountLink}
                  onChange={(e) => setAccountLink(e.target.value)}
                  placeholder={
                    platform === 'telegram' 
                      ? '@yourchannel or -1001234567890' 
                      : `Enter your ${platform} account URL`
                  }
                  required
                  disabled={isFetchingData}
                  className={`h-12 text-base bg-background/60 backdrop-blur-sm border-2 pr-10 rounded-xl transition-all duration-200 ${
                    linkValidation 
                      ? linkValidation.isValid 
                        ? 'border-green-500 focus:border-green-500 focus:ring-2 focus:ring-green-500/20' 
                        : 'border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20'
                      : 'border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20'
                  }`}
                />
                {isFetchingData ? (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
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
                <p className={`text-xs ${linkValidation.isValid ? 'text-green-600' : 'text-destructive'}`}>
                  {linkValidation.message}
                </p>
              )}
              
              {/* Verify Button - Only for Telegram */}
              {platform === 'telegram' && linkValidation?.isValid && (
                <Button
                  type="button"
                  onClick={handleManualVerify}
                  disabled={isVerifying || isFetchingData}
                  className={`w-full h-11 mt-2 shadow-md hover:shadow-lg transition-all duration-300 rounded-xl ${
                    verificationStatus?.verified 
                      ? 'bg-gradient-to-r from-green-500 to-green-600' 
                      : 'bg-gradient-to-r from-primary to-secondary'
                  }`}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : verificationStatus?.verified ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Verified
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Verify Account
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Account Name */}
            <div className="space-y-2.5">
              <Label htmlFor="accountName" className="text-sm font-semibold">
                {platform === 'telegram' ? 'Channel/Group Username or ID' : 'Account Name/Handle'}
              </Label>
              <Input
                id="accountName"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder={platform === 'telegram' ? '@yourchannel or -1001234567890' : '@username or account name'}
                required
                disabled={platform === 'telegram' && !!accountLink}
                className="h-12 text-base bg-background/60 backdrop-blur-sm border-2 border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl transition-all duration-200"
              />
              {platform === 'telegram' && (
                <p className="text-xs text-muted-foreground">
                  Auto-filled from the username/ID you entered above
                </p>
              )}
            </div>

            {/* Followers Count */}
            <div className="space-y-2.5">
              <Label htmlFor="followersCount" className="text-sm font-semibold">
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
                className="h-12 text-base bg-background/60 backdrop-blur-sm border-2 border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl transition-all duration-200"
              />
            </div>

            {/* Platform-specific fields in a compact grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Account Type */}
              {(platform === 'facebook' || platform === 'telegram') && (
                <div className="space-y-2.5">
                  <Label htmlFor="accountType" className="text-sm font-semibold">Account Type</Label>
                  <Select value={accountType} onValueChange={setAccountType}>
                    <SelectTrigger className="h-11 bg-background/60 border-2 border-primary/20 rounded-xl">
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

              {/* Niche */}
              {(platform === 'youtube' || platform === 'instagram' || platform === 'tiktok' || platform === 'telegram' || platform === 'facebook') && (
                <div className="space-y-2.5">
                  <Label htmlFor="niche" className="text-sm font-semibold">Niche/Category</Label>
                  <Input
                    id="niche"
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    placeholder="e.g., Gaming, Tech"
                    className="h-11 bg-background/60 border-2 border-primary/20 rounded-xl"
                  />
                </div>
              )}

              {/* Engagement Rate */}
              {(platform === 'instagram' || platform === 'twitter' || platform === 'telegram') && (
                <div className="space-y-2.5">
                  <Label htmlFor="engagementRate" className="text-sm font-semibold">Engagement Rate (%)</Label>
                  <Input
                    id="engagementRate"
                    value={engagementRate}
                    onChange={(e) => setEngagementRate(e.target.value)}
                    placeholder="e.g., 5.2"
                    className="h-11 bg-background/60 border-2 border-primary/20 rounded-xl"
                  />
                </div>
              )}

              {/* YouTube specific */}
              {platform === 'youtube' && (
                <>
                  <div className="space-y-2.5">
                    <Label htmlFor="totalVideos" className="text-sm font-semibold">Total Videos</Label>
                    <Input
                      id="totalVideos"
                      type="number"
                      value={totalVideos}
                      onChange={(e) => setTotalVideos(e.target.value)}
                      placeholder="e.g., 150"
                      className="h-11 bg-background/60 border-2 border-primary/20 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <Label htmlFor="averageViews" className="text-sm font-semibold">Avg Views/Video</Label>
                    <Input
                      id="averageViews"
                      type="number"
                      value={averageViews}
                      onChange={(e) => setAverageViews(e.target.value)}
                      placeholder="e.g., 50000"
                      className="h-11 bg-background/60 border-2 border-primary/20 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2.5 sm:col-span-2">
                    <Label htmlFor="monetizationStatus" className="text-sm font-semibold">Monetization</Label>
                    <Select value={monetizationStatus} onValueChange={setMonetizationStatus}>
                      <SelectTrigger className="h-11 bg-background/60 border-2 border-primary/20 rounded-xl">
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

              {/* TikTok/Telegram Views */}
              {(platform === 'tiktok' || platform === 'telegram') && (
                <div className="space-y-2.5">
                  <Label htmlFor="averageViews" className="text-sm font-semibold">Avg Views/Post</Label>
                  <Input
                    id="averageViews"
                    type="number"
                    value={averageViews}
                    onChange={(e) => setAverageViews(e.target.value)}
                    placeholder="e.g., 25000"
                    className="h-11 bg-background/60 border-2 border-primary/20 rounded-xl"
                  />
                </div>
              )}

              {/* TikTok Likes */}
              {platform === 'tiktok' && (
                <div className="space-y-2.5">
                  <Label htmlFor="totalLikes" className="text-sm font-semibold">Total Likes</Label>
                  <Input
                    id="totalLikes"
                    type="number"
                    value={totalLikes}
                    onChange={(e) => setTotalLikes(e.target.value)}
                    placeholder="e.g., 500000"
                    className="h-11 bg-background/60 border-2 border-primary/20 rounded-xl"
                  />
                </div>
              )}

              {/* Twitter specific */}
              {platform === 'twitter' && (
                <>
                  <div className="space-y-2.5">
                    <Label htmlFor="tweetsCount" className="text-sm font-semibold">Total Tweets</Label>
                    <Input
                      id="tweetsCount"
                      type="number"
                      value={tweetsCount}
                      onChange={(e) => setTweetsCount(e.target.value)}
                      placeholder="e.g., 2500"
                      className="h-11 bg-background/60 border-2 border-primary/20 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <Label htmlFor="accountAge" className="text-sm font-semibold">Account Age</Label>
                    <Input
                      id="accountAge"
                      value={accountAge}
                      onChange={(e) => setAccountAge(e.target.value)}
                      placeholder="e.g., 3 years"
                      className="h-11 bg-background/60 border-2 border-primary/20 rounded-xl"
                    />
                  </div>
                </>
              )}

              {/* Facebook Reach */}
              {platform === 'facebook' && (
                <div className="space-y-2.5">
                  <Label htmlFor="monthlyReach" className="text-sm font-semibold">Monthly Reach</Label>
                  <Input
                    id="monthlyReach"
                    type="number"
                    value={monthlyReach}
                    onChange={(e) => setMonthlyReach(e.target.value)}
                    placeholder="e.g., 100000"
                    className="h-11 bg-background/60 border-2 border-primary/20 rounded-xl"
                  />
                </div>
              )}
            </div>

            {/* Verified Badge Checkbox */}
            {(platform === 'instagram' || platform === 'twitter' || platform === 'tiktok' || platform === 'facebook') && (
              <div className="flex items-center space-x-3 p-3 bg-primary/5 rounded-xl border border-primary/10">
                <input
                  type="checkbox"
                  id="isVerified"
                  checked={isVerified}
                  onChange={(e) => setIsVerified(e.target.checked)}
                  className="w-5 h-5 rounded border-primary/30 text-primary focus:ring-primary focus:ring-offset-0"
                />
                <Label htmlFor="isVerified" className="cursor-pointer text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Verified Account (Blue Check)
                </Label>
              </div>
            )}

            {/* Description */}
            <div className="space-y-2.5">
              <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your account, audience, posting frequency..."
                className="min-h-[120px] text-base bg-background/60 backdrop-blur-sm border-2 border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl resize-none"
                required
              />
            </div>

            {/* Price */}
            <div className="space-y-2.5">
              <Label htmlFor="priceUsdc" className="text-sm font-semibold">Price (USDC)</Label>
              <div className="relative">
                <Input
                  id="priceUsdc"
                  type="number"
                  step="0.01"
                  value={priceUsdc}
                  onChange={(e) => setPriceUsdc(e.target.value)}
                  placeholder="500.00"
                  required
                  className="h-12 text-base bg-background/60 backdrop-blur-sm border-2 border-primary/20 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 rounded-xl pl-8"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
              </div>
            </div>

            {/* Screenshots */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Account Screenshots (Optional)</Label>
              {screenshotPreviews.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {screenshotPreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img 
                        src={preview} 
                        alt={`Screenshot ${index + 1}`} 
                        className="w-full h-28 object-cover rounded-lg border-2 border-primary/20 shadow-sm"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        onClick={() => removeScreenshot(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-2 border-dashed border-primary/20 rounded-xl p-6 text-center hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 cursor-pointer">
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
                <p className="text-xs text-muted-foreground mt-2">Max 5MB per image</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/30 border-t border-primary/10 flex flex-col-reverse sm:flex-row justify-end gap-3">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setOpen(false)}
            className="h-11 px-6 border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 rounded-xl transition-all duration-200"
          >
            Cancel
          </Button>
          <Button 
            type="button"
            onClick={handleSubmit}
            disabled={loading || uploading || !linkValidation?.isValid || (platform === 'telegram' && !verificationStatus?.verified)}
            className="h-11 px-8 bg-gradient-to-r from-primary via-secondary to-primary hover:shadow-lg hover:shadow-primary/50 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold transition-all duration-300 relative overflow-hidden group"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <span>List Account</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
