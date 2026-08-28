CREATE OR REPLACE FUNCTION public.is_email_verified()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL
  );
$$;

REVOKE ALL ON FUNCTION public.is_email_verified() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_email_verified() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF _user_id IS DISTINCT FROM auth.uid() THEN
    RETURN false;
  END IF;
  IF NOT public.is_email_verified() THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace_id AND user_id = _user_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_workspace_role(_workspace_id uuid, _user_id uuid, _roles workspace_role[])
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF _user_id IS DISTINCT FROM auth.uid() THEN
    RETURN false;
  END IF;
  IF NOT public.is_email_verified() THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace_id AND user_id = _user_id AND role = ANY(_roles)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.bootstrap_user(_full_name text DEFAULT NULL::text, _workspace_name text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid UUID := auth.uid();
  _email TEXT;
  _ws_id UUID;
  _ws_name TEXT;
  _base_slug TEXT;
  _slug TEXT;
  _n INTEGER := 0;
  _free_plan UUID;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_email_verified() THEN
    RAISE EXCEPTION 'Email not confirmed';
  END IF;

  SELECT email INTO _email FROM auth.users WHERE id = _uid;

  INSERT INTO public.profiles (id, full_name)
  VALUES (_uid, COALESCE(NULLIF(trim(_full_name), ''), split_part(_email, '@', 1)))
  ON CONFLICT (id) DO UPDATE
    SET full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);

  SELECT wm.workspace_id INTO _ws_id
  FROM public.workspace_members wm
  WHERE wm.user_id = _uid
  ORDER BY wm.created_at ASC
  LIMIT 1;

  IF _ws_id IS NOT NULL THEN
    RETURN _ws_id;
  END IF;

  _ws_name := COALESCE(NULLIF(trim(_workspace_name), ''), split_part(_email, '@', 1) || '''s workspace');
  _base_slug := NULLIF(regexp_replace(lower(_ws_name), '[^a-z0-9]+', '-', 'g'), '');
  _base_slug := trim(both '-' from COALESCE(_base_slug, 'workspace'));
  IF _base_slug = '' THEN _base_slug := 'workspace'; END IF;
  _slug := _base_slug;

  WHILE EXISTS (SELECT 1 FROM public.workspaces w WHERE w.slug = _slug) LOOP
    _n := _n + 1;
    _slug := _base_slug || '-' || _n::text;
  END LOOP;

  INSERT INTO public.workspaces (name, slug, owner_id)
  VALUES (_ws_name, _slug, _uid)
  RETURNING id INTO _ws_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (_ws_id, _uid, 'owner');

  SELECT id INTO _free_plan FROM public.plans WHERE code = 'free';

  INSERT INTO public.subscriptions (workspace_id, plan_id, status, current_period_start, billing_provider)
  VALUES (_ws_id, _free_plan, 'active', now(), 'none')
  ON CONFLICT (workspace_id) DO NOTHING;

  RETURN _ws_id;
END;
$function$;
