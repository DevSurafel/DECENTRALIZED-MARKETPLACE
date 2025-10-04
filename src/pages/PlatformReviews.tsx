import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Star, MessageSquare } from "lucide-react";

interface PlatformReview {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    user_type: string;
  };
  job: {
    title: string;
  };
}


const PlatformReviews = () => {
  const navigate = useNavigate();
const [reviews, setReviews] = useState<PlatformReview[]>([]);

const [loading, setLoading] = useState(true);
const [stats, setStats] = useState({
  average: 0,
  total: 0,
  distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
});

  useEffect(() => {
    loadReviews();
  }, []);

const loadReviews = async () => {
  try {
    // Platform reviews
    const { data, error } = await supabase
      .from('platform_reviews')
      .select(`
        id,
        rating,
        comment,
        created_at,
        reviewer_id,
        job_id
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const reviewsWithDetails = await Promise.all(
      (data || []).map(async (review) => {
        const { data: reviewer } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, user_type')
          .eq('id', review.reviewer_id)
          .single();

        const { data: job } = await supabase
          .from('jobs')
          .select('title')
          .eq('id', review.job_id)
          .single();

        return {
          ...review,
          reviewer: reviewer || { id: review.reviewer_id, display_name: null, avatar_url: null, user_type: 'both' },
          job: job || { title: 'Unknown Job' }
        } as PlatformReview;
      })
    );

    setReviews(reviewsWithDetails);

    // Calculate stats for platform reviews
    if (reviewsWithDetails.length > 0) {
      const total = reviewsWithDetails.length;
      const sum = reviewsWithDetails.reduce((acc, r) => acc + r.rating, 0);
      const average = sum / total;

      const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<5|4|3|2|1, number>;
      reviewsWithDetails.forEach(r => {
        distribution[r.rating as 5|4|3|2|1]++;
      });

      setStats({ average, total, distribution } as any);
    } else {
      setStats({ average: 0, total: 0, distribution: {5:0,4:0,3:0,2:0,1:0} });
    }

  } catch (error) {
    console.error('Error loading reviews:', error);
  } finally {
    setLoading(false);
  }
};

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Platform Reviews</h1>
          <p className="text-muted-foreground">
            See what our users think about DeFiLance
          </p>
        </div>

        {loading ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Loading reviews...</p>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Stats Sidebar */}
            <Card className="p-6 h-fit space-y-6">
              <div className="text-center">
                <div className="text-5xl font-bold mb-2">
                  {stats.average.toFixed(1)}
                </div>
                <div className="flex justify-center mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${
                        star <= Math.round(stats.average)
                          ? 'fill-warning text-warning'
                          : 'text-muted-foreground'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Based on {stats.total} reviews
                </p>
              </div>

              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => (
                  <div key={rating} className="flex items-center gap-2">
                    <span className="text-sm w-3">{rating}</span>
                    <Star className="h-4 w-4 fill-warning text-warning" />
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-warning"
                        style={{
                          width: `${stats.total > 0 ? (stats.distribution[rating as keyof typeof stats.distribution] / stats.total) * 100 : 0}%`
                        }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-8">
                      {stats.distribution[rating as keyof typeof stats.distribution]}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Reviews List */}
            <div className="lg:col-span-3 space-y-6">
              <h2 className="text-xl font-semibold">Platform Reviews</h2>
              {reviews.length === 0 ? (
                <Card className="p-8 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No platform reviews yet</p>
                </Card>
              ) : (
                reviews.map((review) => (
                  <Card key={review.id} className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar
                        className="cursor-pointer"
                        onClick={() => navigate(`/profile/${review.reviewer.id}`)}
                      >
                        <AvatarImage src={review.reviewer.avatar_url || undefined} />
                        <AvatarFallback>
                          {review.reviewer.display_name?.[0] || '?'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="font-semibold cursor-pointer hover:text-primary"
                            onClick={() => navigate(`/profile/${review.reviewer.id}`)}
                          >
                            {review.reviewer.display_name || 'Anonymous'}
                          </span>
                          <span className="text-sm text-muted-foreground">·</span>
                          <span className="text-sm text-muted-foreground">
                            {new Date(review.created_at).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 mb-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= review.rating
                                  ? 'fill-warning text-warning'
                                  : 'text-muted-foreground'
                              }`}
                            />
                          ))}
                        </div>

                        <p className="text-sm text-muted-foreground mb-2">
                          Job: {review.job.title}
                        </p>

                        {review.comment && (
                          <p className="text-foreground">{review.comment}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}

            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PlatformReviews;
