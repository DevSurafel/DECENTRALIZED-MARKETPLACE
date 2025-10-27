import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckCircle, AlertCircle, ShieldCheck, Copy, Eye, EyeOff } from "lucide-react";
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
import { toast } from "@/hooks/use-toast";

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
  const [showPassword, setShowPassword] = useState(false);
  const [showRecoveryEmail, setShowRecoveryEmail] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

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

  // Parse credentials from job description (stored as JSON)
  let credentials: any = null;
  let buyerContact = 'Not provided';
  
  try {
    credentials = JSON.parse(job.description || '{}');
    // Extract buyer contact if it's the old format
    if (typeof job.description === 'string' && job.description.includes('Buyer Contact:')) {
      const descriptionLines = job.description.split('\n');
      const buyerContactLine = descriptionLines.find((line: string) => line.startsWith('Buyer Contact:'));
      buyerContact = buyerContactLine?.replace('Buyer Contact:', '').trim() || 'Not provided';
    }
  } catch {
    // If parsing fails, it's the old format with buyer contact
    const descriptionLines = job.description?.split('\n') || [];
    const buyerContactLine = descriptionLines.find((line: string) => line.startsWith('Buyer Contact:'));
    buyerContact = buyerContactLine?.replace('Buyer Contact:', '').trim() || 'Not provided';
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  return (
    <>
      <Card className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">Update Account & Release Payment</h2>
            <p className="text-muted-foreground">
              The seller has submitted account credentials. Log in, change the email and password immediately, then approve payment on blockchain.
            </p>
          </div>
        </div>

        {/* Show Credentials */}
        {credentials && credentials.password && (
          <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <span>🔐</span>
                Account Credentials
              </h3>
              <p className="text-xs text-muted-foreground">
                Use these credentials to log in and immediately change the email and password.
              </p>
            </div>

            {/* Login Email/Username */}
            {(credentials.loginEmail || credentials.loginUsername) && (
              <div className="p-3 bg-muted/50 rounded">
                <Label className="text-xs text-muted-foreground">Login Email/Username</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 text-sm">{credentials.loginEmail || credentials.loginUsername}</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(credentials.loginEmail || credentials.loginUsername, 'Email/Username')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Password */}
            <div className="p-3 bg-muted/50 rounded">
              <Label className="text-xs text-muted-foreground">Password</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 text-sm font-mono">
                  {showPassword ? credentials.password : '••••••••••••'}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(credentials.password, 'Password')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Recovery Email */}
            {credentials.recoveryEmail && (
              <div className="p-3 bg-muted/50 rounded">
                <Label className="text-xs text-muted-foreground">Recovery Email</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 text-sm">
                    {showRecoveryEmail ? credentials.recoveryEmail : credentials.recoveryEmail.replace(/(.{3})(.*)(@.*)/, '$1***$3')}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowRecoveryEmail(!showRecoveryEmail)}
                  >
                    {showRecoveryEmail ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(credentials.recoveryEmail, 'Recovery Email')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Recovery Phone */}
            {credentials.recoveryPhone && (
              <div className="p-3 bg-muted/50 rounded">
                <Label className="text-xs text-muted-foreground">Recovery Phone</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 text-sm">{credentials.recoveryPhone}</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(credentials.recoveryPhone, 'Phone')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* 2FA Backup Codes */}
            {credentials.twoFactorBackupCodes && (
              <div className="p-3 bg-muted/50 rounded">
                <Label className="text-xs text-muted-foreground">2FA Backup Codes</Label>
                <div className="mt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowBackupCodes(!showBackupCodes)}
                    className="mb-2"
                  >
                    {showBackupCodes ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                    {showBackupCodes ? 'Hide' : 'Show'} Codes
                  </Button>
                  {showBackupCodes && (
                    <div className="flex items-start gap-2">
                      <code className="flex-1 text-xs font-mono whitespace-pre-wrap bg-background/50 p-2 rounded">
                        {credentials.twoFactorBackupCodes}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(credentials.twoFactorBackupCodes, '2FA Codes')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Security Questions */}
            {credentials.securityQuestions && (
              <div className="p-3 bg-muted/50 rounded">
                <Label className="text-xs text-muted-foreground">Security Q&A</Label>
                <p className="text-sm mt-1 whitespace-pre-wrap">{credentials.securityQuestions}</p>
              </div>
            )}

            {/* Additional Notes */}
            {credentials.additionalNotes && (
              <div className="p-3 bg-muted/50 rounded">
                <Label className="text-xs text-muted-foreground">Additional Info</Label>
                <p className="text-sm mt-1 whitespace-pre-wrap">{credentials.additionalNotes}</p>
              </div>
            )}
          </div>
        )}

        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <span>✅</span>
            Step-by-Step Checklist
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-blue-500">1.</span>
              <span>Log in using the credentials provided above</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">2.</span>
              <span>Immediately change the account password to your own</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">3.</span>
              <span>Change the email address to your own email</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">4.</span>
              <span>Update recovery email and phone if applicable</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">5.</span>
              <span>Enable 2FA with your own authenticator app</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">6.</span>
              <span>Verify follower count matches the listing</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">7.</span>
              <span>Check account has no violations or restrictions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">8.</span>
              <span>Once secured, approve payment on blockchain below</span>
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
            I've Updated Credentials - Release Payment
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
          <h3 className="font-semibold mb-2 text-sm">⚠️ Important Security Notes</h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Only approve after you've changed password AND email</li>
            <li>• Make sure you have full access and control</li>
            <li>• Approving requires a blockchain transaction</li>
            <li>• Smart contract releases payment to seller + platform fee (2%)</li>
            <li>• You have 24 hours to update and verify</li>
            <li>• Report issues immediately if account has fake followers or violations</li>
          </ul>
        </div>
      </Card>

      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Credentials Updated & Release Payment?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Please confirm you have completed all the following steps:
              </p>
              <div className="bg-muted/50 rounded p-3 space-y-2">
                <p className="font-semibold text-foreground">Checklist:</p>
                <ul className="text-sm space-y-1">
                  <li>✓ Logged in successfully with provided credentials</li>
                  <li>✓ Changed the account password to my own</li>
                  <li>✓ Changed the email address to my own</li>
                  <li>✓ Updated recovery methods (email/phone)</li>
                  <li>✓ Set up my own 2FA if applicable</li>
                  <li>✓ Verified follower count matches listing</li>
                  <li>✓ Account has no violations or fake followers</li>
                </ul>
              </div>
              <div className="bg-primary/10 rounded p-3">
                <p className="font-semibold text-foreground mb-1">Payment Release:</p>
                <ul className="text-sm space-y-1">
                  <li>• You'll sign the blockchain transaction</li>
                  <li>• Smart contract releases <strong>{job.budget_usdc || (job.budget_eth * 2000).toFixed(2)} USDC</strong> to seller</li>
                  <li>• Platform fee (2%) sent automatically</li>
                  <li>• Transaction is final and cannot be reversed</li>
                </ul>
              </div>
              <p className="text-destructive font-semibold">⚠️ Only proceed if you have FULL control of the account with your own credentials.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={approving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={approving}>
              {approving ? "Processing..." : "Confirm & Release Payment"}
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
                <li>Credentials don't work or are incorrect</li>
                <li>Unable to change password or email</li>
                <li>Account details don't match listing (fake followers, wrong platform)</li>
                <li>Account is suspended, restricted, or has violations</li>
                <li>Seller provided false or incomplete information</li>
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
