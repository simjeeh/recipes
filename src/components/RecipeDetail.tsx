import { Link } from "@tanstack/react-router";
import { ArrowUpRight, EyeOff, Pencil } from "lucide-react";

import { IngredientsList } from "@/components/IngredientsList";
import { ProcessSteps } from "@/components/flow/ProcessSteps";
import { useAdminSession } from "@/hooks/useAdminSession";
import { categorySlug, type Recipe } from "@/lib/recipes";

export function RecipeDetail({ recipe }: { recipe: Recipe }) {
  const { isAdmin } = useAdminSession();
  const components = recipe.ingredients.filter((ingredient) => ingredient.link);
  const ingredients = recipe.ingredients.filter((ingredient) => !ingredient.link);

  return (
    <article className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
      <Link
        to="/"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        ← All recipes
      </Link>

      <header className="mt-6 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            {recipe.title}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {ingredients.length} ingredients
            {recipe.process.length > 0 ? ` · ${recipe.process.length} steps` : null}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {recipe.is_hidden ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
              Hidden
            </span>
          ) : null}
          {isAdmin ? (
            <Link
              to="/$category/$slug/edit"
              params={{ category: categorySlug(recipe.category), slug: recipe.slug }}
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-white/5 hover:text-primary"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit
            </Link>
          ) : null}
        </div>
      </header>

      {components.length > 0 ? (
        <section aria-labelledby="components-heading" className="mt-14">
          <h2
            id="components-heading"
            className="text-xs font-bold uppercase tracking-[0.2em] text-primary"
          >
            Components
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {components.map((component) => (
              <Link
                key={`${component.link!.category}/${component.link!.slug}`}
                to="/$category/$slug"
                params={{
                  category: component.link!.category,
                  slug: component.link!.slug,
                }}
                className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3.5 transition-colors hover:border-primary/50 hover:bg-white/5"
              >
                <span className="text-sm font-medium text-foreground transition-colors group-hover:text-primary sm:text-base">
                  {component.name}
                </span>
                <ArrowUpRight
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="ingredients-heading" className="mt-14">
        <h2
          id="ingredients-heading"
          className="text-xs font-bold uppercase tracking-[0.2em] text-primary"
        >
          Ingredients
        </h2>
        <div className="mt-5 rounded-xl border border-border bg-card p-3 sm:p-5">
          <IngredientsList ingredients={ingredients} />
        </div>
      </section>

      {recipe.process.length > 0 ? (
        <section aria-labelledby="process-heading" className="mt-16">
          <h2
            id="process-heading"
            className="text-xs font-bold uppercase tracking-[0.2em] text-primary"
          >
            Process
          </h2>
          <div className="mt-5">
            <ProcessSteps steps={recipe.process} />
          </div>
        </section>
      ) : null}
    </article>
  );
}