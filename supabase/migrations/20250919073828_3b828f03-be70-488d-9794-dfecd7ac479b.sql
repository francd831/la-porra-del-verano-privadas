-- Corregir las advertencias de seguridad de las funciones

-- 1. Corregir la función update_user_submissions_updated_at
DROP TRIGGER IF EXISTS update_user_submissions_updated_at ON public.user_submissions;
DROP FUNCTION IF EXISTS update_user_submissions_updated_at();
CREATE OR REPLACE FUNCTION update_user_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_user_submissions_updated_at
  BEFORE UPDATE ON public.user_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_submissions_updated_at();

-- 2. Corregir la función get_default_tournament_id 
DROP FUNCTION IF EXISTS get_default_tournament_id();
CREATE OR REPLACE FUNCTION get_default_tournament_id()
RETURNS uuid AS $$
BEGIN
  RETURN '11111111-1111-1111-1111-111111111111'::uuid;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;
