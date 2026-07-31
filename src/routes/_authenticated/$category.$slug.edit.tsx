import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CircleDashed, Eye, EyeOff, Loader2, Lock, Plus, Sigma, Trash2 } from "lucide-react";

import { FormulaModal } from "@/components/FormulaModal";

import type { Ingredient, ProcessStep, RecipeLink, RecipeScale } from "@/lib/recipes";
import type { ProcessBranch, ProcessRow } from "@/lib/recipes";
import { categorySlug, collectRowSteps, rowsToSteps, toProcessRows } from "@/lib/recipes";
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

/** Switches a row between "at the same time" and "pick one" without losing steps. */
function setRowMode(row: ProcessRow, options: boolean): ProcessRow {
  if (options) {
    if (row.kind === "options") return row;
    return {
      kind: "options",
      branches: row.steps.map((step) => ({
        label: step.branch_label ?? "",
        rows: [{ kind: "steps", steps: [step] } as ProcessRow],
      })),
    };
  }
  if (row.kind === "steps") return row;
  return { kind: "steps", steps: collectRowSteps(row.branches.flatMap((b) => b.rows)) };
}

function newBranch(): ProcessBranch {
  return { label: "", rows: [{ kind: "steps", steps: [newStep()] }] };
}

function StepEditor({
  step,
  onChange,
  onRemove,
}: {
  step: ProcessStep;
  onChange: (patch: Partial<ProcessStep>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
        <input
          aria-label="Step label"
          placeholder="Blend the base"
          value={step.label}
          onChange={(e) => onChange({ label: e.target.value })}
          className={inputClass}
        />
        <SecretToggle
          label="Mark step secret"
          active={Boolean(step.secret)}
          onClick={() => onChange({ secret: !step.secret })}
        />
        <RemoveButton label="Remove step" onClick={onRemove} />
      </div>
      <textarea
        aria-label="Step detail"
        placeholder="Optional detail"
        rows={2}
        value={step.detail ?? ""}
        onChange={(e) => onChange({ detail: e.target.value })}
        className={`${inputClass} mt-3 resize-y`}
      />
    </div>
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
  const [rows, setRows] = useState<ProcessRow[]>([]);
  const [scale, setScale] = useState<RecipeScale | null>(null);
  const [formulaIndex, setFormulaIndex] = useState<number | null>(null);
  const [hidden, setHidden] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!recipe) return;
    setTitle(recipe.title);
    setComponents(recipe.ingredients.filter((item) => item.link));
    setIngredients(recipe.ingredients.filter((item) => !item.link));
    setRows(toProcessRows(recipe.process));
    setScale(recipe.scale ?? null);
    setHidden(recipe.is_hidden);
  }, [recipe]);

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          id: recipe!.id,
          title,
          ingredients: [...components.filter((item) => item.link), ...ingredients],
          process: rowsToSteps(rows),
          scale: scale && scale.label.trim() ? { ...scale, label: scale.label.trim() } : null,
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
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Scaling</h2>
          <p className="mt-2 text-xs text-muted-foreground">
            Give the recipe a variable (used as <code className="text-primary">n</code>) so
            ingredient amounts can be formulas that update with the reader's input.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              aria-pressed={Boolean(scale)}
              onClick={() => setScale(scale ? null : { label: "Servings", default: 2 })}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                scale
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {scale ? "Scaling on" : "Scaling off"}
            </button>
            {scale ? (
              <>
                <input
                  aria-label="Variable name"
                  placeholder="Cups"
                  value={scale.label}
                  onChange={(e) => setScale({ ...scale, label: e.target.value })}
                  className={`${inputClass} w-40`}
                />
                <input
                  aria-label="Default value"
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={scale.default}
                  onChange={(e) =>
                    setScale({ ...scale, default: Number(e.target.value) || 1 })
                  }
                  className={`${inputClass} w-24`}
                />
              </>
            ) : null}
          </div>
        </section>

        <section>
          <SectionHeading
            title="Ingredients"
            onAdd={() => setIngredients((prev) => [...prev, { amount: "", unit: "", name: "" }])}
          />
          <ul className="mt-4 space-y-3">
            {ingredients.map((ingredient, index) => (
              <li
                key={index}
                className={`grid items-center gap-2 ${
                  scale
                    ? "grid-cols-[4rem_5rem_minmax(0,1fr)_auto_auto_auto_auto]"
                    : "grid-cols-[4rem_5rem_minmax(0,1fr)_auto_auto_auto]"
                }`}
              >
                <input
                  aria-label="Amount"
                  placeholder="1"
                  value={ingredient.amount}
                  onChange={(e) =>
                    setIngredients((prev) =>
                      prev.map((item, i) => (i === index ? { ...item, amount: e.target.value } : item)),
                    )
                  }
                  className={`${inputClass} ${ingredient.amount.includes("{") ? "font-mono text-primary" : ""}`}
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
                {scale ? (
                  <ToggleButton
                    label="Edit amount formula"
                    title="Edit amount formula"
                    active={ingredient.amount.includes("{")}
                    icon={<Sigma className="h-4 w-4" aria-hidden="true" />}
                    onClick={() => setFormulaIndex(index)}
                  />
                ) : null}
                <SecretToggle
                  label="Mark ingredient secret"
                  active={Boolean(ingredient.secret)}
                  onClick={() =>
                    setIngredients((prev) =>
                      prev.map((item, i) => (i === index ? { ...item, secret: !item.secret } : item)),
                    )
                  }
                />
                <ToggleButton
                  label="Mark ingredient optional"
                  title={ingredient.optional ? "Optional ingredient" : "Required ingredient"}
                  active={Boolean(ingredient.optional)}
                  icon={<CircleDashed className="h-4 w-4" aria-hidden="true" />}
                  onClick={() =>
                    setIngredients((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, optional: !item.optional } : item,
                      ),
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
            Steps flow top to bottom. A row can hold several steps done at the same time, or be
            switched to "Pick one" — then each option stacks in its own block and can hold as many
            steps as it needs, including further "Pick one" rows nested inside. Steps never hold
            amounts — write "add half the water" and keep the totals in the ingredients.
          </p>

          <div className="mt-4">
            <RowsEditor rows={rows} onChange={setRows} />
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

      <FormulaModal
        open={formulaIndex !== null}
        variable={scale?.label ?? "n"}
        value={formulaIndex !== null ? (ingredients[formulaIndex]?.amount ?? "") : ""}
        unit={formulaIndex !== null ? ingredients[formulaIndex]?.unit : undefined}
        name={formulaIndex !== null ? ingredients[formulaIndex]?.name : undefined}
        onClose={() => setFormulaIndex(null)}
        onSave={(next) =>
          setIngredients((prev) =>
            prev.map((item, i) => (i === formulaIndex ? { ...item, amount: next } : item)),
          )
        }
      />
    </div>
  );
}

/** Recursive editor for a chain of process rows. Options nest inside options. */
function RowsEditor({
  rows,
  onChange,
  depth = 0,
}: {
  rows: ProcessRow[];
  onChange: (rows: ProcessRow[]) => void;
  depth?: number;
}) {
  const addAt = (index: number) =>
    onChange([
      ...rows.slice(0, index),
      { kind: "steps", steps: [newStep()] },
      ...rows.slice(index),
    ]);

  if (!rows.length) {
    return <AddButton label="Add step" subtle={depth > 0} onClick={() => addAt(0)} />;
  }

  return (
    <div className="space-y-3">
      {rows.map((row, rIndex) => {
        const patchRow = (next: ProcessRow) =>
          onChange(rows.map((item, i) => (i === rIndex ? next : item)));
        const dropRow = () => onChange(rows.filter((_, i) => i !== rIndex));
        const isOptions = row.kind === "options";

        return (
          <div key={rIndex}>
            <div className="rounded-xl border border-border/70 bg-card/40 p-3 sm:p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1 text-[11px]">
                  {[
                    { value: false, label: "At the same time" },
                    { value: true, label: "Pick one" },
                  ].map((mode) => (
                    <button
                      key={String(mode.value)}
                      type="button"
                      onClick={() => patchRow(setRowMode(row, mode.value))}
                      className={`rounded-full px-3 py-1 font-semibold transition-colors ${
                        isOptions === mode.value
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
                <RemoveButton label="Remove row" onClick={dropRow} />
              </div>

              {row.kind === "steps" ? (
                <>
                  <div className={row.steps.length > 1 ? "grid gap-3 sm:grid-cols-2" : "grid gap-3"}>
                    {row.steps.map((step, sIndex) => (
                      <StepEditor
                        key={step.id}
                        step={step}
                        onChange={(patch) =>
                          patchRow({
                            kind: "steps",
                            steps: row.steps.map((item, i) =>
                              i === sIndex ? { ...item, ...patch } : item,
                            ),
                          })
                        }
                        onRemove={() => {
                          const next = row.steps.filter((_, i) => i !== sIndex);
                          if (!next.length) dropRow();
                          else patchRow({ kind: "steps", steps: next });
                        }}
                      />
                    ))}
                  </div>
                  <div className="mt-3 flex justify-center">
                    <AddButton
                      label="Add step at the same time"
                      subtle
                      onClick={() => patchRow({ kind: "steps", steps: [...row.steps, newStep()] })}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    {row.branches.map((branch, bIndex) => {
                      const patchBranch = (next: ProcessBranch | null) => {
                        const branches = row.branches
                          .map((item, i) => (i === bIndex ? next : item))
                          .filter((item): item is ProcessBranch => Boolean(item));
                        if (!branches.length) dropRow();
                        else patchRow({ kind: "options", branches });
                      };
                      return (
                        <div
                          key={bIndex}
                          className="rounded-lg border border-dashed border-primary/35 bg-primary/[0.03] p-3"
                        >
                          <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                            <input
                              aria-label="Option name"
                              placeholder={`Option ${bIndex + 1} name`}
                              value={branch.label}
                              onChange={(e) => patchBranch({ ...branch, label: e.target.value })}
                              className={inputClass}
                            />
                            <RemoveButton label="Remove option" onClick={() => patchBranch(null)} />
                          </div>
                          <RowsEditor
                            rows={branch.rows}
                            depth={depth + 1}
                            onChange={(next) => patchBranch({ ...branch, rows: next })}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex justify-center">
                    <AddButton
                      label="Add option"
                      subtle
                      onClick={() =>
                        patchRow({ kind: "options", branches: [...row.branches, newBranch()] })
                      }
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-center py-2">
              <AddButton label="Add step below" subtle onClick={() => addAt(rIndex + 1)} />
            </div>
          </div>
        );
      })}
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
    <ToggleButton
      label={label}
      title={active ? "Secret — hidden from public" : "Public"}
      active={active}
      onClick={onClick}
      icon={<Lock className="h-4 w-4" aria-hidden="true" />}
    />
  );
}

function ToggleButton({
  label,
  title,
  active,
  onClick,
  icon,
}: {
  label: string;
  title: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={title}
      onClick={onClick}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors ${
        active
          ? "border-primary bg-primary/15 text-primary"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
    </button>
  );
}