-- ============================================================
--  CORRECTION d'un résultat déjà saisi : Ghana - Croatie
--  Nouveau score : CROATIE gagne 2-1.
--  Le script : 1) annule les gains déjà versés pour ce match,
--  2) met le bon score, 3) recalcule gagné/perdu + gains,
--  4) recrédite les BONS gagnants (et retire aux autres).
--  À lancer dans Supabase (projet PRONOS) > SQL Editor > Run.
-- ============================================================
do $$
declare
  v_match bigint;
  v_dom_is_croatie boolean;
  v_sc_dom int;
  v_sc_ext int;
  v_res text;
begin
  -- Trouver le match Ghana / Croatie (peu importe l'ordre)
  select mt.id, (td.nom ilike '%croat%')
    into v_match, v_dom_is_croatie
  from public.matches mt
  join public.teams td on td.id = mt.equipe_domicile
  join public.teams te on te.id = mt.equipe_exterieur
  where (td.nom ilike '%ghana%' and te.nom ilike '%croat%')
     or (td.nom ilike '%croat%' and te.nom ilike '%ghana%')
  limit 1;

  if v_match is null then
    raise exception 'Match Ghana / Croatie introuvable - verifie les noms d''equipes';
  end if;

  -- Croatie marque 2, Ghana marque 1 (on place selon qui est a domicile)
  if v_dom_is_croatie then
    v_sc_dom := 2; v_sc_ext := 1;
  else
    v_sc_dom := 1; v_sc_ext := 2;
  end if;

  -- 1) ANNULER les credits deja verses pour ce match
  update public.profiles p set jetons = jetons - x.total
  from (
    select user_id, sum(gain) as total
    from public.paris
    where match_id = v_match and statut = 'gagne' and reclame = true
    group by user_id
  ) x
  where p.id = x.user_id;

  -- 2) Mettre le BON score
  update public.matches
  set score_domicile = v_sc_dom, score_exterieur = v_sc_ext
  where id = v_match;

  -- 3) Recalculer gagne/perdu + gain avec le nouveau score
  v_res := case when v_sc_dom > v_sc_ext then '1'
                when v_sc_dom = v_sc_ext then 'N' else '2' end;

  update public.paris set
    statut = case when (
        (type = 'vainqueur' and choix = v_res)
        or (type = 'score'   and score_dom = v_sc_dom and score_ext = v_sc_ext)
        or (type = 'combine' and score_dom = v_sc_dom and score_ext = v_sc_ext)
      ) then 'gagne' else 'perdu' end,
    gain = case when (
        (type = 'vainqueur' and choix = v_res)
        or (type = 'score'   and score_dom = v_sc_dom and score_ext = v_sc_ext)
        or (type = 'combine' and score_dom = v_sc_dom and score_ext = v_sc_ext)
      ) then round(mise * cote)::int else 0 end,
    reclame = false
  where match_id = v_match;

  -- 4) CREDITER les bons gagnants
  update public.profiles p set jetons = jetons + g.total
  from (
    select user_id, sum(gain) as total
    from public.paris
    where match_id = v_match and statut = 'gagne'
    group by user_id
  ) g
  where p.id = g.user_id;

  update public.paris set reclame = true
  where match_id = v_match and statut = 'gagne';

  raise notice 'Correction OK : match % -> domicile % - % exterieur (Croatie gagne 2-1)', v_match, v_sc_dom, v_sc_ext;
end $$;
