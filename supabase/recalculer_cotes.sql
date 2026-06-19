-- ============================================================
--  PRONOS — Admin : recalcule AUTOMATIQUEMENT toutes les cotes
--  à partir de la forme des équipes (1 seul bouton).
--  Répercute sur les paris déjà posés, sauf à -2h du match.
--  À lancer dans Supabase (projet pronos) > SQL Editor > Run.
-- ============================================================

create or replace function public.recalculer_cotes()
returns int language plpgsql security definer set search_path = public as $$
declare
  m record;
  rd numeric; re numeric; pnul numeric := 0.26;
  pd numeric; pe numeric; cd numeric; cn numeric; ce numeric; cs numeric;
  fd text; fe text; n int := 0;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'Réservé aux administrateurs';
  end if;

  for m in
    select mt.id, mt.date_match, coalesce(td.forme, 'NNNNN') fd, coalesce(te.forme, 'NNNNN') fe
    from public.matches mt
    join public.teams td on td.id = mt.equipe_domicile
    join public.teams te on te.id = mt.equipe_exterieur
    where mt.score_domicile is null
  loop
    fd := m.fd; fe := m.fe;
    -- "force" d'une équipe d'après sa forme : V=3, N=1, D=0
    rd := 0.2 + 0.8 * ((length(fd) - length(replace(fd, 'V', ''))) * 3 + (length(fd) - length(replace(fd, 'N', ''))))::numeric / (greatest(length(fd), 1) * 3);
    re := 0.2 + 0.8 * ((length(fe) - length(replace(fe, 'V', ''))) * 3 + (length(fe) - length(replace(fe, 'N', ''))))::numeric / (greatest(length(fe), 1) * 3);
    rd := rd * 1.1; -- léger avantage à domicile

    pd := (1 - pnul) * rd / (rd + re);
    pe := (1 - pnul) * re / (rd + re);

    cd := greatest(round(0.90 / pd, 2), 1.05);
    cn := greatest(round(0.90 / pnul, 2), 1.05);
    ce := greatest(round(0.90 / pe, 2), 1.05);
    cs := round(5 + (cd + ce) / 2, 2); -- cote "score exact" (élevée)

    update public.matches
      set cote_domicile = cd, cote_nul = cn, cote_exterieur = ce, cote_score = cs
    where id = m.id;

    -- répercussion sur les paris en cours, sauf à -2h du match
    if m.date_match - now() >= interval '2 hours' then
      update public.paris set cote = case
        when type = 'vainqueur' then (case choix when '1' then cd when 'N' then cn else ce end)
        when type = 'score'     then cs
        when type = 'combine'   then round((case choix when '1' then cd when 'N' then cn else ce end) * 3, 2)
        else cote end
      where match_id = m.id and statut = 'en_attente';
    end if;

    n := n + 1;
  end loop;
  return n;
end; $$;
