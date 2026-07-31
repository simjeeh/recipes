import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  Ingredient,
  ProcessStep,
  Recipe,
  RecipeCategory,
  RecipeSummary,
} from "./recipes";

const RECIPE_COLUMNS =
  "id, title, slug, category, ingredients, process, is_hidden, created_at, updated_at";

function publicClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

type Row = {
  id: string;
  title: string;
  slug: string;
  category: string;
  ingredients: unknown;
  process: unknown;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
};

/** Removes secret ingredients/steps (and dangling parent links) for public reads. */
function stripSecrets(recipe: Recipe): Recipe {
  const steps = recipe.process.filter((step) => !step.secret);
  const ids = new Set(steps.map((s) => s.id));
  return {
    ...recipe,
    ingredients: recipe.ingredients.filter((i) => !i.secret),
    process: steps.map((step) => ({
      ...step,
      parents: (step.parents ?? []).filter((p) => ids.has(p)),
    })),
  };
}

function toRecipe(row: Row): Recipe {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: (row.category as RecipeCategory) ?? "Main",
    ingredients: (row.ingredients as Ingredient[]) ?? [],
    process: (row.process as ProcessStep[]) ?? [],
    is_hidden: row.is_hidden,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toSummary(row: Row, isPublic = false): RecipeSummary {
  const recipe = isPublic ? stripSecrets(toRecipe(row)) : toRecipe(row);
  return {
    id: recipe.id,
    title: recipe.title,
    slug: recipe.slug,
    category: recipe.category,
    is_hidden: recipe.is_hidden,
    updated_at: recipe.updated_at,
    ingredientCount: recipe.ingredients.length,
    stepCount: recipe.process.length,
  };
}

/** Public list — anon policy filters hidden recipes out at the database. */
export const listVisibleRecipes = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient()
    .from("recipes")
    .select(RECIPE_COLUMNS)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Row[]).map((row) => toSummary(row, true));
});

export const getVisibleRecipe = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => z.object({ slug: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const { data: row, error } = await publicClient()
      .from("recipes")
      .select(RECIPE_COLUMNS)
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row ? stripSecrets(toRecipe(row as Row)) : null;
  });

async function assertAdmin(context: { supabase: ReturnType<typeof publicClient>; userId: string; claims: Record<string, unknown> }) {
  if (context.claims.aal !== "aal2") {
    throw new Error("Unauthorized");
  }
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Unauthorized");
}

/** Admin list — includes hidden recipes. */
export const listAllRecipes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { data, error } = await context.supabase
      .from("recipes")
      .select(RECIPE_COLUMNS)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Row[]).map((row) => toSummary(row));
  });

export const getRecipeForAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { slug: string }) => z.object({ slug: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { data: row, error } = await context.supabase
      .from("recipes")
      .select(RECIPE_COLUMNS)
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row ? toRecipe(row as Row) : null;
  });

const ingredientSchema = z.object({
  amount: z.string().max(40).default(""),
  unit: z.string().max(40).default(""),
  name: z.string().min(1).max(160),
  secret: z.boolean().optional(),
});

const stepSchema = z.object({
  id: z.string().min(1).max(60),
  label: z.string().min(1).max(200),
  detail: z.string().max(1000).optional(),
  parents: z.array(z.string().min(1).max(60)).default([]),
  branch_label: z.string().max(80).optional(),
  secret: z.boolean().optional(),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(160),
  ingredients: z.array(ingredientSchema).max(200),
  process: z.array(stepSchema).max(100),
});

export const updateRecipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { error } = await context.supabase
      .from("recipes")
      .update({ title: data.title, ingredients: data.ingredients, process: data.process })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setRecipeHidden = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), is_hidden: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { error } = await context.supabase
      .from("recipes")
      .update({ is_hidden: data.is_hidden })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, is_hidden: data.is_hidden };
  });