import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Check, Lock } from "lucide-react";

import { formatIngredient, type Ingredient } from "@/lib/recipes";

export function IngredientsList({ ingredients }: { ingredients: Ingredient[] }) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  if (!ingredients.length) {
    return <p className="text-sm text-muted-foreground">No ingredients listed yet.</p>;
  }

  return (
    <ul className="space-y-1">
      {ingredients.map((ingredient, index) => {
        const id = `ingredient-${index}`;
        const isChecked = Boolean(checked[index]);
        return (
          <li key={id}>
            <label
              htmlFor={id}
              className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-white/5"
            >
              <span className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border">
                <input
                  id={id}
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => setChecked((prev) => ({ ...prev, [index]: !prev[index] }))}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
                {isChecked ? (
                  <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                ) : null}
              </span>
              <span
                className={
                  isChecked
                    ? "text-sm text-muted-foreground line-through sm:text-base"
                    : "text-sm text-foreground sm:text-base"
                }
              >
                {formatIngredient(ingredient)}
              </span>
              {ingredient.link ? (
                <Link
                  to="/$category/$slug"
                  params={{
                    category: ingredient.link.category,
                    slug: ingredient.link.slug,
                  }}
                  onClick={(event) => event.stopPropagation()}
                  className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary transition-colors hover:bg-primary/20"
                >
                  Recipe
                  <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              ) : null}
              {ingredient.secret ? (
                <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  <Lock className="h-3 w-3" aria-hidden="true" />
                  Secret
                </span>
              ) : null}
            </label>
          </li>
        );
      })}
    </ul>
  );
}