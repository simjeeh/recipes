UPDATE public.recipes
SET process = (
  SELECT jsonb_agg(
    (
      SELECT jsonb_object_agg(
        CASE WHEN kv.key = 'parent_ids' THEN 'parents' ELSE kv.key END,
        kv.value
      )
      FROM jsonb_each(e) AS kv
    )
  )
  FROM jsonb_array_elements(process) AS e
)
WHERE process @? '$[*] ? (@.parent_ids != null)';