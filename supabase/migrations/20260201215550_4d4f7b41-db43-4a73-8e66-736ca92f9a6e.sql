-- Add prize access fields to user_submissions table
ALTER TABLE public.user_submissions
ADD COLUMN IF NOT EXISTS prize_participation_requested boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS prize_payment_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS prize_payment_date timestamp with time zone DEFAULT null;

-- Create index for prize filtering
CREATE INDEX IF NOT EXISTS idx_user_submissions_prize_payment 
ON public.user_submissions(prize_payment_completed) 
WHERE prize_payment_completed = true;