UPDATE public.recipes
SET process = (
  SELECT jsonb_agg(
    CASE
      WHEN step->>'id' = 'medium' THEN step || jsonb_build_object('branch_label','Medium Cookies','label','3 tbsp per scoop, bake 10-11 mins at 350°F.')
      WHEN step->>'id' = 'large' THEN step || jsonb_build_object('branch_label','Large Cookies','label','1/3 cup per scoop, bake 14-15 mins at 350°F.')
      ELSE step
    END
    ORDER BY ord
  )
  FROM jsonb_array_elements(process) WITH ORDINALITY AS t(step, ord)
)
WHERE slug = 'chocolate-chip-cookie';