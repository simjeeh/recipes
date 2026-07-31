import { createFileRoute } from "@tanstack/react-router";

import { RecipeRoute } from "@/components/RecipeRoute";
import { getVisibleRecipe } from "@/lib/recipes.functions";
import { recipeDescription } from "@/lib/recipes";

export const Route = createFileRoute("/recipe/$slug/")({
  loader: ({ params }) => getVisibleRecipe({ data: { slug: params.slug } }),
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Recipe — Recipes" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = `${loaderData.title} — Recipes`;
    const description = recipeDescription(loaderData);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: RecipeDiagramPage,
});

function RecipeDiagramPage() {
  const { slug } = Route.useParams();
  return <RecipeRoute slug={slug} publicRecipe={Route.useLoaderData()} variant="flow" />;
}