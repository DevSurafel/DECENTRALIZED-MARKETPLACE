-- Add new status for Telegram escrow verification
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'awaiting_escrow_verification';

-- This status indicates that seller has transferred ownership to escrow (@defiescrow)
-- and now waiting for admin to verify and complete the transfer to buyer