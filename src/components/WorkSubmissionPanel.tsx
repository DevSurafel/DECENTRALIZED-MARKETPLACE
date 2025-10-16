import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Upload, FileText, GitBranch, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WorkSubmissionPanelProps {
  jobId: string;
  onSubmit: (ipfsHash: string, gitHash: string, repositoryUrl: string, notes: string, walletAddress: string) => Promise<void>;
}

export function WorkSubmissionPanel({ jobId, onSubmit }: WorkSubmissionPanelProps) {
  const [ipfsHash, setIpfsHash] = useState("");
  const [gitHash, setGitHash] = useState("");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async () => {
    if (!ipfsHash || !gitHash || !walletAddress) {
      toast({
        title: "Missing Information",
        description: "Please provide IPFS hash, Git commit hash, and wallet address",
        variant: "destructive"
      });
      return;
    }

    // Basic wallet address validation (Ethereum address format)
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      toast({
        title: "Invalid Wallet Address",
        description: "Please provide a valid Ethereum wallet address",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(ipfsHash, gitHash, repositoryUrl, notes, walletAddress);
      setIpfsHash("");
      setGitHash("");
      setRepositoryUrl("");
      setNotes("");
      setWalletAddress("");
      setSelectedFile(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({ title: "No file selected", description: "Please choose a .zip bundle to upload." });
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const { data, error } = await supabase.functions.invoke("ipfs-upload", { body: formData } as any);
      if (error) throw error;
      const ipfs = (data as any)?.ipfsHash;
      if (ipfs) {
        setIpfsHash(ipfs);
        toast({ title: "Uploaded to IPFS", description: `Hash: ${ipfs}` });
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Upload failed", description: "Could not upload to IPFS", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">Submit Your Work</h2>
      <p className="text-muted-foreground mb-6">
        Upload your completed work with IPFS hash and Git commit reference for verification
      </p>

      <div className="space-y-4">
        <div>
          <Label htmlFor="bundle" className="flex items-center gap-2 mb-2">
            <Upload className="h-4 w-4" />
            Upload Bundle (.zip)
          </Label>
          <Input
            id="bundle"
            type="file"
            accept=".zip"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          />
          <Button onClick={handleUpload} disabled={!selectedFile || uploading} variant="secondary" className="mt-2">
            {uploading ? "Uploading..." : "Upload to IPFS"}
          </Button>
          <p className="text-xs text-muted-foreground mt-1">
            Upload a zip with code + README + build instructions. The IPFS hash will auto-fill below.
          </p>
        </div>

        <div>
          <Label htmlFor="ipfs" className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4" />
            IPFS Hash
          </Label>
          <Input
            id="ipfs"
            placeholder="Qm... (IPFS content hash)"
            value={ipfsHash}
            onChange={(e) => setIpfsHash(e.target.value)}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Or paste an existing IPFS hash if you uploaded elsewhere
          </p>
        </div>

        <div>
          <Label htmlFor="git" className="flex items-center gap-2 mb-2">
            <GitBranch className="h-4 w-4" />
            Git Commit Hash
          </Label>
          <Input
            id="git"
            placeholder="abc123... (Git commit SHA)"
            value={gitHash}
            onChange={(e) => setGitHash(e.target.value)}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Provide the commit hash from your repository
          </p>
        </div>

        <div>
          <Label htmlFor="repository" className="flex items-center gap-2 mb-2">
            <GitBranch className="h-4 w-4" />
            Repository URL
          </Label>
          <Input
            id="repository"
            placeholder="https://github.com/username/repo"
            value={repositoryUrl}
            onChange={(e) => setRepositoryUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Link to your GitHub/GitLab repository (optional but recommended)
          </p>
        </div>

        <div>
          <Label htmlFor="wallet" className="flex items-center gap-2 mb-2">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Payment Wallet Address *
          </Label>
          <Input
            id="wallet"
            placeholder="0x..."
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Your Ethereum wallet address where payment will be released
          </p>
        </div>

        <div>
          <Label htmlFor="notes" className="mb-2 block">
            Submission Notes (Optional)
          </Label>
          <Textarea
            id="notes"
            placeholder="Add any additional notes about your submission..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
          />
        </div>

        <Button 
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full shadow-glow"
          size="lg"
        >
          <Send className="h-4 w-4 mr-2" />
          {submitting ? "Submitting..." : "Submit Work for Review"}
        </Button>
      </div>

      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <h3 className="font-semibold mb-2 text-sm">💡 Submission Tips</h3>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Ensure all files are properly uploaded to IPFS</li>
          <li>• Include clear instructions in your repository README</li>
          <li>• Test your deliverables before submission</li>
          <li>• Client has 7 days to review your work</li>
        </ul>
      </div>
    </Card>
  );
}
