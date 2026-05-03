-- Agregar políticas más estrictas para asegurar que solo usuarios autenticados
-- y con acceso específico puedan ver datos sensibles

-- Primero eliminar políticas problemáticas si existen
DROP POLICY IF EXISTS "Block anonymous access to submissions" ON public.prediction_submissions;
DROP POLICY IF EXISTS "Block anonymous access to profiles" ON public.profiles;

-- Recrear políticas más específicas para usuarios autenticados
CREATE POLICY "Authenticated users only - submissions" 
ON public.prediction_submissions 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users only - profiles" 
ON public.profiles 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Denegar explícitamente acceso a usuarios anónimos
CREATE POLICY "Deny all access to anonymous users - submissions" 
ON public.prediction_submissions 
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny all access to anonymous users - profiles" 
ON public.profiles 
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);