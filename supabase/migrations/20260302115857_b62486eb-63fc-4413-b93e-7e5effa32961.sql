-- Fix F_1 match: it has wrong teams (BRA vs HAI from Group C instead of Group F teams)
-- The missing Group F matchup is NED vs JPN
UPDATE matches 
SET home_team_id = 'NED', away_team_id = 'JPN'
WHERE id = 'F_1' AND group_id = 'F';
