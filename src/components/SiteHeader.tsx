import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Salad, UserRound } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAdminSession } from "@/hooks/useAdminSession";

export function SiteHeader() {
  const { isAdmin, email } = useAdminSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 sm:px-8">
        <Link
          to="/"
          className="flex min-w-0 items-center gap-2 text-lg font-bold text-foreground transition-colors hover:text-primary"
        >
          <Salad className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <span className="truncate">Recipes</span>
        </Link>

        <div className="flex shrink-0 items-center gap-2">
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