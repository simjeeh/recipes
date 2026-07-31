import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, EyeOff, Loader2, Lock, Plus, Trash2 } from "lucide-react";

import type { Ingredient, ProcessStep, RecipeLink } from "@/lib/recipes";
import { categorySlug } from "@/lib/recipes";
import {
  getRecipeForAdmin,
  listAllRecipes,
  setRecipeHidden,
  updateRecipe,
} from "@/lib/recipes.functions";

export const Route = createFileRoute("/_authenticated/$category/$slug/edit")({
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

let stepCounter = 0;

function newStep(): ProcessStep {
  stepCounter += 1;
  return { id: `step-${Date.now()}-${stepCounter}`, label: "", parents: [] };
}

function toGroups(process: ProcessStep[]): ProcessStep[][] {
  const byId = new Map(process.map((step) => [step.id, step]));
  const depths = new Map<string, number>();
  const depthOf = (step: ProcessStep, seen: Set<string>): number => {
    if (depths.has(step.id)) return depths.get(step.id)!;
    if (seen.has(step.id)) return 0;
    seen.add(step.id);
    const parents = (step.parents ?? []).map((id) => byId.get(id)).filter(Boolean) as ProcessStep[];
    const depth = parents.length === 0 ? 0 : Math.max(...parents.map((p) => depthOf(p, seen))) + 1;
    depths.set(step.id, depth);
    return depth;
  };
  const groups: ProcessStep[][] = [];
  for (const step of process) {
    const depth = depthOf(step, new Set());
    (groups[depth] ??= []).push(step);
  }
  return groups.filter(Boolean);
}

function fromGroups(groups: ProcessStep[][]): ProcessStep[] {
  const result: ProcessStep[] = [];
  groups.forEach((group, index) => {
    const parents = index === 0 ? [] : groups[index - 1].map((step) => step.id);
    for (const step of group) result.push({ ...step, parents });
  });
  return result;
}

function updateStep(
  setGroups: React.Dispatch<React.SetStateAction<ProcessStep[][]>>,
  gIndex: number,
  sIndex: number,
  patch: Partial<ProcessStep>,
) {
  setGroups((prev) =>
    prev.map((group, i) =>
      i === gIndex ? group.map((step, j) => (j === sIndex ? { ...step, ...patch } : step)) : group,
    ),
  );
}

function EditRecipePage() {
  const { category, slug } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchRecipe = useServerFn(getRecipeForAdmin);
  const fetchAllRecipes = useServerFn(listAllRecipes);
  const save = useServerFn(updateRecipe);
  const toggleHidden = useServerFn(setRecipeHidden);

  const { data: recipe, isPending } = useQuery({
    queryKey: ["admin-recipe", slug],
    queryFn: () => fetchRecipe({ data: { slug } }),
  });

  const { data: allRecipes } = useQuery({
    queryKey: ["admin-recipes"],
    queryFn: () => fetchAllRecipes({}),
  });

  const linkOptions = (allRecipes ?? []).filter((item) => item.slug !== slug);

  const [title, setTitle] = useState("");
  const [components, setComponents] = useState<Ingredient[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [groups, setGroups] = useState<ProcessStep[][]>([]);
  const [hidden, setHidden] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!recipe) return;
    setTitle(recipe.title);
    setComponents(recipe.ingredients.filter((item) => item.link));
    setIngredients(recipe.ingredients.filter((item) => !item.link));
    setGroups(toGroups(recipe.process));
    setHidden(recipe.is_hidden);
  }, [recipe]);

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          id: recipe!.id,
          title,
          ingredients: [...components.filter((item) => item.link), ...ingredients],
          process: fromGroups(groups),
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
        to="/$category/$slug"
        params={{ category, slug }}
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
            title="Components"
            onAdd={() => setComponents((prev) => [...prev, { amount: "", unit: "", name: "" }])}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Other recipes needed for this one. They show above the ingredients.
          </p>
          <ul className="mt-4 space-y-3">
            {components.map((component, index) => (
              <li key={index} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <LinkPicker
                  className="w-full"
                  options={linkOptions}
                  value={component.link}
                  onChange={(link) => {
                    const match = linkOptions.find((option) => option.slug === link?.slug);
                    setComponents((prev) =>
                      prev.map((item, i) =>
                        i === index
                          ? { ...item, link, name: match ? match.title : item.name }
                          : item,
                      ),
                    );
                  }}
                />
                <RemoveButton
                  label="Remove component"
                  onClick={() => setComponents((prev) => prev.filter((_, i) => i !== index))}
                />
              </li>
            ))}
            {components.length === 0 ? (
              <li className="text-xs text-muted-foreground">No components yet.</li>
            ) : null}
          </ul>
        </section>

        <section>
          <SectionHeading
            title="Ingredients"
            onAdd={() => setIngredients((prev) => [...prev, { amount: "", unit: "", name: "" }])}
          />
          <ul className="mt-4 space-y-3">
            {ingredients.map((ingredient, index) => (
              <li key={index} className="grid grid-cols-[4rem_5rem_minmax(0,1fr)_auto_auto] items-center gap-2">
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
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Process steps</h2>
          <p className="mt-2 text-xs text-muted-foreground">
            Steps flow top to bottom. Use the + under a step to add the next one, and add cards inside a
            row to run them in parallel.
          </p>

          {groups.length === 0 ? (
            <div className="mt-4">
              <AddButton label="Add first step" onClick={() => setGroups([[newStep()]])} />
            </div>
          ) : null}

          <div className="mt-4 space-y-2">
            {groups.map((group, gIndex) => (
              <div key={gIndex}>
                <div
                  className={
                    group.length > 1
                      ? "grid gap-3 sm:grid-cols-2"
                      : "grid gap-3"
                  }
                >
                  {group.map((step, sIndex) => (
                    <div key={step.id} className="rounded-lg border border-border bg-card p-4">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
                        <input
                          aria-label="Step label"
                          placeholder="Blend the base"
                          required
                          value={step.label}
                          onChange={(e) =>
                            updateStep(setGroups, gIndex, sIndex, { label: e.target.value })
                          }
                          className={inputClass}
                        />
                        <SecretToggle
                          label="Mark step secret"
                          active={Boolean(step.secret)}
                          onClick={() =>
                            updateStep(setGroups, gIndex, sIndex, { secret: !step.secret })
                          }
                        />
                        <RemoveButton
                          label="Remove step"
                          onClick={() =>
                            setGroups((prev) =>
                              prev
                                .map((g, i) => (i === gIndex ? g.filter((_, j) => j !== sIndex) : g))
                                .filter((g) => g.length > 0),
                            )
                          }
                        />
                      </div>
                      <textarea
                        aria-label="Step detail"
                        placeholder="Optional detail"
                        rows={2}
                        value={step.detail ?? ""}
                        onChange={(e) =>
                          updateStep(setGroups, gIndex, sIndex, { detail: e.target.value })
                        }
                        className={`${inputClass} mt-3 resize-y`}
                      />
                      <input
                        aria-label="Branch label"
                        placeholder="Branch label (optional)"
                        value={step.branch_label ?? ""}
                        onChange={(e) =>
                          updateStep(setGroups, gIndex, sIndex, { branch_label: e.target.value })
                        }
                        className={`${inputClass} mt-3`}
                      />
                      <LinkPicker
                        className="mt-3 w-full"
                        options={linkOptions}
                        value={step.link}
                        onChange={(link) => updateStep(setGroups, gIndex, sIndex, { link })}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-center gap-2 py-2">
                  <AddButton
                    label="Add parallel step"
                    subtle
                    onClick={() =>
                      setGroups((prev) =>
                        prev.map((g, i) => (i === gIndex ? [...g, newStep()] : g)),
                      )
                    }
                  />
                  <AddButton
                    label="Add step below"
                    subtle
                    onClick={() =>
                      setGroups((prev) => [
                        ...prev.slice(0, gIndex + 1),
                        [newStep()],
                        ...prev.slice(gIndex + 1),
                      ])
                    }
                  />
                </div>
              </div>
            ))}
          </div>
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
            onClick={() => navigate({ to: "/$category/$slug", params: { category, slug } })}
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

function LinkPicker({
  options,
  value,
  onChange,
  className = "",
}: {
  options: { slug: string; title: string; category: string }[];
  value?: RecipeLink;
  onChange: (link: RecipeLink | undefined) => void;
  className?: string;
}) {
  return (
    <select
      aria-label="Link to another recipe"
      value={value?.slug ?? ""}
      onChange={(event) => {
        const slug = event.target.value;
        const match = options.find((option) => option.slug === slug);
        onChange(match ? { slug: match.slug, category: categorySlug(match.category) } : undefined);
      }}
      className={`rounded-md border border-border bg-input px-2 py-2 text-xs text-muted-foreground outline-none ${className}`}
    >
      <option value="">Select a recipe</option>
      {options.map((option) => (
        <option key={option.slug} value={option.slug}>
          {option.title}
        </option>
      ))}
    </select>
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

function AddButton({
  label,
  onClick,
  subtle,
}: {
  label: string;
  onClick: () => void;
  subtle?: boolean;
}) {
  if (subtle) {
    return (
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={onClick}
        className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border/70 px-3 py-1 text-[11px] font-medium text-muted-foreground/70 transition-colors hover:border-primary/60 hover:text-primary"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </button>
    );
  }
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-white/5 hover:text-primary"
    >
      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
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