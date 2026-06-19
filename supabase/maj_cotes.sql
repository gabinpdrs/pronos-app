-- ============================================================
--  PRONOS — Admin : mettre à jour les cotes d'un match
--  Répercute les nouvelles cotes sur les paris déjà posés,
--  SAUF si on est à moins de 2h du match (verrou).
--  À lancer dans Supabase (projet pronos) > SQL Editor > Run.
-- ============================================================

create or replace function public.maj_cotes(
  p_match_id bigint, p_cd numeric, p_cn numeric, p_ce numeric, p_cs numeric
)
returns void language plpgsql security definer set search_path = public as $$
declare v_match public.matches;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'Réservé aux administrateurs';
  end if;
  select * into v_match from public.matches where id = p_match_id;
  if not found then raise exception 'Match introuvable'; end if;

  -- 1) Nouvelles cotes du match (pour les futurs paris)
  update public.matches
    set cote_domicile = p_cd, cote_nul = p_cn, cote_exterieur = p_ce, cote_score = p_cs
  where id = p_match_id;

  -- 2) On répercute sur les paris déjà posés — sauf si < 2h avant le match
  if v_match.date_match - now() >= interval '2 hours' then
    update public.paris set cote = case
      when type = 'vainqueur' then (case choix when '1' then p_cd when 'N' then p_cn else p_ce end)
      when type = 'score'     then p_cs
      when type = 'combine'   then round((case choix when '1' then p_cd when 'N' then p_cn else p_ce end) * 3, 2)
      else cote end
    where match_id = p_match_id and statut = 'en_attente';
  end if;
end; $$;
