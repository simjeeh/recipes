import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import type { RecipeCategory } from "@/lib/recipes";

export type CategoryFilter = RecipeCategory | "All";

type SearchContextValue = {
  query: string;
  setQuery: (value: string) => void;
  category: CategoryFilter;
  setCategory: (value: CategoryFilter) => void;
};

const SearchContext = createContext<SearchContextValue>({
  query: "",
  setQuery: () => {},
  category: "All",
  setCategory: () => {},
});

export function RecipeSearchProvider({ children }: { children: ReactNode }) {
  const [query, setQueryState] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("All");

  // Typing a search resets the section filter back to "All".
  const setQuery = useCallback((value: string) => {
    setQueryState(value);
    if (value.trim()) setCategory("All");
  }, []);

  const value = useMemo(
    () => ({ query, setQuery, category, setCategory }),
    [query, setQuery, category],
  );
  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useRecipeSearch() {
  return useContext(SearchContext);
}