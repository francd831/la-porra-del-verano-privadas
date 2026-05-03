-- Actualizar los partidos R32 para usar el formato correcto de ID y round
UPDATE matches 
SET round = 'Dieciseisavos de Final'
WHERE round = 'round_of_32';

-- Actualizar los IDs de R32-X a R32_X
UPDATE matches SET id = 'R32_1' WHERE id = 'R32-1';
UPDATE matches SET id = 'R32_2' WHERE id = 'R32-2';
UPDATE matches SET id = 'R32_3' WHERE id = 'R32-3';
UPDATE matches SET id = 'R32_4' WHERE id = 'R32-4';
UPDATE matches SET id = 'R32_5' WHERE id = 'R32-5';
UPDATE matches SET id = 'R32_6' WHERE id = 'R32-6';
UPDATE matches SET id = 'R32_7' WHERE id = 'R32-7';
UPDATE matches SET id = 'R32_8' WHERE id = 'R32-8';
UPDATE matches SET id = 'R32_9' WHERE id = 'R32-9';
UPDATE matches SET id = 'R32_10' WHERE id = 'R32-10';
UPDATE matches SET id = 'R32_11' WHERE id = 'R32-11';
UPDATE matches SET id = 'R32_12' WHERE id = 'R32-12';
UPDATE matches SET id = 'R32_13' WHERE id = 'R32-13';
UPDATE matches SET id = 'R32_14' WHERE id = 'R32-14';
UPDATE matches SET id = 'R32_15' WHERE id = 'R32-15';
UPDATE matches SET id = 'R32_16' WHERE id = 'R32-16';