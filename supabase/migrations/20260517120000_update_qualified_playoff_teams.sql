UPDATE public.teams
SET name = CASE id
    WHEN 'EURD' THEN 'Rep. Checa'
    WHEN 'EURA' THEN 'Bosnia & Herz.'
    WHEN 'EURC' THEN 'Turquía'
    WHEN 'EURB' THEN 'Suecia'
    WHEN 'PLY2' THEN 'Irak'
    WHEN 'PLY1' THEN 'RD Congo'
    ELSE name
  END,
  code = CASE id
    WHEN 'EURD' THEN 'CZE'
    WHEN 'EURA' THEN 'BIH'
    WHEN 'EURC' THEN 'TUR'
    WHEN 'EURB' THEN 'SWE'
    WHEN 'PLY2' THEN 'IRQ'
    WHEN 'PLY1' THEN 'COD'
    ELSE code
  END
WHERE id IN ('EURD', 'EURA', 'EURC', 'EURB', 'PLY2', 'PLY1');
