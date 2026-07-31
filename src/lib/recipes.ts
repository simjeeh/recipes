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

/** Optional scaling variable, e.g. { label: "Cups", default: 2 }. */
export type RecipeScale = {
  label: string;
  default: number;
};

export type Recipe = {
  id: string;
  title: string;
  slug: string;
  category: RecipeCategory;
  ingredients: Ingredient[];
  process: ProcessStep[];
  scale?: RecipeScale | null;
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
 * the same time; `options` holds mutually exclusive branches. Each branch is a
 * list of rows, so options can nest inside options.
 */
export type ProcessRow =
  | { kind: "steps"; steps: ProcessStep[] }
  | { kind: "options"; branches: ProcessBranch[] };

export type ProcessBranch = { label: string; rows: ProcessRow[] };

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
        return {
          label: head.branch_label ?? "",
          // Recurse so nested alternatives inside a branch become their own rows.
          rows: toProcessRows([head, ...rest]),
        };
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
  emitRows(rows, [], result);
  return result;
}

/** Walks rows depth-first, wiring parents; returns the head and tail step ids. */
function emitRows(
  rows: ProcessRow[],
  incoming: string[],
  out: ProcessStep[],
): { heads: string[]; tails: string[] } {
  let heads: string[] | null = null;
  let current = incoming;

  for (const row of rows) {
    if (row.kind === "steps") {
      const steps = row.steps.filter((step) => step.label.trim() || step.detail?.trim());
      if (!steps.length) continue;
      for (const step of steps) {
        out.push({
          ...step,
          // Amounts live in the ingredients list, never in a step.
          label: stripFormulas(step.label),
          detail: step.detail ? stripFormulas(step.detail) : step.detail,
          parents: current,
          alternative: false,
          branch_label: undefined,
        });
      }
      if (heads === null) heads = steps.map((step) => step.id);
      current = steps.map((step) => step.id);
      continue;
    }

    const rowHeads: string[] = [];
    const nextTails: string[] = [];

    for (const branch of row.branches) {
      const emitted = emitRows(branch.rows, current, out);
      if (!emitted.heads.length) continue;
      const label = branch.label?.trim();
      for (const id of emitted.heads) {
        const step = out.find((item) => item.id === id);
        if (!step) continue;
        step.alternative = true;
        step.branch_label = step.branch_label || label || undefined;
      }
      rowHeads.push(...emitted.heads);
      nextTails.push(...emitted.tails);
    }

    if (!rowHeads.length) continue;
    if (heads === null) heads = rowHeads;
    if (nextTails.length) current = nextTails;
  }

  return { heads: heads ?? [], tails: current };
}

/** All steps inside a row tree, in order. */
export function collectRowSteps(rows: ProcessRow[]): ProcessStep[] {
  return rows.flatMap((row) =>
    row.kind === "steps" ? row.steps : row.branches.flatMap((branch) => collectRowSteps(branch.rows)),
  );
}

export function recipeDescription(recipe: Recipe): string {
  const first = recipe.ingredients
    .slice(0, 4)
    .map((i) => i.name)
    .join(", ");
  return `${recipe.title} — ${recipe.ingredients.length} ingredients, ${recipe.process.length} steps. ${first}${recipe.ingredients.length > 4 ? ", and more." : "."}`;
}

/* ---------------------------------------------------------------------------
 * Scalable recipes
 *
 * Amounts and step text may contain `{expression}` placeholders that scale with
 * a serving count, e.g. `{n*5}-{n*10}` or `{half(3*n/4)}`. `n` is the serving
 * count and `half(x)` rounds up to the nearest half.
 * ------------------------------------------------------------------------- */

const PLACEHOLDER = /\{([^{}]+)\}/g;

function evalExpression(expression: string, n: number): number {
  let i = 0;
  const src = expression.replace(/\s+/g, "");

  const parseExpr = (): number => {
    let value = parseTerm();
    while (src[i] === "+" || src[i] === "-") {
      const op = src[i++];
      const right = parseTerm();
      value = op === "+" ? value + right : value - right;
    }
    return value;
  };

  const parseTerm = (): number => {
    let value = parseFactor();
    while (src[i] === "*" || src[i] === "/") {
      const op = src[i++];
      const right = parseFactor();
      value = op === "*" ? value * right : value / right;
    }
    return value;
  };

  const parseFactor = (): number => {
    if (src[i] === "-") {
      i += 1;
      return -parseFactor();
    }
    if (src[i] === "(") {
      i += 1;
      const value = parseExpr();
      if (src[i] === ")") i += 1;
      return value;
    }
    const fn = /^(half|ceil|floor|round)\(/.exec(src.slice(i));
    if (fn) {
      i += fn[0].length;
      const value = parseExpr();
      if (src[i] === ")") i += 1;
      if (fn[1] === "half") return Math.ceil(value / 0.5) * 0.5;
      if (fn[1] === "ceil") return Math.ceil(value);
      if (fn[1] === "floor") return Math.floor(value);
      return Math.round(value);
    }
    if (src[i] === "n") {
      i += 1;
      return n;
    }
    const num = /^\d+(\.\d+)?/.exec(src.slice(i));
    if (num) {
      i += num[0].length;
      return Number(num[0]);
    }
    i += 1;
    return 0;
  };

  const result = parseExpr();
  return Number.isFinite(result) ? result : 0;
}

function formatNumber(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/** Replaces every `{expression}` in a string with its value for `n` servings. */
export function scaleText(text: string, n: number): string {
  return text.replace(PLACEHOLDER, (_match, expression: string) =>
    formatNumber(evalExpression(expression, n)),
  );
}

/** True when the recipe defines a scaling variable. */
export function isScalable(recipe: Recipe): boolean {
  return Boolean(recipe.scale?.label);
}

/** Strips `{expression}` placeholders — process steps never carry amounts. */
export function stripFormulas(text: string): string {
  return text.replace(PLACEHOLDER, "").replace(/\s{2,}/g, " ").trim();
}

/** Returns the recipe with all placeholders resolved for `n` servings. */
export function scaleRecipe(recipe: Recipe, n: number): Recipe {
  return {
    ...recipe,
    ingredients: recipe.ingredients.map((ingredient) => ({
      ...ingredient,
      amount: scaleText(ingredient.amount ?? "", n),
      name: scaleText(ingredient.name ?? "", n),
    })),
    // Steps never hold amounts, so they are left untouched.
    process: recipe.process,
  };
}