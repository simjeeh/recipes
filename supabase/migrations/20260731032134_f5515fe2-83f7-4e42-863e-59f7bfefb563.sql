-- 1. Move has_role out of the exposed API schema
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Repoint policies at the private helper
DROP POLICY IF EXISTS "Admins can read all recipes" ON public.recipes;
DROP POLICY IF EXISTS "Admins can update recipes" ON public.recipes;

CREATE POLICY "Admins can read all recipes"
ON public.recipes FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR (is_hidden = false));

CREATE POLICY "Admins can update recipes"
ON public.recipes FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- 2. Trigger helper should not be callable through the API
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- 3. Explicit admin-only INSERT/DELETE policies on recipes
GRANT INSERT, DELETE ON public.recipes TO authenticated;

CREATE POLICY "Admins can insert recipes"
ON public.recipes FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete recipes"
ON public.recipes FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));