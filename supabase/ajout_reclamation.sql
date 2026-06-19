-- ============================================================
--  PRONOS — "Réclamer mes jetons" (au lieu d'un crédit auto)
--  Le score saisi calcule les gagnants, mais le joueur doit
--  cliquer pour récupérer ses jetons.
--  À lancer dans Supabase (projet pronos) > SQL Editor > Run.
-- ============================================================

-- 1) Marque si le gain a déjà été réclamé
alter table public.paris add column if not exists reclame boolean not null default false;

-- 2) Au réglage d'un match : on calcule gagné/perdu + le gain,
--    MAIS on ne crédite PAS les jetons (le joueur réclamera).
create or replace function public.regler_paris()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_res text;
begin
  if new.score_domicile is not null and new.score_exterieur is not null then
    v_res := case when new.score_domicile > new.score_exterieur then '1'
                  when new.score_domicile = new.score_exterieur then 'N' else '2' end;

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
  end if;
  return new;
end; $$;

-- 3) Fonction de réclamation : crédite les jetons une seule fois
create or replace function public.reclamer_gain(p_pari_id bigint)
returns int language plpgsql security definer set search_path = public as $$
declare v_pari public.paris; v_solde int;
begin
  select * into v_pari from public.paris where id = p_pari_id;
  if not found then raise exception 'Pari introuvable'; end if;
  if v_pari.user_id <> auth.uid() then raise exception 'Ce n''est pas ton pari'; end if;
  if v_pari.statut <> 'gagne' then raise exception 'Ce pari n''est pas gagnant'; end if;
  if v_pari.reclame then raise exception 'Gain déjà réclamé'; end if;

  update public.profiles set jetons = jetons + v_pari.gain where id = auth.uid()
    returning jetons into v_solde;
  update public.paris set reclame = true where id = p_pari_id;
  return v_solde;
end; $$;
