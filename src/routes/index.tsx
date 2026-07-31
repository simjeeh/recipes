import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { EyeOff } from "lucide-react";

import { useAdminSession } from "@/hooks/useAdminSession";
import { listAllRecipes, listVisibleRecipes } from "@/lib/recipes.functions";

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

  const { data: allRecipes } = useQuery({
    queryKey: ["all-recipes"],
    queryFn: () => fetchAll(),
    enabled: isAdmin,
  });

  const recipes = (isAdmin && allRecipes) || publicRecipes;

  return (
    <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-24">
      <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl">
        Recipes
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
        Things I actually make. Ingredients as a checklist, process as a diagram.
      </p>

      {recipes.length === 0 ? (
        <p className="mt-16 text-muted-foreground">No recipes published yet.</p>
      ) : (
        <ul className="mt-14 grid gap-4 sm:grid-cols-2">
          {recipes.map((recipe) => (
            <li key={recipe.id}>
              <Link
                to="/recipe/$slug"
                params={{ slug: recipe.slug }}
                className="flex h-full flex-col rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/60 hover:bg-white/5"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <h2 className="min-w-0 text-xl font-bold text-foreground">{recipe.title}</h2>
                  {recipe.is_hidden ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      <EyeOff className="h-3 w-3" aria-hidden="true" />
                      Hidden
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {recipe.ingredientCount} ingredients · {recipe.stepCount} steps
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
