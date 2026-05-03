-- Agregar políticas DELETE faltantes para mayor seguridad
-- Estas políticas permiten a los usuarios eliminar solo sus propios datos

-- Política DELETE para prediction_submissions
CREATE POLICY "Users can delete their own submissions" 
ON public.prediction_submissions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Política DELETE para profiles  
CREATE POLICY "Users can delete their own profile" 
ON public.profiles 
FOR DELETE 
USING (auth.uid() = user_id);

-- Agregar políticas más restrictivas para bloquear acceso no autenticado
-- Estas políticas aseguran que solo usuarios autenticados puedan acceder a los datos

-- Política para prevenir acceso anónimo a prediction_submissions
CREATE POLICY "Block anonymous access to submissions" 
ON public.prediction_submissions 
FOR ALL 
TO anon
USING (false);

-- Política para prevenir acceso anónimo a profiles
CREATE POLICY "Block anonymous access to profiles" 
ON public.profiles 
FOR ALL 
TO anon
USING (false);

-- Comentarios para documentar las políticas de seguridad
COMMENT ON TABLE public.prediction_submissions IS 'Contiene datos personales sensibles - protegido por RLS para acceso solo del usuario propietario';
COMMENT ON TABLE public.profiles IS 'Contiene información personal del usuario - protegido por RLS para acceso solo del usuario propietario';