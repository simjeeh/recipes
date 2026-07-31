UPDATE public.recipes
SET process = (
  SELECT jsonb_agg(
    CASE
      WHEN step->>'id' = 'bb-7' THEN jsonb_build_object(
        'id','bb-7','label','Pot 2 — warm milk',
        'detail','{half(3*n/4)} cups milk, temp at 175°F',
        'parents', jsonb_build_array('bb-1')
      )
      WHEN step->>'id' = 'bb-8' THEN jsonb_build_object(
        'id','bb-8','label','Add water from pot 1 and tea to pot 2',
        'detail','{n*6}g loose tea (CTC tea leaves)',
        'parents', jsonb_build_array('bb-6','bb-7')
      )
      ELSE step
    END ORDER BY ord
  )
  FROM jsonb_array_elements(process) WITH ORDINALITY AS t(step, ord)
),
updated_at = now()
WHERE slug = 'chai';