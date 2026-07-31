import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export type AdminSession = {
  loading: boolean;
  session: Session | null;
  /** True only for a fully verified (password + TOTP) admin account. */
  isAdmin: boolean;
  email: string | null;
};

function decodeAal(session: Session | null): string | null {
  if (!session?.access_token) return null;
  try {
    const payload = session.access_token.split(".")[1];
    const json = JSON.parse(
      decodeURIComponent(
        atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
          .split("")
          .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
          .join(""),
      ),
    );
    return typeof json.aal === "string" ? json.aal : null;
  } catch {
    return null;
  }
}

export function useAdminSession(): AdminSession {
  const [state, setState] = useState<AdminSession>({
    loading: true,
    session: null,
    isAdmin: false,
    email: null,
  });

  useEffect(() => {
    let active = true;

    const apply = async (session: Session | null) => {
      if (!session) {
        if (active) setState({ loading: false, session: null, isAdmin: false, email: null });
        return;
      }
      const verified = decodeAal(session) === "aal2";
      let isAdmin = false;
      if (verified) {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .maybeSingle();
        isAdmin = Boolean(data);
      }
      if (active) {
        setState({
          loading: false,
          session,
          isAdmin,
          email: session.user.email ?? null,
        });
      }
    };

    supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      apply(session);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}