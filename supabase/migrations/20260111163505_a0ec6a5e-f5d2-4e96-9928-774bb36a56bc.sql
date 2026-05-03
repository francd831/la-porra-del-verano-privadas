-- Añadir política para que admins puedan insertar partidos de playoff
CREATE POLICY "Admins can insert matches" 
ON public.matches 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Añadir política para que admins puedan eliminar partidos
CREATE POLICY "Admins can delete matches" 
ON public.matches 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Añadir política para que admins puedan eliminar tournament_winners
CREATE POLICY "Admins can delete tournament winners" 
ON public.tournament_winners 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));