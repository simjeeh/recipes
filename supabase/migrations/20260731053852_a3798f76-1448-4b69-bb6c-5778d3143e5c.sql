ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS scale jsonb;

UPDATE public.recipes
SET scale = jsonb_build_object('label', 'Cups', 'default', 2),
    process = '[
  {"id":"sb-1","label":"Caramelize sugar","detail":"Sugar with just enough water to dissolve, wait until it turns brown","parents":[],"alternative":true,"branch_label":"Small batch"},
  {"id":"sb-2","label":"Add water","detail":"Temp at 212°F","parents":["sb-1"]},
  {"id":"sb-3","label":"Wait for boil and add cloves","parents":["sb-2"]},
  {"id":"sb-4","label":"Wait 5 mins and add spices","detail":"Saffron (optional), crushed cardamom pods, cinnamon stick","parents":["sb-3"]},
  {"id":"sb-5","label":"Wait 3 mins and add tea","detail":"Star anise, loose tea, pinch of salt","parents":["sb-4"]},
  {"id":"sb-6","label":"Wait 3 mins and lower temp to 175°F","parents":["sb-5"]},
  {"id":"sb-7","label":"Add milk","parents":["sb-6"]},
  {"id":"sb-8","label":"Wait 4 mins","parents":["sb-7"]},
  {"id":"bb-1","label":"Pot 1 — caramelize sugar","detail":"Sugar with just enough water to dissolve, wait until it turns brown","parents":[],"alternative":true,"branch_label":"Big batch"},
  {"id":"bb-2","label":"Add water","detail":"Temp at 212°F","parents":["bb-1"]},
  {"id":"bb-3","label":"Wait for boil and add cloves","parents":["bb-2"]},
  {"id":"bb-4","label":"Wait 5 mins and add spices","detail":"Saffron (optional), crushed cardamom pods, cinnamon stick","parents":["bb-3"]},
  {"id":"bb-5","label":"Wait 3 mins and add","detail":"Star anise, tiniest pinch of salt","parents":["bb-4"]},
  {"id":"bb-6","label":"Wait 4 mins and drain","parents":["bb-5"]},
  {"id":"bb-7","label":"Pot 2 — warm milk","detail":"Temp at 175°F","parents":["bb-1"]},
  {"id":"bb-8","label":"Add water from pot 1 and tea to pot 2","detail":"Loose tea (CTC tea leaves)","parents":["bb-6","bb-7"]},
  {"id":"bb-9","label":"Wait 4 mins","parents":["bb-8"]}
]'::jsonb
WHERE slug = 'chai';