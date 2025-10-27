import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSocialMedia, SocialMediaPlatform } from "@/hooks/useSocialMedia";
import { Plus, Upload, X, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { validateSocialMediaURL } from "@/utils/socialMediaValidator";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

    // Check if it's a valid format
    const isUsername = /^@?[a-zA-Z0-9_]{5,}$/.test(trimmed);
    const isChannelId = /^-100\d{10,}$/.test(trimmed);
    const hasAtSymbol = trimmed.startsWith('@');
    
    if (isChannelId) {
      return { isValid: true, message: 'Valid private channel ID' };
    }
    
    if (isUsername) {
      return { isValid: true, message: hasAtSymbol ? 'Valid username with @' : 'Valid username (@ will be added)' };
    }
    
    // Check if it looks like a display name (has spaces or special chars)
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

  // Real-time link validation (without auto-verification)
  useEffect(() => {
    if (!accountLink) {
      setLinkValidation(null);
      return;
    }

    const validateLink = async () => {
      // For Telegram, validate the identifier format
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

    // For other platforms, validate URL format
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
    }, 500); // Debounce

    return () => clearTimeout(timeoutId);
  }, [accountLink, platform]);

  // Fetch account data function (called manually or on verify button click)
  const fetchAccountData = async () => {
    if (!accountLink) return;

    setIsFetchingData(true);
    try {
      let cleanedLink = accountLink.trim();
      
      // For Telegram, ensure proper format
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
        // Auto-fill fields
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

        // Check verification
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
        // For platforms with limited scraping, still allow verification if account exists
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
    
    // Validate account link before submission
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

    // Verification check - Only for Telegram (other platforms disabled for testing)
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
    
    /* Verification checks for other platforms - Temporarily disabled for testing
    if (platform !== 'facebook' && platform !== 'telegram') {
      if (!hasVerified) {
        toast({
          title: "Verification Required",
          description: "Please click the 'Verify Account' button to verify ownership before listing",
          variant: "destructive"
        });
        return;
      }
      
      if (!verificationStatus?.verified) {
        if (platform === 'twitter' && screenshotFiles.length > 0) {
          toast({
            title: "⚠ Manual verification",
            description: "Proceeding with screenshot verification for Twitter/X",
          });
        } else {
          toast({
            title: "Verification Failed",
            description: platform === 'twitter'
              ? "Please upload screenshots showing the verification code in your bio."
              : `Verification code not found. Please add "${verificationCode}" to your bio and verify again.`,
            variant: "destructive"
          });
          return;
        }
      }
    }
    
    if (platform === 'facebook' && !screenshotFiles.length) {
      toast({
        title: "Screenshots Recommended",
        description: "Please upload screenshots showing the verification code in your Facebook page/group description.",
        variant: "destructive"
      });
      return;
    }
    */
    
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
          description: error instanceof Error ? error.message : "Failed to upload screenshots. Please try again.",
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
    
    // For Telegram, ensure the account_name has proper format
    let finalAccountName = accountName.trim();
    if (platform === 'telegram') {
      // Ensure @ prefix for usernames (not for channel IDs)
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-background via-background/95 to-primary/5 border-2 border-primary/30 shadow-2xl backdrop-blur-xl">
        <DialogHeader className="space-y-2 pb-4 border-b border-primary/10">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            List Social Media Account for Sale
          </DialogTitle>
          <p className="text-sm text-muted-foreground">Fill in the details to list your social media account on the marketplace</p>
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

          {/* Verification Code - Currently commented out for testing (except Telegram) */}
          {platform === 'telegram' && (
            <Alert className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30 shadow-lg">
              <Info className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                <strong className="text-primary">Verification Required:</strong> To prove you own this account, add this code to your channel/group description:
                <div className="mt-3 p-3 bg-background/80 backdrop-blur-sm rounded-lg font-mono text-lg font-bold text-center border border-primary/20 shadow-inner">
                  {verificationCode}
                </div>
                <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                  This code changes every time you change the platform. Add this to your Telegram channel/group description, then click "Verify Account" below.
                </p>
                {verificationStatus && (
                  <div className={`mt-3 p-3 rounded-lg flex items-center gap-3 shadow-md ${verificationStatus.verified ? 'bg-green-500/20 text-green-600 border border-green-500/30' : 'bg-yellow-500/20 text-yellow-600 border border-yellow-500/30'}`}>
                    {verificationStatus.verified ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                    <span className="font-medium">{verificationStatus.message}</span>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Verification code for other platforms - Temporarily disabled for testing */}
          {/* 
          {platform !== 'facebook' && platform !== 'telegram' && (
            <Alert className="bg-primary/10 border-primary/20">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Verification Required:</strong> To prove you own this account, add this code to your account bio/description:
                <div className="mt-2 p-2 bg-background rounded font-mono text-lg font-bold text-center">
                  {verificationCode}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  This code changes every time you change the platform. Add this to your account bio/description, then click "Verify Account" below.
                </p>
                {verificationStatus && (
                  <div className={`mt-2 p-2 rounded flex items-center gap-2 ${verificationStatus.verified ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                    {verificationStatus.verified ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    <span>{verificationStatus.message}</span>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
          */}

          {/* Facebook verification - Temporarily disabled for testing */}
          {/* 
          {platform === 'facebook' && (
            <Alert className="bg-primary/10 border-primary/20">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Verification Required:</strong> To prove you own this account, add this code to your page/group description:
                <div className="mt-2 p-2 bg-background rounded font-mono text-lg font-bold text-center">
                  {verificationCode}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  This code changes every time you change the platform. For Facebook, please add this to your page/group description and include screenshots as proof.
                </p>
              </AlertDescription>
            </Alert>
          )}
          */}

          {platform === 'telegram' && (
            <Alert className="bg-gradient-to-r from-blue-500/15 to-blue-400/10 border-blue-500/30 shadow-md">
              <Info className="h-4 w-4 text-blue-500" />
              <AlertDescription className="text-sm space-y-2">
                <p><strong className="text-blue-600">For Telegram:</strong> Enter your channel/group username (@username) or channel ID (-100123456789).</p>
                <p><strong className="text-blue-600">Example:</strong> @mychannel or -1001234567890</p>
                <p><strong className="text-blue-600">How to find:</strong> Open your channel → Info → Look for "t.me/username" or use @userinfobot for the ID</p>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="accountLink">
              {platform === 'telegram' ? 'Channel/Group Username or ID' : 'Account Link'} 
              <span className="text-destructive">*</span>
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
            
            {/* Verify Account button - Only shown for Telegram */}
            {platform === 'telegram' && linkValidation?.isValid && (
              <Button
                type="button"
                onClick={handleManualVerify}
                disabled={isVerifying || isFetchingData}
                className="w-full mt-2 shadow-lg hover:shadow-xl transition-all duration-300"
                variant={verificationStatus?.verified ? "default" : "outline"}
              >
                {isVerifying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                    Verifying...
                  </>
                ) : verificationStatus?.verified ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Verified
                  </>
                ) : (
                  <>
                    <Info className="w-4 h-4 mr-2" />
                    Verify Account
                  </>
                )}
              </Button>
            )}
            
            {/* Verify button for other platforms - Temporarily disabled for testing */}
            {/* 
            {platform !== 'facebook' && platform !== 'telegram' && linkValidation?.isValid && (
              <Button
                type="button"
                onClick={handleManualVerify}
                disabled={isVerifying || isFetchingData}
                className="w-full mt-2"
                variant={verificationStatus?.verified ? "default" : "outline"}
              >
                {isVerifying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                    Verifying...
                  </>
                ) : verificationStatus?.verified ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Verified
                  </>
                ) : (
                  <>
                    <Info className="w-4 h-4 mr-2" />
                    Verify Account
                  </>
                )}
              </Button>
            )}
            */}
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountName">
              {platform === 'telegram' ? 'Channel/Group Username or ID' : 'Account Name/Handle'}
            </Label>
            <Input
              id="accountName"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder={platform === 'telegram' ? '@yourchannel or -1001234567890' : '@username or account name'}
              required
              disabled={platform === 'telegram' && !!accountLink}
            />
            {platform === 'telegram' && (
              <p className="text-xs text-muted-foreground">
                This will be auto-filled from the username/ID you entered above
              </p>
            )}
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
            <Button 
              type="submit" 
              disabled={loading || uploading || !linkValidation?.isValid || (platform === 'telegram' && !verificationStatus?.verified)}
              className="shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {uploading ? "Uploading..." : loading ? "Creating..." : "List Account"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
