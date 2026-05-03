-- Actualizar fechas para partidos del Grupo I
UPDATE matches SET match_date = '2026-06-11 18:00:00+00' WHERE id = 'I_KOR_SUI';
UPDATE matches SET match_date = '2026-06-11 21:00:00+00' WHERE id = 'I_COL_SRB';
UPDATE matches SET match_date = '2026-06-16 18:00:00+00' WHERE id = 'I_KOR_SRB';
UPDATE matches SET match_date = '2026-06-16 21:00:00+00' WHERE id = 'I_SUI_COL';
UPDATE matches SET match_date = '2026-06-21 18:00:00+00' WHERE id = 'I_KOR_COL';
UPDATE matches SET match_date = '2026-06-21 18:00:00+00' WHERE id = 'I_SUI_SRB';

-- Actualizar fechas para partidos del Grupo J
UPDATE matches SET match_date = '2026-06-12 15:00:00+00' WHERE id = 'J_WAL_QAT';
UPDATE matches SET match_date = '2026-06-12 18:00:00+00' WHERE id = 'J_ECU_IRN';
UPDATE matches SET match_date = '2026-06-17 15:00:00+00' WHERE id = 'J_QAT_IRN';
UPDATE matches SET match_date = '2026-06-17 18:00:00+00' WHERE id = 'J_ECU_WAL';
UPDATE matches SET match_date = '2026-06-22 15:00:00+00' WHERE id = 'J_WAL_IRN';
UPDATE matches SET match_date = '2026-06-22 15:00:00+00' WHERE id = 'J_ECU_QAT';

-- Actualizar fechas para partidos del Grupo K
UPDATE matches SET match_date = '2026-06-13 15:00:00+00' WHERE id = 'K_SAU_CZE';
UPDATE matches SET match_date = '2026-06-13 18:00:00+00' WHERE id = 'K_AUT_CRC';
UPDATE matches SET match_date = '2026-06-18 15:00:00+00' WHERE id = 'K_SAU_CRC';
UPDATE matches SET match_date = '2026-06-18 18:00:00+00' WHERE id = 'K_AUT_CZE';
UPDATE matches SET match_date = '2026-06-23 15:00:00+00' WHERE id = 'K_SAU_AUT';
UPDATE matches SET match_date = '2026-06-23 15:00:00+00' WHERE id = 'K_CZE_CRC';

-- Actualizar fechas para partidos del Grupo L
UPDATE matches SET match_date = '2026-06-14 15:00:00+00' WHERE id = 'L_PAR_NGA';
UPDATE matches SET match_date = '2026-06-14 18:00:00+00' WHERE id = 'L_EGY_CMR';
UPDATE matches SET match_date = '2026-06-19 15:00:00+00' WHERE id = 'L_PAR_CMR';
UPDATE matches SET match_date = '2026-06-19 18:00:00+00' WHERE id = 'L_NGA_EGY';
UPDATE matches SET match_date = '2026-06-24 15:00:00+00' WHERE id = 'L_PAR_EGY';
UPDATE matches SET match_date = '2026-06-24 15:00:00+00' WHERE id = 'L_NGA_CMR';