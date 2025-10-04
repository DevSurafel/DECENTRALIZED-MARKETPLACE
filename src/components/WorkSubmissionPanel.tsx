import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Upload, FileText, GitBranch, Send } from "lucide-react";

interface WorkSubmissionPanelProps {
  jobId: string;
  onSubmit: (ipfsHash: string, gitHash: string, notes: string) => Promise<void>;
}

export function WorkSubmissionPanel({ jobId, onSubmit }: WorkSubmissionPanelProps) {
  const [ipfsHash, setIpfsHash] = useState("");
  const [gitHash, setGitHash] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!ipfsHash || !gitHash) {
      toast({
        title: "Missing Information",
        description: "Please provide both IPFS hash and Git commit hash",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(ipfsHash, gitHash, notes);
      setIpfsHash("");
      setGitHash("");
      setNotes("");
    } finally {
      setSubmitting(false);
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
            Upload your files to IPFS and paste the hash here
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
          <li>• Client has {5} days to review your work</li>
        </ul>
      </div>
    </Card>
  );
}
