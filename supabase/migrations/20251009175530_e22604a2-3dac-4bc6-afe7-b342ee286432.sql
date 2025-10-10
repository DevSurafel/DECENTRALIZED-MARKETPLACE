-- Recalculate average ratings for all profiles that have reviews
UPDATE profiles
SET average_rating = subquery.avg_rating
FROM (
  SELECT 
    reviewee_id,
    AVG(rating)::numeric(3,2) as avg_rating
  FROM reviews
  GROUP BY reviewee_id
) AS subquery
WHERE profiles.id = subquery.reviewee_id;