import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { EyeOff, Plus } from "lucide-react";

import { useAdminSession } from "@/hooks/useAdminSession";
import { useRecipeSearch } from "@/hooks/useRecipeSearch";
import { listAllRecipes, listVisibleRecipes } from "@/lib/recipes.functions";
import { RECIPE_CATEGORIES, fuzzyMatch, type RecipeSummary } from "@/lib/recipes";

const TITLE = "Recipes — a personal recipe collection";
const DESCRIPTION =
  "A small, hand-kept collection of recipes: clean ingredient checklists and step-by-step process diagrams.";

export const Route = createFileRoute("/")({
  loader: () => listVisibleRecipes(),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const publicRecipes = Route.useLoaderData();
  const { isAdmin } = useAdminSession();
  const fetchAll = useServerFn(listAllRecipes);
  const { query, category } = useRecipeSearch();

  const { data: allRecipes } = useQuery({
    queryKey: ["all-recipes"],
    queryFn: () => fetchAll(),
    enabled: isAdmin,
  });

  const all: RecipeSummary[] = (isAdmin && allRecipes) || publicRecipes;
  const recipes = all.filter((recipe) => fuzzyMatch(query, recipe.title));

  const sections = RECIPE_CATEGORIES.filter(
    (section) => category === "All" || category === section,
  )
    .map((section) => ({
      category: section,
      items: recipes.filter((recipe) => recipe.category === section),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
      <h1 className="sr-only">Recipes</h1>
      {isAdmin ? (
        <div className="mb-8 flex justify-end">
          <Link
            to="/recipe/new"
            aria-label="Add a recipe"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold transition-colors hover:border-primary/60 hover:text-primary"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New recipe
          </Link>
        </div>
      ) : null}
      {sections.length === 0 ? (
        <p className="text-muted-foreground">
          {query || category !== "All"
            ? "No recipes match your search."
            : "No recipes published yet."}
        </p>
      ) : (
        <div className="space-y-12">
          {sections.map((section) => (
            <section key={section.category} aria-label={section.category}>
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                {section.category}
              </h2>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {section.items.map((recipe) => (
                  <li key={recipe.id}>
                    <Link
                      to="/recipe/$slug"
                      params={{ slug: recipe.slug }}
                      className="flex h-full items-start justify-between gap-3 rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:border-primary/60 hover:bg-white/5"
                    >
                      <span className="min-w-0 font-semibold text-foreground">{recipe.title}</span>
                      {recipe.is_hidden ? (
                        <EyeOff
                          className="mt-1 h-3.5 w-3.5 shrink-0 text-primary"
                          aria-label="Hidden"
                        />
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
