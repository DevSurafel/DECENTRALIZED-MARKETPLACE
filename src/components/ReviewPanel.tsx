import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, CheckCircle, AlertCircle, RotateCcw } from "lucide-react";
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

interface ReviewPanelProps {
  job: any;
  onApprove: () => Promise<void>;
  onRequestRevision: (notes: string) => Promise<void>;
  onRaiseDispute: () => Promise<void>;
}

export function ReviewPanel({ job, onApprove, onRequestRevision, onRaiseDispute }: ReviewPanelProps) {
  const [revisionNotes, setRevisionNotes] = useState("");
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showDisputeDialog, setShowDisputeDialog] = useState(false);
  const [approving, setApproving] = useState(false);
  const [requesting, setRequesting] = useState(false);
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

  const handleRequestRevision = async () => {
    if (!revisionNotes.trim()) return;
    
    setRequesting(true);
    try {
      await onRequestRevision(revisionNotes);
      setRevisionNotes("");
    } finally {
      setRequesting(false);
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

  const currentRevisions = job.current_revision_number || 0;
  const allowedRevisions = job.allowed_revisions || 3;
  const revisionsRemaining = allowedRevisions - currentRevisions;

  return (
    <>
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Review Submitted Work</h2>
        
        <div className="mb-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-start gap-3 mb-3">
            <FileText className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-1">IPFS Hash</p>
              <p className="font-mono text-sm text-muted-foreground break-all">{job.ipfs_hash}</p>
            </div>
          </div>
          {job.git_commit_hash && (
            <div className="flex items-start gap-3">
              <GitBranch className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold mb-1">Git Commit</p>
                <p className="font-mono text-sm text-muted-foreground break-all">{job.git_commit_hash}</p>
              </div>
            </div>
          )}
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Revisions Used</p>
            <p className="text-sm text-muted-foreground">
              {currentRevisions} / {allowedRevisions}
            </p>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all"
              style={{ width: `${(currentRevisions / allowedRevisions) * 100}%` }}
            />
          </div>
          {revisionsRemaining > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {revisionsRemaining} revision{revisionsRemaining !== 1 ? 's' : ''} remaining
            </p>
          )}
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => setShowApproveDialog(true)}
            className="w-full shadow-glow"
            size="lg"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve & Release Funds
          </Button>

          {revisionsRemaining > 0 && (
            <div className="space-y-2">
              <Label>Request Revision</Label>
              <Textarea
                placeholder="Explain what changes you'd like to see..."
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                rows={3}
              />
              <Button
                onClick={handleRequestRevision}
                disabled={!revisionNotes.trim() || requesting}
                variant="outline"
                className="w-full"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {requesting ? "Requesting..." : "Request Revision"}
              </Button>
            </div>
          )}

          <Button
            onClick={() => setShowDisputeDialog(true)}
            variant="destructive"
            className="w-full"
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            Raise Dispute
          </Button>
        </div>
      </Card>

      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve and Release Payment?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to approve this work and release <strong>{job.budget_usdc || (job.budget_eth * 2000).toFixed(2)} USDC</strong> to the freelancer.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={approving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={approving}>
              {approving ? "Approving..." : "Approve & Release"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDisputeDialog} onOpenChange={setShowDisputeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Raise a Dispute?</AlertDialogTitle>
            <AlertDialogDescription>
              This will escalate the issue to an arbitrator. You'll need to deposit 
              <strong>{(((job.budget_usdc || (job.budget_eth * 2000)) || 0) * (job.arbitration_deposit_percentage || 2) / 100).toFixed(2)} USDC</strong> 
              as arbitration fee.
              <br /><br />
              Only raise a dispute if you cannot resolve the issue with the freelancer directly.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disputing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRaiseDispute} disabled={disputing} className="bg-destructive">
              {disputing ? "Raising..." : "Raise Dispute"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

const FileText = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const GitBranch = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
  </svg>
);
