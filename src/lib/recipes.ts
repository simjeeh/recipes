/** Optional pointer from an ingredient or step to another recipe on the site. */
export type RecipeLink = {
  slug: string;
  category: string;
};

export type Ingredient = {
  amount: string;
  unit: string;
  name: string;
  /** Secret ingredients are stripped from public reads and only shown to admins. */
  secret?: boolean;
  /** Optional ingredients are shown with an "(optional)" marker. */
  optional?: boolean;
  /** Links this ingredient to another recipe. */
  link?: RecipeLink;
};

export type ProcessStep = {
  id: string;
  label: string;
  detail?: string;
  parents: string[];
  branch_label?: string;
  /**
   * Alternative steps sit side by side as mutually exclusive options ("or").
   * Steps sharing a level without this flag are done at the same time.
   */
  alternative?: boolean;
  /** Secret steps are stripped from public reads and only shown to admins. */
  secret?: boolean;
  /** Links this step to another recipe. */
  link?: RecipeLink;
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
  "Components",
] as const;

export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number];

/** URL segment for a category, e.g. "Desserts" -> "desserts". */
export function categorySlug(category: string): string {
  return category.toLowerCase().replace(/\s+/g, "-");
}

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
  const amount = (ingredient.amount ?? "").trim();
  const unit = (ingredient.unit ?? "").trim();
  const name = (ingredient.name ?? "").trim();

  // Tight metric style: 100g sugar, 250ml milk. Imperial/volume units keep a space.
  const tightMetric = /^(g|kg|mg|ml|l)$/i.test(unit) && /^[\d./-]+$/.test(amount);
  const measure = tightMetric ? `${amount}${unit}` : [amount, unit].filter(Boolean).join(" ");

  return [measure, name].filter(Boolean).join(" ");
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

/**
 * A row in the process flow. `steps` holds one step (plain) or several done at
 * the same time; `options` holds mutually exclusive branches, each an ordered
 * chain of steps.
 */
export type ProcessRow =
  | { kind: "steps"; steps: ProcessStep[] }
  | { kind: "options"; branches: ProcessStep[][] };

/** Steps reachable from `rootId` and from no other branch root. */
function exclusiveChain(steps: ProcessStep[], rootId: string, otherRoots: string[]): ProcessStep[] {
  const ancestors = new Map<string, Set<string>>();
  const resolve = (id: string, seen: Set<string>): Set<string> => {
    if (ancestors.has(id)) return ancestors.get(id)!;
    if (seen.has(id)) return new Set();
    seen.add(id);
    const step = steps.find((s) => s.id === id);
    const set = new Set<string>();
    for (const parent of step?.parents ?? []) {
      set.add(parent);
      for (const grand of resolve(parent, seen)) set.add(grand);
    }
    ancestors.set(id, set);
    return set;
  };

  return steps.filter((step) => {
    const set = resolve(step.id, new Set());
    return set.has(rootId) && !otherRoots.some((other) => set.has(other));
  });
}

/** Turns a flat step graph into ordered rows for rendering and editing. */
export function toProcessRows(steps: ProcessStep[]): ProcessRow[] {
  const levels = layoutSteps(steps);
  const order = new Map(steps.map((step, index) => [step.id, index]));
  const consumed = new Set<string>();
  const rows: ProcessRow[] = [];

  levels.forEach((level, levelIndex) => {
    const remaining = level.filter((step) => !consumed.has(step.id));
    if (!remaining.length) return;

    if (remaining.length > 1 && remaining.every((step) => step.alternative)) {
      const roots = remaining.map((step) => step.id);
      const branches = remaining.map((head) => {
        const rest = exclusiveChain(
          steps,
          head.id,
          roots.filter((id) => id !== head.id),
        )
          .filter((step) => !consumed.has(step.id))
          .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
        rest.forEach((step) => consumed.add(step.id));
        return [head, ...rest];
      });
      remaining.forEach((step) => consumed.add(step.id));
      rows.push({ kind: "options", branches });
      return;
    }

    remaining.forEach((step) => consumed.add(step.id));
    rows.push({ kind: "steps", steps: remaining });
    void levelIndex;
  });

  return rows;
}

/** Inverse of `toProcessRows` — rebuilds parent links from row structure. */
export function rowsToSteps(rows: ProcessRow[]): ProcessStep[] {
  const result: ProcessStep[] = [];
  let tails: string[] = [];

  for (const row of rows) {
    if (row.kind === "steps") {
      const steps = row.steps.filter((step) => step.label.trim() || step.detail?.trim());
      if (!steps.length) continue;
      for (const step of steps) {
        result.push({ ...step, parents: tails, alternative: false });
      }
      tails = steps.map((step) => step.id);
      continue;
    }

    const branches = row.branches
      .map((branch) => branch.filter((step) => step.label.trim() || step.detail?.trim()))
      .filter((branch) => branch.length);
    if (!branches.length) continue;

    const nextTails: string[] = [];
    for (const branch of branches) {
      branch.forEach((step, index) => {
        result.push({
          ...step,
          parents: index === 0 ? tails : [branch[index - 1].id],
          alternative: index === 0,
        });
      });
      nextTails.push(branch[branch.length - 1].id);
    }
    tails = nextTails;
  }

  return result;
}

export function recipeDescription(recipe: Recipe): string {
  const first = recipe.ingredients
    .slice(0, 4)
    .map((i) => i.name)
    .join(", ");
  return `${recipe.title} — ${recipe.ingredients.length} ingredients, ${recipe.process.length} steps. ${first}${recipe.ingredients.length > 4 ? ", and more." : "."}`;
}