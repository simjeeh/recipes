WITH exploded AS (
  SELECT r.id AS recipe_id, s.step, s.ord
  FROM public.recipes r
  CROSS JOIN LATERAL jsonb_array_elements(r.process::jsonb) WITH ORDINALITY AS s(step, ord)
), flagged AS (
  SELECT e.recipe_id, e.ord,
    CASE WHEN e.step ? 'branch_label' AND EXISTS (
      SELECT 1 FROM exploded o
      WHERE o.recipe_id = e.recipe_id AND o.ord <> e.ord
        AND o.step ? 'branch_label'
        AND COALESCE(o.step->'parents', '[]'::jsonb) = COALESCE(e.step->'parents', '[]'::jsonb)
    ) THEN e.step || '{"alternative": true}'::jsonb
    ELSE e.step END AS step
  FROM exploded e
), rebuilt AS (
  SELECT recipe_id, jsonb_agg(step ORDER BY ord) AS process
  FROM flagged GROUP BY recipe_id
)
UPDATE public.recipes r
SET process = rebuilt.process
FROM rebuilt
WHERE r.id = rebuilt.recipe_id AND r.process::jsonb <> rebuilt.process;