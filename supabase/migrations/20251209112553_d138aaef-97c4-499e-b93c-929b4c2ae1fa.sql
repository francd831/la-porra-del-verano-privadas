-- Primero eliminar los grupos incorrectos
DELETE FROM groups WHERE id IN ('group-i', 'group-j', 'group-k', 'group-l');

-- Insertar los grupos con el formato correcto (igual que A-H)
INSERT INTO groups (id, name, tournament_id) VALUES 
  ('I', 'Grupo I', '11111111-1111-1111-1111-111111111111'),
  ('J', 'Grupo J', '11111111-1111-1111-1111-111111111111'),
  ('K', 'Grupo K', '11111111-1111-1111-1111-111111111111'),
  ('L', 'Grupo L', '11111111-1111-1111-1111-111111111111');