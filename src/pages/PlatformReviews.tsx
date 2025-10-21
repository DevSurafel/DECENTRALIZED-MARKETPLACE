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
        review_text,
        created_at,
        user_id
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const reviewsWithDetails = await Promise.all(
      ((data || []) as any[]).map(async (review) => {
        const { data: reviewer } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .eq('id', review.user_id)
          .maybeSingle();

        return {
          id: review.id,
          rating: review.rating,
          comment: review.review_text,
          created_at: review.created_at,
          reviewer: reviewer || { id: review.user_id, display_name: null, avatar_url: null, user_type: 'both' },
          job: { title: 'Platform Review' }
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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      {/* Enhanced animated background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-20 left-10 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      <Navbar />
      
      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl md:text-6xl font-bold mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Platform Reviews
          </h1>
          <p className="text-base md:text-lg text-muted-foreground">
            See what our users think about DeFiLance
          </p>
        </div>

        {loading ? (
          <Card className="p-8 text-center glass-card shadow-card">
            <p className="text-muted-foreground">Loading reviews...</p>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-4 gap-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            {/* Stats Sidebar */}
            <Card className="p-6 h-fit space-y-6 glass-card shadow-card hover:shadow-glow transition-smooth">
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
                <Card className="p-8 text-center glass-card shadow-card">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No platform reviews yet</p>
                </Card>
              ) : (
                reviews.map((review, index) => (
                  <Card 
                    key={review.id} 
                    className="p-6 glass-card shadow-card hover:shadow-glow transition-smooth animate-fade-in"
                    style={{ animationDelay: `${0.2 + index * 0.1}s` }}
                  >
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
