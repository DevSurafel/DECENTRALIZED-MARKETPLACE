import { useEffect, useState } from 'react';
import { useRevisions, type Revision } from '@/hooks/useRevisions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, GitCommit, Clock, AlertCircle } from 'lucide-react';

interface JobDetailsPanelProps {
  job: any;
  onRequestRevision: (notes: string) => void;
  onSubmitRevision: (ipfsHash: string, gitHash: string) => void;
  onRaiseDispute: () => void;
  userRole: 'client' | 'freelancer' | null;
}

export function JobDetailsPanel({ job, onRequestRevision, onSubmitRevision, onRaiseDispute, userRole }: JobDetailsPanelProps) {
  const { getRevisionsByJobId } = useRevisions();
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [ipfsHash, setIpfsHash] = useState('');
  const [gitHash, setGitHash] = useState('');

  useEffect(() => {
    loadRevisions();
  }, [job.id]);

  const loadRevisions = async () => {
    const data = await getRevisionsByJobId(job.id);
    setRevisions(data);
  };

  const handleRequestRevision = () => {
    onRequestRevision(revisionNotes);
    setRevisionNotes('');
  };

  const handleSubmitRevision = () => {
    onSubmitRevision(ipfsHash, gitHash);
    setIpfsHash('');
    setGitHash('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress': return 'blue';
      case 'revision_requested': return 'yellow';
      case 'disputed': return 'red';
      case 'completed': return 'green';
      default: return 'gray';
    }
  };

  const reviewDeadline = job.review_deadline ? new Date(job.review_deadline) : null;
  const isReviewExpired = reviewDeadline && reviewDeadline < new Date();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{job.title}</CardTitle>
              <CardDescription className="mt-2">{job.description}</CardDescription>
            </div>
            <Badge variant={getStatusColor(job.status) as any}>
              {job.status?.replace('_', ' ')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Budget</p>
              <p className="text-lg font-semibold">{job.budget_usdc || (job.budget_eth * 2000).toFixed(2)} USDC</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Revisions</p>
              <p className="text-lg font-semibold">
                {job.current_revision_number || 0} / {job.allowed_revisions || 3}
              </p>
            </div>
            {reviewDeadline && (
              <div>
                <p className="text-sm text-muted-foreground">Review Deadline</p>
                <p className={`text-lg font-semibold ${isReviewExpired ? 'text-destructive' : ''}`}>
                  {reviewDeadline.toLocaleDateString()}
                </p>
              </div>
            )}
            {job.freelancer_stake_usdc > 0 && (
              <div>
                <p className="text-sm text-muted-foreground">Freelancer Stake</p>
                <p className="text-lg font-semibold">{job.freelancer_stake_usdc} USDC</p>
              </div>
            )}
          </div>

          {job.ipfs_hash && (
            <div className="p-4 border rounded-lg bg-muted/50">
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Latest Submission
              </p>
              <p className="text-sm text-muted-foreground font-mono break-all">{job.ipfs_hash}</p>
              {job.git_commit_hash && (
                <p className="text-sm text-muted-foreground font-mono mt-2 flex items-center gap-2">
                  <GitCommit className="h-4 w-4" />
                  {job.git_commit_hash}
                </p>
              )}
            </div>
          )}

          {isReviewExpired && job.status === 'in_progress' && (
            <div className="p-4 border border-yellow-500 rounded-lg bg-yellow-50 dark:bg-yellow-950">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-900 dark:text-yellow-100">Auto-Release Available</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Review deadline passed. Payment can be auto-released to freelancer.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Actions */}
      {userRole === 'client' && job.status === 'in_progress' && job.ipfs_hash && (
        <Card>
          <CardHeader>
            <CardTitle>Review Submission</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button className="flex-1" size="lg">
                Approve & Release Funds
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex-1" size="lg">
                    Request Revision
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Request Revision</DialogTitle>
                    <DialogDescription>
                      Revisions remaining: {(job.allowed_revisions || 3) - (job.current_revision_number || 0)}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="notes">Revision Notes</Label>
                      <Textarea
                        id="notes"
                        value={revisionNotes}
                        onChange={(e) => setRevisionNotes(e.target.value)}
                        placeholder="Describe what needs to be fixed or changed..."
                        rows={4}
                      />
                    </div>
                    <Button onClick={handleRequestRevision} className="w-full" disabled={!revisionNotes}>
                      Submit Revision Request
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Button variant="destructive" className="w-full" size="lg" onClick={onRaiseDispute}>
              Raise Dispute (2% deposit required)
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Freelancer Actions */}
      {userRole === 'freelancer' && job.status === 'revision_requested' && (
        <Card>
          <CardHeader>
            <CardTitle>Submit Revision</CardTitle>
            <CardDescription>Revision #{job.current_revision_number}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="ipfs">IPFS Hash</Label>
              <Input
                id="ipfs"
                value={ipfsHash}
                onChange={(e) => setIpfsHash(e.target.value)}
                placeholder="QmXXXXXXXX..."
              />
            </div>
            <div>
              <Label htmlFor="git">Git Commit Hash (optional)</Label>
              <Input
                id="git"
                value={gitHash}
                onChange={(e) => setGitHash(e.target.value)}
                placeholder="abc123def456..."
              />
            </div>
            <Button onClick={handleSubmitRevision} className="w-full" disabled={!ipfsHash}>
              Submit Revision
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Revision History */}
      {revisions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Revision History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {revisions.map((revision) => (
                <div key={revision.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Badge>Revision #{revision.revision_number}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(revision.submitted_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm font-mono text-muted-foreground break-all mb-2">
                    {revision.ipfs_hash}
                  </p>
                  {revision.git_commit_hash && (
                    <p className="text-sm font-mono text-muted-foreground flex items-center gap-2">
                      <GitCommit className="h-4 w-4" />
                      {revision.git_commit_hash}
                    </p>
                  )}
                  {revision.notes && (
                    <p className="text-sm text-muted-foreground mt-2">{revision.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}