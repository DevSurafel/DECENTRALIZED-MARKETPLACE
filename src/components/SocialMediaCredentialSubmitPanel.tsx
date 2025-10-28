import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Shield, Lock, Key, Mail, Phone, AlertCircle } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";

interface SocialMediaCredentialSubmitPanelProps {
  jobId: string;
  platform: string;
  accountName: string;
  buyerEmail: string;
  onSubmit: () => void;
}

export function SocialMediaCredentialSubmitPanel({ 
  jobId, 
  platform, 
  accountName, 
  buyerEmail,
  onSubmit 
}: SocialMediaCredentialSubmitPanelProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Common fields for all platforms
  const [loginEmail, setLoginEmail] = useState("");
  const [loginUsername, setLoginUsername] = useState("");
  const [password, setPassword] = useState("");
  
  // Platform-specific fields
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryPhone, setRecoveryPhone] = useState("");
  const [twoFactorBackupCodes, setTwoFactorBackupCodes] = useState("");
  const [securityQuestions, setSecurityQuestions] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  const getPlatformRequirements = () => {
    switch (platform.toLowerCase()) {
      case 'instagram':
        return {
          title: 'Instagram Account Credentials',
          fields: ['loginInfo', 'password', 'recoveryEmail', 'twoFactor', 'notes'],
          instructions: [
            'Provide the email/username and password',
            'Include recovery email (important for account security)',
            'Provide 2FA backup codes if enabled',
            'Add any additional account details'
          ]
        };
      case 'facebook':
        return {
          title: 'Facebook Account Credentials',
          fields: ['loginEmail', 'password', 'recoveryEmail', 'recoveryPhone', 'twoFactor', 'securityQuestions', 'notes'],
          instructions: [
            'Provide the primary email and password',
            'Include recovery email and phone number',
            'Provide 2FA backup codes if enabled',
            'Include answers to security questions if set',
            'Add any linked accounts or pages info'
          ]
        };
      case 'youtube':
      case 'google':
        return {
          title: 'YouTube/Google Account Credentials',
          fields: ['loginEmail', 'password', 'recoveryEmail', 'recoveryPhone', 'twoFactor', 'notes'],
          instructions: [
            'Provide the Google account email and password',
            'Include recovery email and phone',
            'Provide 2FA backup codes (very important)',
            'Include any app-specific passwords if used'
          ]
        };
      case 'tiktok':
        return {
          title: 'TikTok Account Credentials',
          fields: ['loginInfo', 'password', 'recoveryEmail', 'recoveryPhone', 'notes'],
          instructions: [
            'Provide email/phone/username used for login',
            'Include the password',
            'Provide recovery email and phone',
            'Add any linked social accounts info'
          ]
        };
      case 'twitter':
      case 'x':
        return {
          title: 'Twitter/X Account Credentials',
          fields: ['loginInfo', 'password', 'recoveryEmail', 'twoFactor', 'notes'],
          instructions: [
            'Provide email/username/phone for login',
            'Include the password',
            'Provide backup email',
            'Include 2FA backup codes if enabled'
          ]
        };
      default:
        return {
          title: 'Social Media Account Credentials',
          fields: ['loginInfo', 'password', 'recoveryEmail', 'notes'],
          instructions: [
            'Provide login credentials',
            'Include password',
            'Add recovery information',
            'Include any additional important details'
          ]
        };
    }
  };

  const requirements = getPlatformRequirements();

  const handleSubmit = async () => {
    // Validate required fields
    if (!password || (!loginEmail && !loginUsername)) {
      toast({
        title: "Missing Information",
        description: "Please provide login credentials and password",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      // Store credentials securely in job metadata
      const credentials = {
        loginEmail: loginEmail || null,
        loginUsername: loginUsername || null,
        password,
        recoveryEmail: recoveryEmail || null,
        recoveryPhone: recoveryPhone || null,
        twoFactorBackupCodes: twoFactorBackupCodes || null,
        securityQuestions: securityQuestions || null,
        additionalNotes: additionalNotes || null,
        submittedAt: new Date().toISOString(),
        platform,
        accountName
      };

      // Update job with credentials and change status to under_review
      const { error } = await supabase
        .from('jobs')
        .update({
          description: JSON.stringify(credentials), // Store temporarily in description
          status: 'under_review',
          review_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', jobId);

      if (error) throw error;

      toast({
        title: "Credentials Submitted",
        description: "The buyer will receive the credentials and update the account details.",
      });

      setShowConfirmDialog(false);
      onSubmit();
    } catch (error) {
      console.error('Error submitting credentials:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit credentials",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Card className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">{requirements.title}</h2>
            <p className="text-muted-foreground">
              Submit account credentials so the buyer can update email and password. The buyer will then verify and release payment.
            </p>
          </div>
        </div>

        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <span>📋</span>
            What You Need to Provide
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {requirements.instructions.map((instruction, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                <span>{instruction}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4 mb-6">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Buyer's Email</p>
            </div>
            <p className="text-sm text-muted-foreground">{buyerEmail}</p>
          </div>

          {requirements.fields.includes('loginEmail') && (
            <div>
              <Label htmlFor="loginEmail" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Login Email *
              </Label>
              <Input
                id="loginEmail"
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="account@email.com"
                className="mt-1"
              />
            </div>
          )}

          {requirements.fields.includes('loginInfo') && (
            <div>
              <Label htmlFor="loginUsername" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Login Email/Username *
              </Label>
              <Input
                id="loginUsername"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="username or email"
                className="mt-1"
              />
            </div>
          )}

          <div>
            <Label htmlFor="password" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Current Password *
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1"
            />
          </div>

          {requirements.fields.includes('recoveryEmail') && (
            <div>
              <Label htmlFor="recoveryEmail" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Recovery Email
              </Label>
              <Input
                id="recoveryEmail"
                type="email"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                placeholder="recovery@email.com"
                className="mt-1"
              />
            </div>
          )}

          {requirements.fields.includes('recoveryPhone') && (
            <div>
              <Label htmlFor="recoveryPhone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Recovery Phone Number
              </Label>
              <Input
                id="recoveryPhone"
                type="tel"
                value={recoveryPhone}
                onChange={(e) => setRecoveryPhone(e.target.value)}
                placeholder="+1234567890"
                className="mt-1"
              />
            </div>
          )}

          {requirements.fields.includes('twoFactor') && (
            <div>
              <Label htmlFor="twoFactor" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                2FA Backup Codes (if enabled)
              </Label>
              <Textarea
                id="twoFactor"
                value={twoFactorBackupCodes}
                onChange={(e) => setTwoFactorBackupCodes(e.target.value)}
                placeholder="Paste backup codes here, one per line"
                className="mt-1 font-mono text-sm"
                rows={4}
              />
            </div>
          )}

          {requirements.fields.includes('securityQuestions') && (
            <div>
              <Label htmlFor="securityQuestions">
                Security Questions & Answers
              </Label>
              <Textarea
                id="securityQuestions"
                value={securityQuestions}
                onChange={(e) => setSecurityQuestions(e.target.value)}
                placeholder="Q: Your first pet's name? A: Fluffy"
                className="mt-1"
                rows={3}
              />
            </div>
          )}

          <div>
            <Label htmlFor="additionalNotes">
              Additional Information
            </Label>
            <Textarea
              id="additionalNotes"
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Any other important details (linked accounts, app passwords, etc.)"
              className="mt-1"
              rows={3}
            />
          </div>
        </div>

        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            Important Security Notes
          </h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Credentials are transmitted securely and encrypted</li>
            <li>• Buyer will change password and email immediately</li>
            <li>• Payment released only after buyer confirms access</li>
            <li>• You'll lose access once buyer updates credentials</li>
            <li>• Make sure account has no violations or fake followers</li>
          </ul>
        </div>

        <Button
          onClick={() => setShowConfirmDialog(true)}
          className="w-full shadow-glow"
          size="lg"
          disabled={!password || (!loginEmail && !loginUsername)}
        >
          <Shield className="h-4 w-4 mr-2" />
          Submit Credentials to Buyer
        </Button>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Credentials?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You are about to submit the account credentials to the buyer. Please ensure:
              </p>
              <div className="bg-muted/50 rounded p-3 space-y-2">
                <ul className="text-sm space-y-1">
                  <li>✓ All credentials are correct and working</li>
                  <li>✓ You've provided recovery email and backup codes</li>
                  <li>✓ Account has no violations or pending issues</li>
                  <li>✓ Follower count and engagement are authentic</li>
                </ul>
              </div>
              <p className="text-destructive font-semibold">
                ⚠️ The buyer will immediately change the password and email. You will lose access to this account.
              </p>
              <p className="text-xs text-muted-foreground">
                Payment will be released after the buyer verifies and confirms they have full access.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting..." : "Confirm & Submit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
