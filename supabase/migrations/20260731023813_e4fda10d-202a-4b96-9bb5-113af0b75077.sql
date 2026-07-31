ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Main';
ALTER TABLE public.recipes ADD CONSTRAINT recipes_category_check CHECK (category IN ('Main','Breakfast','Sides','Snacks','Drinks','Sauces'));
UPDATE public.recipes SET category = 'Breakfast' WHERE slug = 'acai-bowl';