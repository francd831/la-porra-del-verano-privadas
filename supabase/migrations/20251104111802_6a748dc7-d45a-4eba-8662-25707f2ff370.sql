-- Add predictions_locked column to tournaments table
ALTER TABLE public.tournaments 
ADD COLUMN predictions_locked BOOLEAN NOT NULL DEFAULT false;

-- Create policy to allow admins to update predictions_locked
CREATE POLICY "Admins can update predictions lock status"
ON public.tournaments
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));