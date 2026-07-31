import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type SearchContextValue = { query: string; setQuery: (value: string) => void };

const SearchContext = createContext<SearchContextValue>({ query: "", setQuery: () => {} });

export function RecipeSearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const value = useMemo(() => ({ query, setQuery }), [query]);
  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useRecipeSearch() {
  return useContext(SearchContext);
}