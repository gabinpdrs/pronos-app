-- ============================================================
--  PRONOS — Crédit AUTOMATIQUE des gains
--  Quand l'admin entre le score d'un match, les jetons des
--  gagnants sont crédités tout seuls. Plus besoin de "réclamer".
--  À lancer dans Supabase (projet pronos) > SQL Editor > Run.
-- ============================================================

-- Au réglage d'un match : on calcule gagné/perdu + le gain,
-- ET on crédite directement les jetons des gagnants.
create or replace function public.regler_paris()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_res text;
begin
  if new.score_domicile is not null and new.score_exterieur is not null then
    v_res := case when new.score_domicile > new.score_exterieur then '1'
                  when new.score_domicile = new.score_exterieur then 'N' else '2' end;

    -- 1) Régler les paris encore en attente pour ce match
    update public.paris set
      statut = case when (
          (type = 'vainqueur' and choix = v_res)
          or (type = 'score'   and score_dom = new.score_domicile and score_ext = new.score_exterieur)
          or (type = 'combine' and score_dom = new.score_domicile and score_ext = new.score_exterieur)
        ) then 'gagne' else 'perdu' end,
      gain = case when (
          (type = 'vainqueur' and choix = v_res)
          or (type = 'score'   and score_dom = new.score_domicile and score_ext = new.score_exterieur)
          or (type = 'combine' and score_dom = new.score_domicile and score_ext = new.score_exterieur)
        ) then round(mise * cote)::int else 0 end
    where match_id = new.id and statut = 'en_attente';

    -- 2) Créditer les jetons des gagnants pas encore crédités
    update public.profiles p set jetons = jetons + g.total
    from (
      select user_id, sum(gain) as total
      from public.paris
      where match_id = new.id and statut = 'gagne' and reclame = false
      group by user_id
    ) g
    where p.id = g.user_id;

    -- 3) Marquer ces gains comme crédités (évite tout double crédit)
    update public.paris set reclame = true
    where match_id = new.id and statut = 'gagne' and reclame = false;
  end if;
  return new;
end; $$;

-- ------------------------------------------------------------
--  RATTRAPAGE (une seule fois) :
--  Créditer les gains DÉJÀ gagnés mais pas encore réclamés
--  avec l'ancien système, pour que personne ne perde ses jetons.
-- ------------------------------------------------------------
update public.profiles p set jetons = jetons + g.total
from (
  select user_id, sum(gain) as total
  from public.paris
  where statut = 'gagne' and reclame = false
  group by user_id
) g
where p.id = g.user_id;

update public.paris set reclame = true
where statut = 'gagne' and reclame = false;

-- L'ancienne fonction de réclamation ne sert plus (on peut la retirer).
drop function if exists public.reclamer_gain(bigint);
