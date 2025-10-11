import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, ShieldCheck } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SocialMediaReviewPanelProps {
  job: any;
  onApprove: () => Promise<void>;
  onRaiseDispute: () => Promise<void>;
}

export function SocialMediaReviewPanel({ job, onApprove, onRaiseDispute }: SocialMediaReviewPanelProps) {
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showDisputeDialog, setShowDisputeDialog] = useState(false);
  const [approving, setApproving] = useState(false);
  const [disputing, setDisputing] = useState(false);

  const handleApprove = async () => {
    setApproving(true);
    try {
      await onApprove();
      setShowApproveDialog(false);
    } finally {
      setApproving(false);
    }
  };

  const handleRaiseDispute = async () => {
    setDisputing(true);
    try {
      await onRaiseDispute();
      setShowDisputeDialog(false);
    } finally {
      setDisputing(false);
    }
  };

  // Extract platform and account info from description
  const descriptionLines = job.description?.split('\n') || [];
  const buyerContactLine = descriptionLines.find((line: string) => line.startsWith('Buyer Contact:'));
  const buyerContact = buyerContactLine?.replace('Buyer Contact:', '').trim() || 'Not provided';

  return (
    <>
      <Card className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">Verify Account Transfer</h2>
            <p className="text-muted-foreground">
              The seller has confirmed the ownership transfer to escrow. Please verify you've received access.
            </p>
          </div>
        </div>
        
        <div className="mb-6 p-4 bg-muted/50 rounded-lg space-y-3">
          <div className="space-y-2">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <span>📧</span>
              Your Contact Information
            </h3>
            <p className="text-sm text-muted-foreground">
              {buyerContact}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              The escrow should have sent account credentials to the contact information above. Please check your email/messages.
            </p>
          </div>
        </div>

        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <span>✅</span>
            Verification Checklist
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              <span>Verify you have received login credentials from escrow</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              <span>Log in and confirm you have full access to the account</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              <span>Check that follower count and account details match the listing</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              <span>Verify account is authentic and not suspended/restricted</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => setShowApproveDialog(true)}
            className="w-full shadow-glow"
            size="lg"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Confirm Receipt & Release Payment
          </Button>

          <Button
            onClick={() => setShowDisputeDialog(true)}
            variant="destructive"
            className="w-full"
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            Report Issue / Dispute
          </Button>
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h3 className="font-semibold mb-2 text-sm">⚠️ Important</h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Only confirm if you have FULL access to the account</li>
            <li>• Once you confirm, payment will be released to the seller</li>
            <li>• You have 24 hours to verify - after that, payment auto-releases</li>
            <li>• Report issues immediately if something doesn't match</li>
          </ul>
        </div>
      </Card>

      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Account Receipt?</AlertDialogTitle>
            <AlertDialogDescription>
              You are confirming that you have received full access to the account and everything matches the listing. 
              This will release <strong>{job.budget_usdc || (job.budget_eth * 2000).toFixed(2)} USDC</strong> to the seller.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={approving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={approving}>
              {approving ? "Confirming..." : "Confirm & Release Payment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDisputeDialog} onOpenChange={setShowDisputeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Report an Issue?</AlertDialogTitle>
            <AlertDialogDescription>
              This will escalate the issue to an arbitrator who will review the evidence and make a final decision. 
              You'll need to deposit <strong>{(((job.budget_usdc || (job.budget_eth * 2000)) || 0) * (job.arbitration_deposit_percentage || 2) / 100).toFixed(2)} USDC</strong> as arbitration fee.
              <br /><br />
              Only report an issue if:
              <ul className="list-disc ml-4 mt-2">
                <li>You haven't received account credentials</li>
                <li>Account details don't match the listing (fake followers, wrong platform, etc.)</li>
                <li>Account is suspended or has violations</li>
                <li>Seller provided false information</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disputing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRaiseDispute} disabled={disputing} className="bg-destructive">
              {disputing ? "Reporting..." : "Report Issue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
