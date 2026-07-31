CREATE TABLE public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  ingredients jsonb NOT NULL DEFAULT '[]'::jsonb,
  process jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.recipes TO anon;
GRANT SELECT, UPDATE ON public.recipes TO authenticated;
GRANT ALL ON public.recipes TO service_role;

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read visible recipes"
  ON public.recipes FOR SELECT TO anon
  USING (is_hidden = false);

CREATE POLICY "Authenticated can read all recipes"
  ON public.recipes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can update recipes"
  ON public.recipes FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER recipes_set_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.recipes (title, slug, ingredients, process, is_hidden) VALUES (
  'Açaí Bowl',
  'acai-bowl',
  '[
    {"amount": "", "unit": "", "name": "Açaí"},
    {"amount": "", "unit": "", "name": "Frozen banana"},
    {"amount": "", "unit": "", "name": "Frozen blueberries"},
    {"amount": "", "unit": "", "name": "Frozen strawberries"},
    {"amount": "1/2", "unit": "cup", "name": "Apple juice"},
    {"amount": "1/2", "unit": "cup", "name": "Greek yogurt"},
    {"amount": "", "unit": "", "name": "Shredded coconut"},
    {"amount": "", "unit": "", "name": "Strawberry"},
    {"amount": "", "unit": "", "name": "Blueberry"},
    {"amount": "", "unit": "", "name": "Banana"},
    {"amount": "", "unit": "", "name": "Granola"},
    {"amount": "", "unit": "", "name": "Chopped almonds"},
    {"amount": "", "unit": "", "name": "Chia seeds"},
    {"amount": "", "unit": "", "name": "Sunflower seeds"},
    {"amount": "", "unit": "", "name": "Pumpkin seeds"}
  ]'::jsonb,
  '[
    {"id": "s1", "label": "Load the blender", "detail": "Add açaí, frozen banana, frozen blueberries, frozen strawberries, apple juice, and Greek yogurt to the blender.", "parents": []},
    {"id": "s2", "label": "Blend until smooth", "detail": "Pulse, then blend until the mixture is thick and creamy with no visible chunks.", "parents": ["s1"]},
    {"id": "s2a", "label": "Add more apple juice", "detail": "Loosen the mixture a splash at a time until it blends freely.", "parents": ["s2"], "branch_label": "if too thick"},
    {"id": "s2b", "label": "Add more frozen fruit", "detail": "A few extra frozen berries will thicken it back to spoonable.", "parents": ["s2"], "branch_label": "if too thin"},
    {"id": "s3", "label": "Pour into bowl", "detail": "Scrape it all out and smooth the surface flat.", "parents": ["s2", "s2a", "s2b"]},
    {"id": "s4", "label": "Add toppings", "detail": "Coconut, strawberry, blueberry, banana, granola, almonds, chia seeds, sunflower seeds, pumpkin seeds.", "parents": ["s3"]},
    {"id": "s5", "label": "Serve immediately", "detail": "Best eaten before it starts to melt.", "parents": ["s4"]}
  ]'::jsonb,
  false
);