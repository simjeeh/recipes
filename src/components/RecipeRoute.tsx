import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { RecipeDetail } from "@/components/RecipeDetail";
import { useAdminSession } from "@/hooks/useAdminSession";
import { getRecipeForAdmin } from "@/lib/recipes.functions";
import type { Recipe } from "@/lib/recipes";

export function RecipeRoute({
  slug,
  publicRecipe,
}: {
  slug: string;
  publicRecipe: Recipe | null;
}) {
  const { isAdmin, loading } = useAdminSession();
  const fetchAdminRecipe = useServerFn(getRecipeForAdmin);

  const { data: adminRecipe } = useQuery({
    queryKey: ["admin-recipe", slug],
    queryFn: () => fetchAdminRecipe({ data: { slug } }),
    enabled: isAdmin && !publicRecipe,
  });

  const recipe = publicRecipe ?? adminRecipe ?? null;

  if (!recipe) {
    if (loading || (isAdmin && !publicRecipe)) {
      return (
        <div className="mx-auto max-w-5xl px-5 py-24 text-sm text-muted-foreground sm:px-8">
          Loading…
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-5xl px-5 py-24 sm:px-8">
        <h1 className="text-3xl font-extrabold text-foreground">Recipe not found</h1>
        <p className="mt-3 text-muted-foreground">
          This recipe doesn&apos;t exist or isn&apos;t published.
        </p>
      </div>
    );
  }

  return <RecipeDetail recipe={recipe} />;
}