-- Add USDC columns and update existing data
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS budget_usdc NUMERIC,
ADD COLUMN IF NOT EXISTS freelancer_stake_usdc NUMERIC DEFAULT 0;

-- Migrate existing ETH values to USDC (assuming 1 ETH = 2000 USDC for migration)
UPDATE jobs 
SET budget_usdc = budget_eth * 2000 
WHERE budget_usdc IS NULL AND budget_eth IS NOT NULL;

-- Update freelancer stake
UPDATE jobs 
SET freelancer_stake_usdc = freelancer_stake_eth * 2000 
WHERE freelancer_stake_usdc IS NULL AND freelancer_stake_eth IS NOT NULL;

-- Make budget_usdc required for new jobs
ALTER TABLE jobs 
ALTER COLUMN budget_usdc SET NOT NULL,
ALTER COLUMN budget_usdc SET DEFAULT 0;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_jobs_budget_usdc ON jobs(budget_usdc);

-- Update bids table to use USDC
ALTER TABLE bids 
ADD COLUMN IF NOT EXISTS bid_amount_usdc NUMERIC;

-- Migrate existing bid amounts
UPDATE bids 
SET bid_amount_usdc = bid_amount_eth * 2000 
WHERE bid_amount_usdc IS NULL AND bid_amount_eth IS NOT NULL;

ALTER TABLE bids 
ALTER COLUMN bid_amount_usdc SET NOT NULL,
ALTER COLUMN bid_amount_usdc SET DEFAULT 0;

-- Update disputes table
ALTER TABLE disputes 
ADD COLUMN IF NOT EXISTS arbitration_deposit_usdc NUMERIC,
ADD COLUMN IF NOT EXISTS client_amount_usdc NUMERIC,
ADD COLUMN IF NOT EXISTS freelancer_amount_usdc NUMERIC;

-- Update job_milestones table
ALTER TABLE job_milestones 
ADD COLUMN IF NOT EXISTS amount_usdc NUMERIC;

UPDATE job_milestones 
SET amount_usdc = amount_eth * 2000 
WHERE amount_usdc IS NULL AND amount_eth IS NOT NULL;

-- Update profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS total_earnings_usdc NUMERIC DEFAULT 0;

UPDATE profiles 
SET total_earnings_usdc = total_earnings * 2000 
WHERE total_earnings_usdc IS NULL AND total_earnings IS NOT NULL;