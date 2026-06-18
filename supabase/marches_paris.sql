-- ============================================================
--  MARCHÉS DE PARIS (style Winamax) :
--    - vainqueur  : 1 / N / 2
--    - score      : score exact
--    - combine    : équipe gagnante + score exact (cote majorée)
--  À lancer dans Supabase APRÈS maj_score_et_forme.sql
--  (peut être relancé sans erreur)
-- ============================================================

-- Cote des paris "score exact"
alter table public.matches add column if not exists cote_score numeric(6,2) not null default 7.50;

-- Type du pari + le choix devient facultatif (vide pour un pari "score")
alter table public.paris add column if not exists type text not null default 'vainqueur';
alter table public.paris alter column choix drop not null;


-- ============================================================
--  placer_pari : prend maintenant un TYPE de pari
-- ============================================================
drop function if exists public.placer_pari(bigint, text, int);
drop function if exists public.placer_pari(bigint, text, int, int, int);
drop function if exists public.placer_pari(bigint, text, text, int, int, int);

create or replace function public.placer_pari(
  p_match_id bigint, p_type text, p_choix text, p_mise int,
  p_score_dom int default null, p_score_ext int default null
)
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_match public.matches;
  v_cote numeric(6,2);
  v_cote_base numeric(6,2);
  v_res_score text;
  v_ancienne_mise int := 0;
  v_solde int;
begin
  if v_user is null then raise exception 'Non connecté'; end if;
  if p_type not in ('vainqueur', 'score', 'combine') then raise exception 'Type de pari invalide'; end if;
  if p_mise <= 0 then raise exception 'Mise invalide'; end if;

  select * into v_match from public.matches where id = p_match_id;
  if not found then raise exception 'Match introuvable'; end if;
  if v_match.score_domicile is not null then raise exception 'Ce match est déjà joué'; end if;
  if v_match.date_match - now() < interval '2 hours' then
    raise exception 'Paris fermés (moins de 2h avant le match)';
  end if;

  if p_type = 'vainqueur' then
    if p_choix not in ('1', 'N', '2') then raise exception 'Choix invalide'; end if;
    v_cote := case p_choix when '1' then v_match.cote_domicile
                           when 'N' then v_match.cote_nul
                           else v_match.cote_exterieur end;
    p_score_dom := null; p_score_ext := null;

  elsif p_type = 'score' then
    if p_score_dom is null or p_score_ext is null then raise exception 'Score exact manquant'; end if;
    v_cote := v_match.cote_score;
    p_choix := null;

  else -- combine : équipe gagnante + score exact
    if p_score_dom is null or p_score_ext is null then raise exception 'Score exact manquant'; end if;
    if p_choix not in ('1', 'N', '2') then raise exception 'Choisis l''équipe gagnante'; end if;
    -- le score doit être cohérent avec l'équipe choisie
    v_res_score := case when p_score_dom > p_score_ext then '1'
                        when p_score_dom = p_score_ext then 'N' else '2' end;
    if v_res_score <> p_choix then
      raise exception 'Le score ne correspond pas à l''équipe gagnante choisie';
    end if;
    v_cote_base := case p_choix when '1' then v_match.cote_domicile
                                when 'N' then v_match.cote_nul
                                else v_match.cote_exterieur end;
    v_cote := round(v_cote_base * 3, 2); -- cote majorée pour le combiné
  end if;

  select coalesce(mise, 0) into v_ancienne_mise
  from public.paris where user_id = v_user and match_id = p_match_id;
  v_ancienne_mise := coalesce(v_ancienne_mise, 0);

  select jetons into v_solde from public.profiles where id = v_user;
  v_solde := v_solde + v_ancienne_mise - p_mise;
  if v_solde < 0 then raise exception 'Pas assez de jetons'; end if;
  update public.profiles set jetons = v_solde where id = v_user;

  insert into public.paris (user_id, match_id, type, choix, mise, cote, statut, score_dom, score_ext)
  values (v_user, p_match_id, p_type, p_choix, p_mise, v_cote, 'en_attente', p_score_dom, p_score_ext)
  on conflict (user_id, match_id)
  do update set type = excluded.type, choix = excluded.choix, mise = excluded.mise,
                cote = excluded.cote, statut = 'en_attente',
                score_dom = excluded.score_dom, score_ext = excluded.score_ext;

  return v_solde;
end; $$;


-- ============================================================
--  regler_paris : gain selon le type de pari
-- ============================================================
create or replace function public.regler_paris()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_res text;
begin
  if new.score_domicile is not null and new.score_exterieur is not null then
    v_res := case when new.score_domicile > new.score_exterieur then '1'
                  when new.score_domicile = new.score_exterieur then 'N' else '2' end;

    -- crédite chaque gagnant (mise x cote)
    update public.profiles p
    set jetons = p.jetons + sub.total
    from (
      select user_id, sum(round(mise * cote)::int) as total
      from public.paris
      where match_id = new.id and statut = 'en_attente'
        and (
          (type = 'vainqueur' and choix = v_res)
          or (type = 'score'   and score_dom = new.score_domicile and score_ext = new.score_exterieur)
          or (type = 'combine' and score_dom = new.score_domicile and score_ext = new.score_exterieur)
        )
      group by user_id
    ) sub
    where p.id = sub.user_id;

    -- enregistre gain + statut
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
