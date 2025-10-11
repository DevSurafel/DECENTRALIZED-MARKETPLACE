import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SocialMediaListing, SocialMediaPlatform } from "@/hooks/useSocialMedia";
import { useEscrow } from "@/hooks/useEscrow";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

interface SocialMediaPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: SocialMediaListing;
}

interface PlatformRequirement {
  label: string;
  placeholder: string;
  description: string;
}

const getPlatformRequirements = (platform: SocialMediaPlatform): PlatformRequirement => {
  const requirements: Record<SocialMediaPlatform, PlatformRequirement> = {
    telegram: {
      label: "Your Telegram Username",
      placeholder: "@yourusername",
      description: "Enter your Telegram username for channel/group ownership transfer"
    },
    instagram: {
      label: "Your Instagram Email",
      placeholder: "your@email.com",
      description: "Email linked to your Instagram account for ownership transfer"
    },
    facebook: {
      label: "Your Facebook Email",
      placeholder: "your@email.com",
      description: "Email linked to your Facebook account for page/group admin access"
    },
    youtube: {
      label: "Your Google Email",
      placeholder: "your@gmail.com",
      description: "Google account email for YouTube channel ownership transfer"
    },
    tiktok: {
      label: "Your TikTok Email",
      placeholder: "your@email.com",
      description: "Email linked to your TikTok account for ownership transfer"
    },
    twitter: {
      label: "Your Twitter/X Email",
      placeholder: "your@email.com",
      description: "Email linked to your Twitter/X account for ownership transfer"
    }
  };
  return requirements[platform];
};

const getDealProcess = (platform: SocialMediaPlatform): string[] => {
  const escrowUsername = platform === 'telegram' ? '@defiescrow' : 'escrow@defiescrow.com';
  
  const processes: Record<SocialMediaPlatform, string[]> = {
    telegram: [
      "⏱️ Estimated Transfer Time: 1-2 hours",
      "1. You fund the escrow contract with the purchase amount in USDC",
      "2. Seller transfers channel/group ownership to @defiescrow (escrow account)",
      "3. Escrow verifies the transfer and account authenticity (30 minutes)",
      "4. Seller clicks 'Transferred Ownership' button in the platform to confirm",
      "5. Escrow transfers ownership to your provided Telegram username",
      "6. You verify and confirm receipt of ownership within 24 hours",
      "7. Funds are automatically released to the seller after confirmation",
      "8. If any dispute arises, an arbitrator will review evidence and make a final decision"
    ],
    instagram: [
      "⏱️ Estimated Transfer Time: 2-4 hours",
      "1. You fund the escrow contract with the purchase amount in USDC",
      "2. Seller adds escrow@defiescrow.com as account admin with full permissions",
      "3. Escrow verifies account access, authenticity, and follower count (1-2 hours)",
      "4. Seller clicks 'Transferred Ownership' button in the platform to confirm",
      "5. Escrow changes account email to your provided email and updates password",
      "6. You receive new credentials and verify account access within 24 hours",
      "7. Funds are automatically released to the seller after your confirmation",
      "8. If any dispute arises (fake followers, account issues), an arbitrator will review the case"
    ],
    facebook: [
      "⏱️ Estimated Transfer Time: 2-4 hours",
      "1. You fund the escrow contract with the purchase amount in USDC",
      "2. Seller adds escrow@defiescrow.com as page/group admin with full permissions",
      "3. Escrow verifies admin access, page authenticity, and engagement metrics (1-2 hours)",
      "4. Seller clicks 'Transferred Ownership' button in the platform to confirm",
      "5. Escrow adds your email as admin and transfers primary ownership role",
      "6. You verify and confirm receipt of admin access within 24 hours",
      "7. Funds are automatically released to the seller after your confirmation",
      "8. If any dispute arises (page violations, fake likes), an arbitrator will review evidence"
    ],
    youtube: [
      "⏱️ Estimated Transfer Time: 7-14 days (YouTube policy)",
      "1. You fund the escrow contract with the purchase amount in USDC",
      "2. Seller adds escrow@defiescrow.com as channel owner via YouTube Studio",
      "3. Escrow verifies channel ownership and authenticity (1-2 hours)",
      "4. Seller clicks 'Transferred Ownership' button in the platform to confirm",
      "5. Escrow initiates ownership transfer to your Google account",
      "⚠️ YouTube requires 7 days minimum for ownership transfer to complete",
      "6. After 7 days, you verify and confirm receipt of full channel ownership",
      "7. Funds are automatically released to the seller after your confirmation",
      "8. If any dispute arises (copyright strikes, fake views), an arbitrator will review the case"
    ],
    tiktok: [
      "⏱️ Estimated Transfer Time: 1-3 hours",
      "1. You fund the escrow contract with the purchase amount in USDC",
      "2. Seller provides account email and password to escrow@defiescrow.com securely",
      "3. Escrow logs in, verifies account authenticity and engagement metrics (30 minutes)",
      "4. Seller clicks 'Transferred Ownership' button in the platform to confirm",
      "5. Escrow changes account email to your provided email and updates password",
      "6. You receive new credentials via secure channel and verify account access",
      "7. You confirm receipt of account access within 24 hours",
      "8. Funds are automatically released to the seller after your confirmation",
      "9. If any dispute arises (fake followers, shadowban), an arbitrator will review evidence"
    ],
    twitter: [
      "⏱️ Estimated Transfer Time: 1-2 hours",
      "1. You fund the escrow contract with the purchase amount in USDC",
      "2. Seller changes account email to escrow@defiescrow.com and provides password",
      "3. Escrow verifies account access, authenticity, and engagement metrics (30 minutes)",
      "4. Seller clicks 'Transferred Ownership' button in the platform to confirm",
      "5. Escrow changes account email to your provided email and updates password",
      "6. You receive new credentials and verify account access within 24 hours",
      "7. Funds are automatically released to the seller after your confirmation",
      "8. If any dispute arises (suspended account, fake followers), an arbitrator will review the case"
    ]
  };
  
  return processes[platform];
};

export const SocialMediaPurchaseDialog = ({ open, onOpenChange, listing }: SocialMediaPurchaseDialogProps) => {
  const [buyerInfo, setBuyerInfo] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { fundJob, loading: escrowLoading } = useEscrow();
  const { user } = useAuth();
  const navigate = useNavigate();

  const requirement = getPlatformRequirements(listing.platform);
  const dealProcess = getDealProcess(listing.platform);

  const handleProceedToPayment = async () => {
    if (!buyerInfo.trim()) {
      toast({
        title: "Missing Information",
        description: `Please provide your ${requirement.label.toLowerCase()}`,
        variant: "destructive"
      });
      return;
    }

    if (!acceptedTerms) {
      toast({
        title: "Terms Not Accepted",
        description: "Please accept the deal process terms to continue",
        variant: "destructive"
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to continue with the purchase",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      // Get seller's wallet address
      const { data: sellerProfile } = await supabase
        .from('profiles')
        .select('wallet_address')
        .eq('id', listing.seller_id)
        .single();

      if (!sellerProfile?.wallet_address) {
        throw new Error("Seller wallet address not found");
      }

      // Create a job record for this social media purchase
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert({
          client_id: user.id,
          freelancer_id: listing.seller_id,
          listing_id: listing.id,
          title: `Social Media Purchase: ${listing.platform} - ${listing.account_name}`,
          description: `Purchase of ${listing.platform} account: ${listing.account_name}\n\nBuyer Contact: ${buyerInfo}\nContact Type: ${requirement.label}`,
          skills_required: [listing.platform],
          budget_usdc: listing.price_usdc,
          budget_eth: 0,
          status: 'assigned'
        })
        .select()
        .single();

      if (jobError || !job) {
        throw new Error(jobError?.message || "Failed to create purchase record");
      }

      // Update listing status to pending
      await supabase
        .from('social_media_listings')
        .update({ status: 'pending' })
        .eq('id', listing.id);

      // Send telegram notification to seller
      try {
        await supabase.functions.invoke('send-telegram-notification', {
          body: {
            recipient_id: listing.seller_id,
            message: `🛒 New Purchase Request!\n\n${listing.platform} - ${listing.account_name}\nPrice: $${listing.price_usdc} USDC\n\nBuyer is funding escrow. Once funded, please transfer ownership to @defiescrow and click "Transferred Ownership" button.`,
            sender_id: user.id,
            url: `${window.location.origin}/job-details/${job.id}`,
            button_text: 'View Purchase Details'
          }
        });
      } catch (notifError) {
        console.log('Telegram notification failed:', notifError);
        // Don't block the purchase if notification fails
      }

      toast({
        title: "Purchase Initiated",
        description: "Redirecting to fund escrow...",
      });
      
      onOpenChange(false);
      
      // Navigate to escrow page to fund the job
      navigate(`/escrow?jobId=${job.id}`);
      
    } catch (error: any) {
      console.error('Error creating purchase:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create purchase",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Purchase {listing.platform} Account</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Account Info Summary */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold mb-1">{listing.account_name}</div>
              <div className="text-sm">
                {listing.followers_count.toLocaleString()} followers • ${listing.price_usdc.toLocaleString()} USDC
              </div>
            </AlertDescription>
          </Alert>

          {/* Buyer Information Input */}
          <div className="space-y-2">
            <Label htmlFor="buyerInfo">
              {requirement.label} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="buyerInfo"
              value={buyerInfo}
              onChange={(e) => setBuyerInfo(e.target.value)}
              placeholder={requirement.placeholder}
              required
            />
            <p className="text-xs text-muted-foreground">{requirement.description}</p>
          </div>

          {/* Deal Process */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Deal Process
            </h3>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              {dealProcess.map((step, index) => (
                <div key={index} className="text-sm leading-relaxed">
                  {step}
                </div>
              ))}
            </div>
          </div>

          {/* Important Notes */}
          <Alert variant="default">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold mb-2">Important Notes:</div>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>Your funds are secured in a smart contract escrow</li>
                <li>Seller cannot access funds until you confirm receipt</li>
                <li>A 2% arbitration deposit is required from both parties</li>
                <li>In case of disputes, a neutral arbitrator will review evidence</li>
                <li>Ensure the provided {requirement.label.toLowerCase()} is correct and accessible</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Terms Acceptance */}
          <div className="flex items-start space-x-3 p-4 border rounded-lg bg-muted/30">
            <Checkbox
              id="terms"
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(!!checked)}
              className="mt-1"
            />
            <label htmlFor="terms" className="text-sm cursor-pointer leading-relaxed flex-1">
              <span className="font-semibold">I have read and accept the deal process outlined above.</span> I understand that this is a blockchain-secured 
              transaction with escrow protection, and I agree to follow the steps as described. I acknowledge the platform-specific 
              transfer timeframes and will complete verification within the required period.
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isProcessing || escrowLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleProceedToPayment}
              className="flex-1"
              disabled={!buyerInfo.trim() || !acceptedTerms || isProcessing || escrowLoading}
            >
              {isProcessing || escrowLoading ? "Processing..." : "Proceed to Payment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
