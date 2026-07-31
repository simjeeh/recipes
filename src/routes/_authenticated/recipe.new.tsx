import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";

import { RECIPE_CATEGORIES, type RecipeCategory } from "@/lib/recipes";
import { createRecipe } from "@/lib/recipes.functions";

export const Route = createFileRoute("/_authenticated/recipe/new")({
  head: () => ({
    meta: [
      { title: "New recipe — Recipes" },
      { name: "description", content: "Create a new recipe in the collection." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "New recipe — Recipes" },
      { property: "og:description", content: "Create a new recipe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewRecipePage,
});

const inputClass =
  "w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground outline-none";

function NewRecipePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const create = useServerFn(createRecipe);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<RecipeCategory>("Main");
  const [message, setMessage] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => create({ data: { title: title.trim(), category } }),
    onSuccess: async ({ slug }) => {
      await queryClient.invalidateQueries();
      navigate({ to: "/recipe/$slug/edit", params: { slug } });
    },
    onError: (error: Error) => setMessage(error.message),
  });

  return (
    <div className="mx-auto max-w-xl px-5 py-12 sm:px-8 sm:py-16">
      <Link
        to="/"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        ← All recipes
      </Link>

      <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-foreground">New recipe</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        It starts hidden — add ingredients and steps, then make it public when it's ready.
      </p>

      <form
        className="mt-8 space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          setMessage(null);
          createMutation.mutate();
        }}
      >
        <div>
          <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-foreground">
            Title
          </label>
          <input
            id="title"
            required
            maxLength={160}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Beef jerky"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="category" className="mb-1.5 block text-sm font-medium text-foreground">
            Section
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as RecipeCategory)}
            className={inputClass}
          >
            {RECIPE_CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={createMutation.isPending || !title.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            Create recipe
          </button>
          {message ? <span className="text-sm text-destructive">{message}</span> : null}
        </div>
      </form>
    </div>
  );
}