import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, AlertTriangle } from "lucide-react";

interface OwnershipTransferPanelProps {
  jobId: string;
  platformName: string;
  accountName: string;
  onConfirmTransfer: () => Promise<void>;
}

export function OwnershipTransferPanel({ jobId, platformName, accountName, onConfirmTransfer }: OwnershipTransferPanelProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await onConfirmTransfer();
      setShowConfirmDialog(false);
      toast({
        title: "Transfer Confirmed",
        description: "Buyer has been notified. They will verify and release the funds.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to confirm transfer. Please try again.",
        variant: "destructive"
      });
    } finally {
      setConfirming(false);
    }
  };

  return (
    <>
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-start gap-4 mb-6">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">Transfer Account Ownership</h2>
            <p className="text-muted-foreground">
              Escrow has been funded. Complete the ownership transfer process to receive your payment.
            </p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-card/50 rounded-lg p-4 border border-border">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <span className="text-lg">📋</span>
              Transfer Instructions
            </h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">1.</span>
                <span>Transfer ownership of <strong className="text-foreground">{accountName}</strong> to the escrow account (<strong className="text-foreground">{platformName === 'telegram' ? '@defiescrow' : 'escrow@defiescrow.com'}</strong>)</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">2.</span>
                <span>Ensure all credentials are updated and accessible by the escrow account</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">3.</span>
                <span>Verify that the account has been completely transferred with full permissions</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">4.</span>
                <span>Only click "Transferred Ownership" after you have <strong className="text-foreground">100% completed</strong> the transfer</span>
              </li>
            </ol>
          </div>

          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-destructive">Important Warning</p>
                <p className="text-muted-foreground">
                  Do NOT click the confirmation button below until you have fully transferred the account ownership to the escrow account. 
                  False confirmation may result in disputes, delays, and potential penalties to your reputation score.
                </p>
              </div>
            </div>
          </div>
        </div>

        <Button 
          onClick={() => setShowConfirmDialog(true)}
          className="w-full shadow-glow"
          size="lg"
        >
          <CheckCircle className="h-5 w-5 mr-2" />
          Transferred Ownership
        </Button>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h3 className="font-semibold mb-2 text-sm flex items-center gap-2">
            <span>⚡</span>
            What Happens Next?
          </h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Escrow verifies the account ownership and authenticity</li>
            <li>• Escrow transfers ownership to the buyer's provided credentials</li>
            <li>• Buyer verifies and confirms receipt within 24 hours</li>
            <li>• Funds are automatically released to you upon buyer confirmation</li>
            <li>• If any issues arise, an arbitrator will review the case</li>
          </ul>
        </div>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              Confirm Ownership Transfer
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 text-base">
              <p className="font-semibold text-foreground">
                Please confirm that you have completed ALL of the following:
              </p>
              
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">✓</span>
                  </div>
                  <p className="text-sm">I have fully transferred ownership of <strong className="text-foreground">{accountName}</strong> to the escrow account</p>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">✓</span>
                  </div>
                  <p className="text-sm">The escrow account now has complete access and control over the {platformName} account</p>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">✓</span>
                  </div>
                  <p className="text-sm">I have verified that all credentials have been properly updated and are functional</p>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">✓</span>
                  </div>
                  <p className="text-sm">I understand that providing false confirmation may result in disputes and reputation penalties</p>
                </div>
              </div>

              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm font-semibold text-destructive mb-1">
                  ⚠️ Warning: Do Not Proceed If Transfer Is Incomplete
                </p>
                <p className="text-xs text-muted-foreground">
                  Confirming without completing the transfer will cause delays, disputes, and may affect your ability to use the platform. 
                  Only proceed if you are 100% certain the account has been fully transferred to the escrow.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirming}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirm}
              disabled={confirming}
              className="bg-primary"
            >
              {confirming ? "Confirming..." : "Yes, I Confirm Transfer is Complete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
