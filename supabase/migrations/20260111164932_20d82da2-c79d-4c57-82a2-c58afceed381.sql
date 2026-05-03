-- Eliminar todos los pronósticos del admin
DELETE FROM predictions 
WHERE user_id IN (SELECT user_id FROM user_roles WHERE role = 'admin');

-- Eliminar award_predictions del admin
DELETE FROM award_predictions 
WHERE user_id IN (SELECT user_id FROM user_roles WHERE role = 'admin');

-- Eliminar champion_predictions del admin
DELETE FROM champion_predictions 
WHERE user_id IN (SELECT user_id FROM user_roles WHERE role = 'admin');

-- Eliminar user_submissions del admin
DELETE FROM user_submissions 
WHERE user_id IN (SELECT user_id FROM user_roles WHERE role = 'admin');