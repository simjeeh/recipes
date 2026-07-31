import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, EyeOff, Loader2, Lock, Plus, Trash2 } from "lucide-react";

import type { Ingredient, ProcessStep } from "@/lib/recipes";
import { getRecipeForAdmin, setRecipeHidden, updateRecipe } from "@/lib/recipes.functions";

export const Route = createFileRoute("/_authenticated/recipe/$slug/edit")({
  head: () => ({
    meta: [
      { title: "Edit recipe — Recipes" },
      { name: "description", content: "Admin editor for a recipe's ingredients and steps." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Edit recipe — Recipes" },
      { property: "og:description", content: "Admin editor for a recipe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EditRecipePage,
});

const inputClass =
  "w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground outline-none";

function EditRecipePage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchRecipe = useServerFn(getRecipeForAdmin);
  const save = useServerFn(updateRecipe);
  const toggleHidden = useServerFn(setRecipeHidden);

  const { data: recipe, isPending } = useQuery({
    queryKey: ["admin-recipe", slug],
    queryFn: () => fetchRecipe({ data: { slug } }),
  });

  const [title, setTitle] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [hidden, setHidden] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!recipe) return;
    setTitle(recipe.title);
    setIngredients(recipe.ingredients);
    setSteps(recipe.process);
    setHidden(recipe.is_hidden);
  }, [recipe]);

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          id: recipe!.id,
          title,
          ingredients,
          process: steps.map((step) => ({ ...step, parents: step.parents ?? [] })),
        },
      }),
    onSuccess: async () => {
      setMessage("Saved.");
      await queryClient.invalidateQueries();
    },
    onError: (error: Error) => setMessage(error.message),
  });

  const hiddenMutation = useMutation({
    mutationFn: (next: boolean) => toggleHidden({ data: { id: recipe!.id, is_hidden: next } }),
    onSuccess: async (result) => {
      setHidden(result.is_hidden);
      setMessage(result.is_hidden ? "Recipe hidden." : "Recipe is now public.");
      await queryClient.invalidateQueries();
    },
    onError: (error: Error) => setMessage(error.message),
  });

  if (isPending) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-24 text-sm text-muted-foreground sm:px-8">
        Loading…
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-24 sm:px-8">
        <h1 className="text-2xl font-extrabold text-foreground">Recipe not found</h1>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <Link
        to="/recipe/$slug"
        params={{ slug }}
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        ← Back to recipe
      </Link>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <h1 className="min-w-0 truncate text-3xl font-extrabold tracking-tight text-foreground">
          Edit recipe
        </h1>
        <button
          type="button"
          onClick={() => hiddenMutation.mutate(!hidden)}
          disabled={hiddenMutation.isPending}
          className="inline-flex shrink-0 items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-white/5 hover:text-primary disabled:opacity-60"
        >
          {hidden ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
          {hidden ? "Hidden" : "Public"}
        </button>
      </div>

      <form
        className="mt-10 space-y-12"
        onSubmit={(event) => {
          event.preventDefault();
          setMessage(null);
          saveMutation.mutate();
        }}
      >
        <section>
          <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-foreground">
            Title
          </label>
          <input
            id="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />
          <p className="mt-2 text-xs text-muted-foreground">Slug: {recipe.slug}</p>
        </section>

        <section>
          <SectionHeading
            title="Ingredients"
            onAdd={() => setIngredients((prev) => [...prev, { amount: "", unit: "", name: "" }])}
          />
          <ul className="mt-4 space-y-3">
            {ingredients.map((ingredient, index) => (
              <li key={index} className="grid grid-cols-[4rem_5rem_minmax(0,1fr)_auto_auto] gap-2">
                <input
                  aria-label="Amount"
                  placeholder="1"
                  value={ingredient.amount}
                  onChange={(e) =>
                    setIngredients((prev) =>
                      prev.map((item, i) => (i === index ? { ...item, amount: e.target.value } : item)),
                    )
                  }
                  className={inputClass}
                />
                <input
                  aria-label="Unit"
                  placeholder="cup"
                  value={ingredient.unit}
                  onChange={(e) =>
                    setIngredients((prev) =>
                      prev.map((item, i) => (i === index ? { ...item, unit: e.target.value } : item)),
                    )
                  }
                  className={inputClass}
                />
                <input
                  aria-label="Ingredient"
                  placeholder="frozen açaí"
                  required
                  value={ingredient.name}
                  onChange={(e) =>
                    setIngredients((prev) =>
                      prev.map((item, i) => (i === index ? { ...item, name: e.target.value } : item)),
                    )
                  }
                  className={inputClass}
                />
                <SecretToggle
                  label="Mark ingredient secret"
                  active={Boolean(ingredient.secret)}
                  onClick={() =>
                    setIngredients((prev) =>
                      prev.map((item, i) => (i === index ? { ...item, secret: !item.secret } : item)),
                    )
                  }
                />
                <RemoveButton
                  label="Remove ingredient"
                  onClick={() => setIngredients((prev) => prev.filter((_, i) => i !== index))}
                />
              </li>
            ))}
          </ul>
        </section>

        <section>
          <SectionHeading
            title="Process steps"
            onAdd={() =>
              setSteps((prev) => [
                ...prev,
                { id: `step-${prev.length + 1}-${Date.now()}`, label: "", parents: [] },
              ])
            }
          />
          <p className="mt-2 text-xs text-muted-foreground">
            A step branches by listing more than one parent step, and two steps sharing a parent run in
            parallel.
          </p>
          <ul className="mt-4 space-y-4">
            {steps.map((step, index) => (
              <li key={step.id} className="rounded-lg border border-border bg-card p-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3">
                  <input
                    aria-label="Step label"
                    placeholder="Blend the base"
                    required
                    value={step.label}
                    onChange={(e) =>
                      setSteps((prev) =>
                        prev.map((item, i) => (i === index ? { ...item, label: e.target.value } : item)),
                      )
                    }
                    className={inputClass}
                  />
                  <SecretToggle
                    label="Mark step secret"
                    active={Boolean(step.secret)}
                    onClick={() =>
                      setSteps((prev) =>
                        prev.map((item, i) => (i === index ? { ...item, secret: !item.secret } : item)),
                      )
                    }
                  />
                  <RemoveButton
                    label="Remove step"
                    onClick={() => {
                      setSteps((prev) =>
                        prev
                          .filter((_, i) => i !== index)
                          .map((item) => ({
                            ...item,
                            parents: (item.parents ?? []).filter((p) => p !== step.id),
                          })),
                      );
                    }}
                  />
                </div>
                <textarea
                  aria-label="Step detail"
                  placeholder="Optional detail"
                  rows={2}
                  value={step.detail ?? ""}
                  onChange={(e) =>
                    setSteps((prev) =>
                      prev.map((item, i) => (i === index ? { ...item, detail: e.target.value } : item)),
                    )
                  }
                  className={`${inputClass} mt-3 resize-y`}
                />
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div>
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Comes after
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {steps.filter((_, i) => i !== index).length === 0 ? (
                        <span className="text-xs text-muted-foreground">First step</span>
                      ) : null}
                      {steps
                        .filter((_, i) => i !== index)
                        .map((other) => {
                          const checked = (step.parents ?? []).includes(other.id);
                          return (
                            <label
                              key={other.id}
                              className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs transition-colors ${
                                checked
                                  ? "border-primary bg-primary/15 text-primary"
                                  : "border-border text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={checked}
                                onChange={() =>
                                  setSteps((prev) =>
                                    prev.map((item, i) =>
                                      i === index
                                        ? {
                                            ...item,
                                            parents: checked
                                              ? (item.parents ?? []).filter((p) => p !== other.id)
                                              : [...(item.parents ?? []), other.id],
                                          }
                                        : item,
                                    ),
                                  )
                                }
                              />
                              {other.label || other.id}
                            </label>
                          );
                        })}
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor={`branch-${step.id}`}
                      className="mb-1.5 block text-xs font-medium text-muted-foreground"
                    >
                      Branch label (optional)
                    </label>
                    <input
                      id={`branch-${step.id}`}
                      placeholder="if using frozen fruit"
                      value={step.branch_label ?? ""}
                      onChange={(e) =>
                        setSteps((prev) =>
                          prev.map((item, i) =>
                            i === index ? { ...item, branch_label: e.target.value } : item,
                          ),
                        )
                      }
                      className={inputClass}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            Save changes
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/recipe/$slug", params: { slug } })}
            className="rounded-md border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white/5"
          >
            Done
          </button>
          {message ? <span className="text-sm text-muted-foreground">{message}</span> : null}
        </div>
      </form>
    </div>
  );
}

function SectionHeading({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
      <h2 className="min-w-0 text-xs font-bold uppercase tracking-[0.2em] text-primary">{title}</h2>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold transition-colors hover:bg-white/5 hover:text-primary"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        Add
      </button>
    </div>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
    >
      <Trash2 className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

function SecretToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={active ? "Secret — hidden from public" : "Public"}
      onClick={onClick}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors ${
        active
          ? "border-primary bg-primary/15 text-primary"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      <Lock className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}