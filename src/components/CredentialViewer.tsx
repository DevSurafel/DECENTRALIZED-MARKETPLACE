import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Copy, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface CredentialViewerProps {
  credentials: {
    loginEmail?: string | null;
    loginUsername?: string | null;
    password?: string | null;
    recoveryEmail?: string | null;
    recoveryPhone?: string | null;
    twoFactorBackupCodes?: string | null;
    securityQuestions?: string | null;
    additionalNotes?: string | null;
    submittedAt?: string;
    platform?: string;
    accountName?: string;
  };
}

export const CredentialViewer = ({ credentials }: CredentialViewerProps) => {
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set());
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const toggleVisibility = (field: string) => {
    setVisibleFields(prev => {
      const newSet = new Set(prev);
      if (newSet.has(field)) {
        newSet.delete(field);
      } else {
        newSet.add(field);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast({
        title: "Copied!",
        description: `${fieldName} copied to clipboard`,
      });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const renderField = (
    label: string,
    value: string | null | undefined,
    fieldKey: string,
    isSensitive = true
  ) => {
    if (!value) return null;

    const isVisible = visibleFields.has(fieldKey);
    const isCopied = copiedField === fieldKey;

    return (
      <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border/50">
        <div className="flex items-center justify-between">
          <label className="text-xs sm:text-sm font-semibold text-foreground">{label}</label>
          <div className="flex gap-1.5">
            {isSensitive && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => toggleVisibility(fieldKey)}
              >
                {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => copyToClipboard(value, label)}
            >
              {isCopied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
        <div className="text-xs sm:text-sm text-muted-foreground break-all bg-background/50 p-2 rounded font-mono">
          {isSensitive && !isVisible ? "••••••••••••" : value}
        </div>
      </div>
    );
  };

  return (
    <Card className="p-4 sm:p-6 space-y-4 bg-card/50 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base sm:text-lg font-bold text-foreground">Account Credentials</h3>
        {credentials.submittedAt && (
          <span className="text-xs text-muted-foreground">
            {new Date(credentials.submittedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {credentials.platform && credentials.accountName && (
        <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-semibold text-primary">Platform:</span>
            <span className="text-xs sm:text-sm font-medium capitalize">{credentials.platform}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs sm:text-sm font-semibold text-primary">Account:</span>
            <span className="text-xs sm:text-sm font-medium">{credentials.accountName}</span>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {renderField("Login Email", credentials.loginEmail, "loginEmail", false)}
        {renderField("Login Username", credentials.loginUsername, "loginUsername", false)}
        {renderField("Password", credentials.password, "password", true)}
        {renderField("Recovery Email", credentials.recoveryEmail, "recoveryEmail", false)}
        {renderField("Recovery Phone", credentials.recoveryPhone, "recoveryPhone", false)}
        {renderField("2FA Backup Codes", credentials.twoFactorBackupCodes, "twoFactorBackupCodes", true)}
        {renderField("Security Questions", credentials.securityQuestions, "securityQuestions", true)}
        {renderField("Additional Notes", credentials.additionalNotes, "additionalNotes", false)}
      </div>
    </Card>
  );
};
