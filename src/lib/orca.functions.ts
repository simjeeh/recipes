import { createServerFn } from "@tanstack/react-start";
import { createHash, timingSafeEqual } from "node:crypto";

export const ORCA_USERNAME = "orca";
export const ORCA_EMAIL = "orca@recipes.local";

function matches(input: string, expected: string) {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

/**
 * Ensures the single admin account (`orca`) exists with the password stored in
 * the ORCA_PASSWORD secret. The caller must already know the password, so this
 * cannot be used to reset or discover it.
 */
export const ensureOrcaAccount = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string; password: string }) => data)
  .handler(async ({ data }) => {
    const expected = process.env.ORCA_PASSWORD;
    if (!expected) return { ok: false as const };
    if (data.username.trim().toLowerCase() !== ORCA_USERNAME) return { ok: false as const };
    if (!matches(data.password, expected)) return { ok: false as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list?.users.find((user) => user.email === ORCA_EMAIL);

    let userId = existing?.id;
    if (!userId) {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: ORCA_EMAIL,
        password: expected,
        email_confirm: true,
      });
      if (error || !created.user) return { ok: false as const };
      userId = created.user.id;
    }

    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });

    return { ok: true as const, email: ORCA_EMAIL };
  });