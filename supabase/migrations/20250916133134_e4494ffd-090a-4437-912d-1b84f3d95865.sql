-- Phase 2: Fix database structure security issues
-- Make user_id NOT NULL in prediction_submissions to prevent data inconsistencies
-- This is critical for RLS policies to work properly

-- First, let's check if there are any records with NULL user_id and clean them up
DELETE FROM public.prediction_submissions WHERE user_id IS NULL;

-- Now make the column NOT NULL to enforce data integrity
ALTER TABLE public.prediction_submissions 
ALTER COLUMN user_id SET NOT NULL;

-- Add a comment to document this security requirement
COMMENT ON COLUMN public.prediction_submissions.user_id IS 'Required for RLS policies - must never be NULL';