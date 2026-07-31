import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Salad, Search, UserRound } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAdminSession } from "@/hooks/useAdminSession";
import { useRecipeSearch } from "@/hooks/useRecipeSearch";

export function SiteHeader() {
  const { isAdmin, email } = useAdminSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { query, setQuery } = useRecipeSearch();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] sm:gap-6 sm:px-6">
        <Link
          to="/"
          className="flex min-w-0 items-center gap-2 text-lg font-bold text-foreground transition-colors hover:text-primary"
        >
          <Salad className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <span className="truncate">Recipes</span>
        </Link>

        <div className="order-last col-span-2 min-w-0 sm:order-none sm:col-span-1">
          <label className="relative block">
            <span className="sr-only">Search recipes</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search recipes"
              className="w-full rounded-md border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
            />
          </label>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2">
          {isAdmin ? (
            <>
              <span className="hidden max-w-[16ch] truncate text-sm text-muted-foreground sm:block">
                {email}
              </span>
              <button
                type="button"
                onClick={signOut}
                className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white/5"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Sign out</span>
                <span className="sr-only sm:hidden">Sign out</span>
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              aria-label="Sign in"
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white/5 hover:text-primary"
            >
              <UserRound className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Sign in</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}