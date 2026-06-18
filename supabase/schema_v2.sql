-- ============================================================
--  PRONOS ENTRE AMIS — V2 : mode "paris" style Winamax
--  Jetons virtuels + cotes 1/N/2 + coupon + Coupe du Monde
--  À coller dans : Supabase > SQL Editor > New query > Run
--  (Peut être relancé sans erreur.)
-- ============================================================

-- 1) Solde de jetons virtuels sur chaque joueur
alter table public.profiles add column if not exists jetons int not null default 1000;

-- 2) Poules (groupes) et cotes
alter table public.teams   add column if not exists poule text;
alter table public.matches add column if not exists poule text;
alter table public.matches add column if not exists cote_domicile  numeric(5,2) not null default 2.00;
alter table public.matches add column if not exists cote_nul       numeric(5,2) not null default 3.00;
alter table public.matches add column if not exists cote_exterieur numeric(5,2) not null default 2.00;

-- 3) On retire l'ancien système de points (score exact)
drop trigger if exists trg_calculer_points on public.matches;
drop function if exists public.calculer_points();
drop view if exists public.classement;

-- 4) Table des PARIS (remplace l'ancienne table pronostics)
create table if not exists public.paris (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id bigint not null references public.matches(id) on delete cascade,
  choix text not null check (choix in ('1', 'N', '2')), -- 1=dom, N=nul, 2=ext
  mise int not null check (mise > 0),
  cote numeric(5,2) not null,         -- cote figée au moment du pari
  gain int,                            -- jetons gagnés une fois le match réglé
  statut text not null default 'en_attente', -- en_attente / gagne / perdu
  unique (user_id, match_id)           -- un seul pari par match
);

drop table if exists public.pronostics cascade;


-- ============================================================
--  FONCTION : placer (ou modifier) un pari
--  Gère : verrou 2h, solde suffisant, remboursement si modif.
-- ============================================================
create or replace function public.placer_pari(p_match_id bigint, p_choix text, p_mise int)
returns int -- renvoie le nouveau solde de jetons
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

  if v_match.score_domicile is not null then
    raise exception 'Ce match est déjà joué';
  end if;
  if v_match.date_match - now() < interval '2 hours' then
    raise exception 'Paris fermés (moins de 2h avant le match)';
  end if;

  -- cote correspondant au choix
  v_cote := case p_choix
    when '1' then v_match.cote_domicile
    when 'N' then v_match.cote_nul
    else v_match.cote_exterieur end;

  -- mise déjà engagée sur ce match (cas d'une modification)
  select coalesce(mise, 0) into v_ancienne_mise
  from public.paris where user_id = v_user and match_id = p_match_id;
  v_ancienne_mise := coalesce(v_ancienne_mise, 0);

  -- on rembourse l'ancienne mise, on déduit la nouvelle
  select jetons into v_solde from public.profiles where id = v_user;
  v_solde := v_solde + v_ancienne_mise - p_mise;
  if v_solde < 0 then raise exception 'Pas assez de jetons'; end if;

  update public.profiles set jetons = v_solde where id = v_user;

  insert into public.paris (user_id, match_id, choix, mise, cote, statut)
  values (v_user, p_match_id, p_choix, p_mise, v_cote, 'en_attente')
  on conflict (user_id, match_id)
  do update set choix = excluded.choix, mise = excluded.mise,
                cote = excluded.cote, statut = 'en_attente';

  return v_solde;
end; $$;


-- ============================================================
--  FONCTION + TRIGGER : régler les paris quand un score tombe
--  Gagnant : on crédite mise x cote. Perdant : rien (mise perdue).
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

    -- créditer les gagnants (paris encore "en_attente")
    update public.profiles p
    set jetons = p.jetons + sub.total
    from (
      select user_id, sum(round(mise * cote))::int as total
      from public.paris
      where match_id = new.id and statut = 'en_attente' and choix = v_res
      group by user_id
    ) sub
    where p.id = sub.user_id;

    -- marquer gagnants puis perdants
    update public.paris set statut = 'gagne', gain = round(mise * cote)::int
      where match_id = new.id and statut = 'en_attente' and choix = v_res;
    update public.paris set statut = 'perdu', gain = 0
      where match_id = new.id and statut = 'en_attente' and choix <> v_res;
  end if;
  return new;
end; $$;

drop trigger if exists trg_regler_paris on public.matches;
create trigger trg_regler_paris
after update of score_domicile, score_exterieur on public.matches
for each row execute function public.regler_paris();


-- ============================================================
--  FONCTION : marquer le mot de passe comme changé (1re connexion)
--  (les joueurs ne peuvent plus modifier leur profil directement,
--   pour éviter qu'ils se rajoutent des jetons)
-- ============================================================
create or replace function public.marquer_mdp_change()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set must_change_password = false where id = auth.uid();
end; $$;


-- ============================================================
--  VUE CLASSEMENT (par jetons)
-- ============================================================
create or replace view public.classement with (security_invoker = true) as
select pr.id as user_id, pr.prenom, pr.jetons,
       count(p.id) filter (where p.statut <> 'en_attente') as nb_paris
from public.profiles pr
left join public.paris p on p.user_id = pr.id
group by pr.id, pr.prenom, pr.jetons
order by pr.jetons desc;


-- ============================================================
--  SÉCURITÉ (RLS)
-- ============================================================
-- Profils : lecture seule pour tous. Plus de modif directe (anti-triche).
drop policy if exists "profiles_maj_soi" on public.profiles;

-- Paris : tout le monde peut lire, personne n'écrit en direct
-- (seules les fonctions SECURITY DEFINER écrivent).
alter table public.paris enable row level security;
drop policy if exists "paris_lecture" on public.paris;
create policy "paris_lecture" on public.paris for select to authenticated using (true);


-- ============================================================
--  DONNÉES — Coupe du Monde (groupes A & B)
--  Seedé une seule fois (ne s'efface pas si on relance le script).
-- ============================================================
do $$
begin
  if not exists (select 1 from public.teams where poule is not null) then
    -- on repart propre (anciennes équipes/matchs d'exemple)
    delete from public.matches;
    delete from public.teams;

    -- Groupe A
    insert into public.teams (nom, poule) values
      ('France', 'Groupe A'), ('Australie', 'Groupe A'),
      ('Danemark', 'Groupe A'), ('Tunisie', 'Groupe A');
    -- Groupe B
    insert into public.teams (nom, poule) values
      ('Argentine', 'Groupe B'), ('Mexique', 'Groupe B'),
      ('Pologne', 'Groupe B'), ('Arabie Saoudite', 'Groupe B');

    -- Matchs Groupe A
    insert into public.matches (equipe_domicile, equipe_exterieur, date_match, poule, cote_domicile, cote_nul, cote_exterieur)
    values
      ((select id from public.teams where nom='France'),   (select id from public.teams where nom='Australie'), now() + interval '1 day',  'Groupe A', 1.30, 5.00, 9.00),
      ((select id from public.teams where nom='Danemark'), (select id from public.teams where nom='Tunisie'),   now() + interval '2 days', 'Groupe A', 2.10, 3.10, 3.80),
      ((select id from public.teams where nom='France'),   (select id from public.teams where nom='Danemark'),  now() + interval '5 days', 'Groupe A', 1.70, 3.80, 5.00),
      ((select id from public.teams where nom='Australie'),(select id from public.teams where nom='Tunisie'),   now() + interval '6 days', 'Groupe A', 2.70, 3.00, 2.70);

    -- Matchs Groupe B
    insert into public.matches (equipe_domicile, equipe_exterieur, date_match, poule, cote_domicile, cote_nul, cote_exterieur)
    values
      ((select id from public.teams where nom='Argentine'),(select id from public.teams where nom='Arabie Saoudite'), now() + interval '1 day',  'Groupe B', 1.20, 6.50, 13.00),
      ((select id from public.teams where nom='Mexique'),  (select id from public.teams where nom='Pologne'),         now() + interval '3 days', 'Groupe B', 2.50, 3.10, 3.10),
      ((select id from public.teams where nom='Argentine'),(select id from public.teams where nom='Mexique'),         now() + interval '5 days', 'Groupe B', 1.55, 3.90, 6.50),
      ((select id from public.teams where nom='Pologne'),  (select id from public.teams where nom='Arabie Saoudite'), now() + interval '6 days', 'Groupe B', 1.90, 3.30, 4.20);

    -- tout le monde repart avec 1000 jetons
    update public.profiles set jetons = 1000;
  end if;
end $$;
