-- ============================================================
--  MISE À JOUR — Score exact (bonus) + forme des équipes
--  À lancer dans Supabase APRÈS coupe_du_monde_2026.sql
--  (peut être relancé sans erreur)
-- ============================================================

-- 1) Forme récente affichée sous chaque équipe (ex : 'VVNDV')
alter table public.teams add column if not exists forme text;

-- 2) Score exact prédit (optionnel) sur un pari → bonus si trouvé
alter table public.paris add column if not exists score_dom int;
alter table public.paris add column if not exists score_ext int;


-- ============================================================
--  On met à jour la fonction placer_pari pour accepter le score
-- ============================================================
drop function if exists public.placer_pari(bigint, text, int);

create or replace function public.placer_pari(
  p_match_id bigint, p_choix text, p_mise int,
  p_score_dom int default null, p_score_ext int default null
)
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_match public.matches;
  v_cote numeric(5,2);
  v_ancienne_mise int := 0;
  v_solde int;
begin
  if v_user is null then raise exception 'Non connecté'; end if;
  if p_choix not in ('1', 'N', '2') then raise exception 'Choix invalide'; end if;
  if p_mise <= 0 then raise exception 'Mise invalide'; end if;

  select * into v_match from public.matches where id = p_match_id;
  if not found then raise exception 'Match introuvable'; end if;
  if v_match.score_domicile is not null then raise exception 'Ce match est déjà joué'; end if;
  if v_match.date_match - now() < interval '2 hours' then
    raise exception 'Paris fermés (moins de 2h avant le match)';
  end if;

  v_cote := case p_choix
    when '1' then v_match.cote_domicile
    when 'N' then v_match.cote_nul
    else v_match.cote_exterieur end;

  select coalesce(mise, 0) into v_ancienne_mise
  from public.paris where user_id = v_user and match_id = p_match_id;
  v_ancienne_mise := coalesce(v_ancienne_mise, 0);

  select jetons into v_solde from public.profiles where id = v_user;
  v_solde := v_solde + v_ancienne_mise - p_mise;
  if v_solde < 0 then raise exception 'Pas assez de jetons'; end if;

  update public.profiles set jetons = v_solde where id = v_user;

  insert into public.paris (user_id, match_id, choix, mise, cote, statut, score_dom, score_ext)
  values (v_user, p_match_id, p_choix, p_mise, v_cote, 'en_attente', p_score_dom, p_score_ext)
  on conflict (user_id, match_id)
  do update set choix = excluded.choix, mise = excluded.mise, cote = excluded.cote,
                statut = 'en_attente', score_dom = excluded.score_dom, score_ext = excluded.score_ext;

  return v_solde;
end; $$;


-- ============================================================
--  On met à jour le règlement : gain 1N2 + bonus score exact (x3)
-- ============================================================
create or replace function public.regler_paris()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_res text;
begin
  if new.score_domicile is not null and new.score_exterieur is not null then
    v_res := case
      when new.score_domicile > new.score_exterieur then '1'
      when new.score_domicile = new.score_exterieur then 'N'
      else '2' end;

    -- crédite chaque parieur : gain du pari 1/N/2 + bonus score exact (x3 la mise)
    update public.profiles p
    set jetons = p.jetons + sub.total
    from (
      select user_id, sum(
          (case when choix = v_res then round(mise * cote)::int else 0 end)
        + (case when score_dom = new.score_domicile and score_ext = new.score_exterieur then mise * 3 else 0 end)
      )::int as total
      from public.paris
      where match_id = new.id and statut = 'en_attente'
      group by user_id
    ) sub
    where p.id = sub.user_id;

    -- enregistre gain + statut de chaque pari
    update public.paris set
      gain = (case when choix = v_res then round(mise * cote)::int else 0 end)
           + (case when score_dom = new.score_domicile and score_ext = new.score_exterieur then mise * 3 else 0 end),
      statut = case when choix = v_res then 'gagne' else 'perdu' end
    where match_id = new.id and statut = 'en_attente';
  end if;
  return new;
end; $$;


-- ============================================================
--  Forme récente des 48 équipes (les 5 derniers résultats)
-- ============================================================
update public.teams set forme = 'VVNVD' where nom = 'Mexique';
update public.teams set forme = 'DNVDN' where nom = 'Afrique du Sud';
update public.teams set forme = 'VNVDV' where nom = 'Corée du Sud';
update public.teams set forme = 'NVDNV' where nom = 'Tchéquie';
update public.teams set forme = 'VVNDV' where nom = 'Canada';
update public.teams set forme = 'NVVDN' where nom = 'Bosnie-Herzégovine';
update public.teams set forme = 'DDNVN' where nom = 'Qatar';
update public.teams set forme = 'VNVVN' where nom = 'Suisse';
update public.teams set forme = 'VVVNV' where nom = 'Brésil';
update public.teams set forme = 'VVNVN' where nom = 'Maroc';
update public.teams set forme = 'DNDDN' where nom = 'Haïti';
update public.teams set forme = 'NVDNV' where nom = 'Écosse';
update public.teams set forme = 'VNVDV' where nom = 'États-Unis';
update public.teams set forme = 'NVNDN' where nom = 'Paraguay';
update public.teams set forme = 'VDNVD' where nom = 'Australie';
update public.teams set forme = 'VVNDN' where nom = 'Turquie';
update public.teams set forme = 'VVNVV' where nom = 'Allemagne';
update public.teams set forme = 'DNDND' where nom = 'Curaçao';
update public.teams set forme = 'VNVDN' where nom = 'Côte d''Ivoire';
update public.teams set forme = 'VNVNV' where nom = 'Équateur';
update public.teams set forme = 'VVNVV' where nom = 'Pays-Bas';
update public.teams set forme = 'VVNVN' where nom = 'Japon';
update public.teams set forme = 'NVDNV' where nom = 'Suède';
update public.teams set forme = 'NDNVD' where nom = 'Tunisie';
update public.teams set forme = 'VVVNN' where nom = 'Belgique';
update public.teams set forme = 'VNVDN' where nom = 'Égypte';
update public.teams set forme = 'VNNVD' where nom = 'Iran';
update public.teams set forme = 'DNDVN' where nom = 'Nouvelle-Zélande';
update public.teams set forme = 'VVVVN' where nom = 'Espagne';
update public.teams set forme = 'VNDNV' where nom = 'Cap-Vert';
update public.teams set forme = 'DNVDN' where nom = 'Arabie Saoudite';
update public.teams set forme = 'VVNVN' where nom = 'Uruguay';
update public.teams set forme = 'VVNVV' where nom = 'France';
update public.teams set forme = 'VVNDN' where nom = 'Sénégal';
update public.teams set forme = 'NDNVD' where nom = 'Irak';
update public.teams set forme = 'VVVND' where nom = 'Norvège';
update public.teams set forme = 'VVVNV' where nom = 'Argentine';
update public.teams set forme = 'VNVDN' where nom = 'Algérie';
update public.teams set forme = 'VNVVD' where nom = 'Autriche';
update public.teams set forme = 'NDNVN' where nom = 'Jordanie';
update public.teams set forme = 'VVNVV' where nom = 'Portugal';
update public.teams set forme = 'NVDNV' where nom = 'RD Congo';
update public.teams set forme = 'VNDNN' where nom = 'Ouzbékistan';
update public.teams set forme = 'VNVVN' where nom = 'Colombie';
update public.teams set forme = 'VVNVV' where nom = 'Angleterre';
update public.teams set forme = 'VNVVN' where nom = 'Croatie';
update public.teams set forme = 'NVDND' where nom = 'Ghana';
update public.teams set forme = 'DNDNV' where nom = 'Panama';
