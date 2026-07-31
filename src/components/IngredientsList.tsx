import { useState } from "react";
import { Check } from "lucide-react";

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
            </label>
          </li>
        );
      })}
    </ul>
  );
}