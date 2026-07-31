export type Ingredient = {
  amount: string;
  unit: string;
  name: string;
  /** Secret ingredients are stripped from public reads and only shown to admins. */
  secret?: boolean;
};

export type ProcessStep = {
  id: string;
  label: string;
  detail?: string;
  parents: string[];
  branch_label?: string;
  /** Secret steps are stripped from public reads and only shown to admins. */
  secret?: boolean;
};

export type Recipe = {
  id: string;
  title: string;
  slug: string;
  category: RecipeCategory;
  ingredients: Ingredient[];
  process: ProcessStep[];
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
};

export type RecipeSummary = Pick<
  Recipe,
  "id" | "title" | "slug" | "category" | "is_hidden" | "updated_at"
> & { ingredientCount: number; stepCount: number };

export const RECIPE_CATEGORIES = [
  "Main",
  "Breakfast",
  "Sides",
  "Snacks",
  "Desserts",
  "Drinks",
  "Sauces",
] as const;

export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number];

/** Lightweight fuzzy match: every query char appears in order in the target. */
export function fuzzyMatch(query: string, target: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const t = target.toLowerCase();
  let i = 0;
  for (const char of t) {
    if (char === q[i]) i += 1;
    if (i === q.length) return true;
  }
  return false;
}

export function formatIngredient(ingredient: Ingredient): string {
  return [ingredient.amount, ingredient.unit, ingredient.name]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

/**
 * Groups steps into dependency levels (level 0 = no parents). Steps sharing a
 * level happen in parallel; this drives both flow-chart implementations.
 */
export function layoutSteps(steps: ProcessStep[]): ProcessStep[][] {
  const byId = new Map(steps.map((step) => [step.id, step]));
  const level = new Map<string, number>();

  const resolve = (id: string, seen: Set<string>): number => {
    if (level.has(id)) return level.get(id)!;
    if (seen.has(id)) return 0;
    seen.add(id);
    const step = byId.get(id);
    const parents = (step?.parents ?? []).filter((p) => byId.has(p));
    const value = parents.length
      ? Math.max(...parents.map((p) => resolve(p, seen))) + 1
      : 0;
    level.set(id, value);
    return value;
  };

  steps.forEach((step) => resolve(step.id, new Set()));

  const depth = steps.length ? Math.max(...steps.map((s) => level.get(s.id) ?? 0)) : -1;
  const levels: ProcessStep[][] = Array.from({ length: depth + 1 }, () => []);
  steps.forEach((step) => levels[level.get(step.id) ?? 0].push(step));
  return levels;
}

export function stepEdges(steps: ProcessStep[]): { from: string; to: string; label?: string }[] {
  const ids = new Set(steps.map((s) => s.id));
  return steps.flatMap((step) =>
    (step.parents ?? [])
      .filter((parent) => ids.has(parent))
      .map((parent) => ({ from: parent, to: step.id, label: step.branch_label })),
  );
}

export function recipeDescription(recipe: Recipe): string {
  const first = recipe.ingredients
    .slice(0, 4)
    .map((i) => i.name)
    .join(", ");
  return `${recipe.title} — ${recipe.ingredients.length} ingredients, ${recipe.process.length} steps. ${first}${recipe.ingredients.length > 4 ? ", and more." : "."}`;
}