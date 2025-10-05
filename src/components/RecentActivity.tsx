import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, MessageSquare, DollarSign, Briefcase, Star, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ActivityItem {
  id: string;
  type: 'job_completed' | 'message' | 'payment' | 'bid_accepted' | 'review' | 'dispute';
  text: string;
  time: string;
  path: string;
  icon: any;
  color: string;
}

export function RecentActivity({ userId }: { userId?: string }) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (userId) {
      fetchRecentActivity();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchRecentActivity = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const activities: ActivityItem[] = [];

      // Fetch recent completed jobs (increased limit)
      const { data: completedJobs } = await supabase
        .from('jobs')
        .select('id, title, completed_at, status')
        .or(`client_id.eq.${userId},freelancer_id.eq.${userId}`)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(5);

      completedJobs?.forEach(job => {
        activities.push({
          id: `job-${job.id}`,
          type: 'job_completed',
          text: `Job "${job.title}" completed`,
          time: formatTime(job.completed_at),
          path: `/jobs/${job.id}`,
          icon: CheckCircle,
          color: 'text-success'
        });
      });

      // Fetch recent messages (increased limit)
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id, last_message_at')
        .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
        .order('last_message_at', { ascending: false })
        .limit(5);

      conversations?.forEach(conv => {
        activities.push({
          id: `msg-${conv.id}`,
          type: 'message',
          text: 'New message received',
          time: formatTime(conv.last_message_at),
          path: `/chat?conversation=${conv.id}`,
          icon: MessageSquare,
          color: 'text-primary'
        });
      });

      // Fetch recent bids accepted (increased limit)
      const { data: acceptedBids } = await supabase
        .from('jobs')
        .select('id, title, started_at')
        .eq('freelancer_id', userId)
        .eq('status', 'in_progress')
        .not('started_at', 'is', null)
        .order('started_at', { ascending: false })
        .limit(5);

      acceptedBids?.forEach(job => {
        activities.push({
          id: `bid-${job.id}`,
          type: 'bid_accepted',
          text: `Bid accepted for "${job.title}"`,
          time: formatTime(job.started_at),
          path: `/jobs/${job.id}`,
          icon: Briefcase,
          color: 'text-accent'
        });
      });

      // Fetch recent reviews received (increased limit)
      const { data: reviews } = await supabase
        .from('reviews')
        .select('id, created_at, job_id, rating')
        .eq('reviewee_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      reviews?.forEach(review => {
        activities.push({
          id: `review-${review.id}`,
          type: 'review',
          text: `Received ${review.rating}-star review`,
          time: formatTime(review.created_at),
          path: `/jobs/${review.job_id}`,
          icon: Star,
          color: 'text-warning'
        });
      });

      // Fetch recent disputes (increased limit)
      const { data: disputes } = await supabase
        .from('disputes')
        .select('id, raised_at, job_id, jobs(title)')
        .eq('raised_by', userId)
        .order('raised_at', { ascending: false })
        .limit(5);

      disputes?.forEach(dispute => {
        activities.push({
          id: `dispute-${dispute.id}`,
          type: 'dispute',
          text: `Dispute raised for "${(dispute.jobs as any)?.title}"`,
          time: formatTime(dispute.raised_at),
          path: `/jobs/${dispute.job_id}`,
          icon: AlertCircle,
          color: 'text-destructive'
        });
      });

      // Sort all activities by time (most recent first)
      activities.sort((a, b) => {
        const timeA = new Date(a.time).getTime();
        const timeB = new Date(b.time).getTime();
        return timeB - timeA;
      });

      // Show at least 3 activities if available, up to 10
      const displayCount = Math.max(Math.min(activities.length, 10), 3);
      setActivities(activities.slice(0, displayCount));
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return 'Recently';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-start gap-3 pb-3 border-b last:border-0 animate-pulse">
            <div className="h-4 w-4 mt-1 bg-muted rounded"></div>
            <div className="flex-1">
              <div className="h-4 w-32 bg-muted rounded mb-1"></div>
              <div className="h-3 w-16 bg-muted rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        No recent activity yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((item) => (
        <div 
          key={item.id} 
          className="flex items-start gap-3 pb-3 border-b last:border-0 cursor-pointer hover:bg-accent/5 -mx-2 px-2 py-1 rounded transition-colors"
          onClick={() => navigate(item.path)}
        >
          <item.icon className={`h-4 w-4 mt-1 ${item.color}`} />
          <div className="flex-1">
            <p className="text-sm font-medium">{item.text}</p>
            <p className="text-xs text-muted-foreground">{item.time}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default RecentActivity;
