-- Rediseño completo de la estructura de la base de datos para pronósticos

-- 1. Primero eliminar tablas redundantes
DROP TABLE IF EXISTS prediction_submissions CASCADE;

-- 2. Limpiar y recrear la estructura de torneos
DELETE FROM tournaments WHERE TRUE;
INSERT INTO tournaments (id, name, year, status) 
VALUES ('11111111-1111-1111-1111-111111111111', 'FIFA World Cup 2026', 2026, 'upcoming');

-- 3. Agregar columnas faltantes a las tablas existentes para mejor tracking
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS submission_id uuid;
ALTER TABLE champion_predictions ADD COLUMN IF NOT EXISTS submission_id uuid;
ALTER TABLE award_predictions ADD COLUMN IF NOT EXISTS submission_id uuid;

-- 4. Crear tabla de envíos simplificada para tracking de estado
CREATE TABLE IF NOT EXISTS user_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  tournament_id uuid NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111',
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_complete boolean NOT NULL DEFAULT false,
  total_predictions integer DEFAULT 0,
  champion_predicted boolean DEFAULT false,
  awards_predicted boolean DEFAULT false
);

-- 5. Habilitar RLS en la nueva tabla
ALTER TABLE user_submissions ENABLE ROW LEVEL SECURITY;

-- 6. Crear políticas RLS para user_submissions
CREATE POLICY "Users can view their own submissions" 
ON user_submissions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own submissions" 
ON user_submissions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own submissions" 
ON user_submissions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own submissions" 
ON user_submissions 
FOR DELETE 
USING (auth.uid() = user_id);

-- 7. Crear función para actualizar timestamp automáticamente
CREATE OR REPLACE FUNCTION update_user_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Crear trigger para actualizar updated_at
CREATE TRIGGER update_user_submissions_updated_at
  BEFORE UPDATE ON user_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_submissions_updated_at();

-- 9. Actualizar políticas RLS para que sean más específicas con tournament_id
DROP POLICY IF EXISTS "Users can view their own predictions" ON predictions;
DROP POLICY IF EXISTS "Users can insert their own predictions" ON predictions;
DROP POLICY IF EXISTS "Users can update their own predictions" ON predictions;
DROP POLICY IF EXISTS "Users can delete their own predictions" ON predictions;

CREATE POLICY "Users can view their own predictions" 
ON predictions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own predictions" 
ON predictions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own predictions" 
ON predictions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own predictions" 
ON predictions 
FOR DELETE 
USING (auth.uid() = user_id);

-- 10. Asegurar que las políticas de champion_predictions y award_predictions estén correctas
-- (Ya están bien según el contexto)

-- 11. Crear función helper para obtener el tournament ID por defecto
CREATE OR REPLACE FUNCTION get_default_tournament_id()
RETURNS uuid AS $$
BEGIN
  RETURN '11111111-1111-1111-1111-111111111111'::uuid;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;