-- TSO 2.0 Theme Studio baseline migration (applied 2026-10-17).
-- This adds NEW TSO2-only data. It does not modify the TSO 1.0 theme.
CREATE TABLE IF NOT EXISTS public.tso2_theme_settings (
 id smallint PRIMARY KEY DEFAULT 1 CHECK(id=1),
 tokens jsonb NOT NULL DEFAULT '{}'::jsonb,
 custom_css text NOT NULL DEFAULT '',
 revision integer NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by uuid
);
CREATE TABLE IF NOT EXISTS public.tso2_theme_history (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 revision integer NOT NULL,
 tokens jsonb NOT NULL,
 custom_css text NOT NULL,
 changed_at timestamptz NOT NULL DEFAULT now(),
 changed_by uuid
);
INSERT INTO public.tso2_theme_settings(id) VALUES(1) ON CONFLICT(id) DO NOTHING;
ALTER TABLE public.tso2_theme_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tso2_theme_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tso2_theme_settings FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.tso2_theme_history FROM PUBLIC,anon,authenticated;
REVOKE ALL ON SEQUENCE public.tso2_theme_history_id_seq FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.tso2_get_published_theme()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT COALESCE((SELECT jsonb_build_object(
  'tokens',s.tokens,'customCss',s.custom_css,'revision',s.revision,'updatedAt',s.updated_at)
  FROM public.tso2_theme_settings s WHERE s.id=1),
  '{"tokens":{},"customCss":"","revision":0}'::jsonb);
$function$
;

CREATE OR REPLACE FUNCTION public.tso2_save_published_theme(p_tokens jsonb, p_custom_css text DEFAULT ''::text, p_expected_revision integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 v_key text; v_value text; v_revision integer; v_css text:=coalesce(p_custom_css,'');
 v_color_keys text[]:=ARRAY['--bg','--surface','--card','--elev','--text','--muted','--muted-2','--line','--line-strong','--blue','--blue-2','--outpost-orange','--outpost-gold','--outpost-violet','--green','--yellow','--red','--tso-sidebar-bg','--tso-header-bg','--tso-primary-btn','--tso-secondary-btn','--tso-btn-text','--tso-nav-active','--tso-focus'];
 v_number_keys text[]:=ARRAY['--tso-side-nav-width','--tso-page-max','--tso-page-gutter','--tso-card-padding','--tso-grid-gap','--tso-body-size','--tso-heading-size','--tso-button-height','--tso-header-height','--tso-nav-item-height','--r-sm','--r','--r-lg','--r-xl'];
BEGIN
 IF NOT public.tso2_theme_owner_allowed() THEN
  RAISE EXCEPTION 'Owner access required' USING ERRCODE='42501';
 END IF;
 IF p_tokens IS NULL OR jsonb_typeof(p_tokens)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(p_tokens))>48 THEN
  RAISE EXCEPTION 'Theme tokens must be a limited JSON object' USING ERRCODE='22023';
 END IF;
 FOR v_key,v_value IN SELECT key,value #>> '{}' FROM jsonb_each(p_tokens) LOOP
  IF v_key=ANY(v_color_keys) THEN
   IF v_value !~ '^#[0-9a-fA-F]{6}$' THEN RAISE EXCEPTION 'Invalid CSS color %',v_key USING ERRCODE='22023';END IF;
  ELSIF v_key=ANY(v_number_keys) THEN
   IF v_value !~ '^[0-9]{1,4}px$' OR substring(v_value from 1 for char_length(v_value)-2)::integer>2200 THEN
    RAISE EXCEPTION 'Invalid CSS size %',v_key USING ERRCODE='22023';
   END IF;
  ELSIF v_key='--tso-font-family' THEN
   IF v_value NOT IN ('Inter, ui-sans-serif, system-ui, sans-serif','system-ui, -apple-system, sans-serif','Arial, Helvetica, sans-serif','Georgia, serif','"Segoe UI", sans-serif','"Trebuchet MS", sans-serif') THEN
    RAISE EXCEPTION 'Unsupported font family' USING ERRCODE='22023';
   END IF;
  ELSE
   RAISE EXCEPTION 'Unknown theme variable %',v_key USING ERRCODE='22023';
  END IF;
 END LOOP;
 IF char_length(v_css)>12000 OR v_css~*'(@import|@font-face|url\s*\(|expression\s*\(|javascript:|data:|behavior\s*:|</?style|[<>])' THEN
  RAISE EXCEPTION 'Custom CSS exceeds 12,000 characters or contains unsafe constructs' USING ERRCODE='22023';
 END IF;
 SELECT revision INTO v_revision FROM public.tso2_theme_settings WHERE id=1 FOR UPDATE;
 IF p_expected_revision IS NOT NULL AND p_expected_revision<>v_revision THEN
  RAISE EXCEPTION 'Theme has changed since you loaded it. Reload before publishing.' USING ERRCODE='40001';
 END IF;
 INSERT INTO public.tso2_theme_history(revision,tokens,custom_css,changed_by)
 SELECT revision,tokens,custom_css,auth.uid() FROM public.tso2_theme_settings WHERE id=1;
 UPDATE public.tso2_theme_settings
 SET tokens=p_tokens,custom_css=v_css,revision=v_revision+1,updated_at=now(),updated_by=auth.uid() WHERE id=1;
 RETURN public.tso2_get_published_theme();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.tso2_theme_owner_allowed()
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT auth.uid() IS NOT NULL AND EXISTS(
 SELECT 1 FROM auth.users u WHERE u.id=auth.uid()
 AND u.id='0fef34ee-da55-4abb-aced-98f26a177113'::uuid
 AND u.raw_app_meta_data->>'role'='owner'
 AND u.email_confirmed_at IS NOT NULL
 AND (u.banned_until IS NULL OR u.banned_until<=now())
 );
$function$
;

CREATE OR REPLACE FUNCTION public.tso2_theme_owner_history()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF NOT public.tso2_theme_owner_allowed() THEN
  RAISE EXCEPTION 'Owner access required' USING ERRCODE='42501';
 END IF;
 RETURN COALESCE((SELECT jsonb_agg(v.item) FROM (
  SELECT jsonb_build_object('revision',h.revision,'tokens',h.tokens,'customCss',h.custom_css,'changedAt',h.changed_at) AS item
  FROM public.tso2_theme_history h ORDER BY h.changed_at DESC LIMIT 12
 ) v),'[]'::jsonb);
END;
$function$
;

REVOKE ALL ON FUNCTION public.tso2_theme_owner_allowed() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.tso2_save_published_theme(jsonb,text,integer) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.tso2_theme_owner_history() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tso2_get_published_theme() TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.tso2_save_published_theme(jsonb,text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tso2_theme_owner_history() TO authenticated;
