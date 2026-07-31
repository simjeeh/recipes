import { Link } from "@tanstack/react-router";
import { EyeOff, Pencil } from "lucide-react";

import { IngredientsList } from "@/components/IngredientsList";
import { ProcessFlowChartLazy } from "@/components/flow/ProcessFlowChartLazy";
import { ProcessSteps } from "@/components/flow/ProcessSteps";
import { useAdminSession } from "@/hooks/useAdminSession";
import type { Recipe } from "@/lib/recipes";

export function RecipeDetail({
  recipe,
  variant,
}: {
  recipe: Recipe;
  variant: "flow" | "steps";
}) {
  const { isAdmin } = useAdminSession();

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
            {recipe.ingredients.length} ingredients · {recipe.process.length} steps
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
              to="/recipe/$slug/edit"
              params={{ slug: recipe.slug }}
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-white/5 hover:text-primary"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit
            </Link>
          ) : null}
        </div>
      </header>

      <section aria-labelledby="ingredients-heading" className="mt-14">
        <h2
          id="ingredients-heading"
          className="text-xs font-bold uppercase tracking-[0.2em] text-primary"
        >
          Ingredients
        </h2>
        <div className="mt-5 rounded-xl border border-border bg-card p-3 sm:p-5">
          <IngredientsList ingredients={recipe.ingredients} />
        </div>
      </section>

      <section aria-labelledby="process-heading" className="mt-16">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <h2
            id="process-heading"
            className="text-xs font-bold uppercase tracking-[0.2em] text-primary"
          >
            Process
          </h2>
          <div className="flex shrink-0 items-center gap-1 rounded-md border border-border p-1 text-xs">
            <Link
              to="/recipe/$slug"
              params={{ slug: recipe.slug }}
              className={`rounded px-2.5 py-1 font-semibold transition-colors ${
                variant === "flow"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Diagram
            </Link>
            <Link
              to="/recipe/$slug/flow-b"
              params={{ slug: recipe.slug }}
              className={`rounded px-2.5 py-1 font-semibold transition-colors ${
                variant === "steps"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Connector
            </Link>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Two layouts of the same steps — pick whichever you prefer and I&apos;ll keep it.
        </p>
        <div className="mt-5">
          {variant === "flow" ? (
            <ProcessFlowChartLazy steps={recipe.process} />
          ) : (
            <ProcessSteps steps={recipe.process} />
          )}
        </div>
      </section>
    </article>
  );
}