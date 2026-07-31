UPDATE public.recipes
SET process = (
  SELECT jsonb_agg(
    (
      CASE
        WHEN step->>'label' LIKE '%.' AND (step->>'label') !~ '\. '
          THEN step || jsonb_build_object('label', left(step->>'label', length(step->>'label') - 1))
        ELSE step
      END
    )
    ||
    (
      CASE
        WHEN step->>'detail' LIKE '%.' AND (step->>'detail') !~ '\. '
          THEN jsonb_build_object('detail', left(step->>'detail', length(step->>'detail') - 1))
        ELSE '{}'::jsonb
      END
    )
    ORDER BY ord
  )
  FROM jsonb_array_elements(process) WITH ORDINALITY AS t(step, ord)
)
WHERE jsonb_array_length(process) > 0;