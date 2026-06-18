-- ============================================================
--  PRONOS ENTRE AMIS — Script SQL complet pour Supabase
--  À coller dans : Supabase > SQL Editor > New query > Run
-- ============================================================

-- ------------------------------------------------------------
-- 1) TABLE PROFILES (1 ligne par joueur, liée au compte Auth)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  prenom text not null,
  must_change_password boolean not null default true, -- true = doit changer son mdp
  is_admin boolean not null default false             -- true = peut gérer matchs/résultats
);

-- ------------------------------------------------------------
-- 2) TABLE TEAMS (les équipes + leurs statistiques)
-- ------------------------------------------------------------
create table if not exists public.teams (
  id bigint generated always as identity primary key,
  nom text not null,
  matchs_joues int not null default 0,
  victoires int not null default 0,
  nuls int not null default 0,
  defaites int not null default 0,
  buts_pour int not null default 0,
  buts_contre int not null default 0
);

-- ------------------------------------------------------------
-- 3) TABLE MATCHES (les matchs à pronostiquer)
--    score_domicile / score_exterieur = NULL tant que pas joué
-- ------------------------------------------------------------
create table if not exists public.matches (
  id bigint generated always as identity primary key,
  equipe_domicile bigint not null references public.teams(id),
  equipe_exterieur bigint not null references public.teams(id),
  date_match timestamptz not null default now(),
  score_domicile int,
  score_exterieur int
);

-- ------------------------------------------------------------
-- 4) TABLE PRONOSTICS (1 prono par joueur et par match)
-- ------------------------------------------------------------
create table if not exists public.pronostics (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id bigint not null references public.matches(id) on delete cascade,
  score_domicile int not null,
  score_exterieur int not null,
  points int,  -- calculé automatiquement quand le match a un résultat
  unique (user_id, match_id)  -- empêche 2 pronos sur le même match
);


-- ============================================================
--  CRÉATION AUTOMATIQUE DU PROFIL À CHAQUE NOUVEAU JOUEUR
--  Quand tu crées un compte dans Auth (email lucas@pronos.local),
--  une ligne profiles est créée avec prenom = "Lucas".
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, prenom)
  values (
    new.id,
    -- on prend la partie avant le @ et on met la 1re lettre en majuscule
    initcap(split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();


-- ============================================================
--  CALCUL AUTOMATIQUE DES POINTS
--  Dès qu'on saisit le score final d'un match, les points de
--  tous les pronos de ce match sont recalculés.
--  Barème : 3 = score exact, 1 = bon résultat, 0 = sinon
-- ============================================================
create or replace function public.calculer_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.score_domicile is not null and new.score_exterieur is not null then
    update public.pronostics p
    set points = case
      -- score exact -> 3 points
      when p.score_domicile = new.score_domicile
       and p.score_exterieur = new.score_exterieur then 3
      -- bon vainqueur ou bon match nul -> 1 point
      -- sign() donne -1, 0 ou 1 : on compare le "sens" du résultat
      when sign(p.score_domicile - p.score_exterieur)
         = sign(new.score_domicile - new.score_exterieur) then 1
      -- sinon -> 0 point
      else 0
    end
    where p.match_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_calculer_points on public.matches;
create trigger trg_calculer_points
after update of score_domicile, score_exterieur on public.matches
for each row execute function public.calculer_points();


-- ============================================================
--  VUE CLASSEMENT (total des points par joueur)
--  L'application lit cette vue ; elle se met à jour toute seule.
-- ============================================================
create or replace view public.classement
with (security_invoker = true) as
select
  pr.id as user_id,
  pr.prenom,
  coalesce(sum(p.points), 0) as points_total,
  count(p.points) as nb_pronos
from public.profiles pr
left join public.pronostics p on p.user_id = pr.id
group by pr.id, pr.prenom
order by points_total desc;


-- ============================================================
--  SÉCURITÉ (RLS — Row Level Security)
--  On active la sécurité puis on définit qui a le droit de quoi.
-- ============================================================
alter table public.profiles   enable row level security;
alter table public.teams      enable row level security;
alter table public.matches    enable row level security;
alter table public.pronostics enable row level security;

-- ---- PROFILES ----
-- Tout joueur connecté peut voir les profils (pour le classement)
drop policy if exists "profiles_lecture" on public.profiles;
create policy "profiles_lecture" on public.profiles
  for select to authenticated using (true);
-- Chacun peut modifier UNIQUEMENT son propre profil
drop policy if exists "profiles_maj_soi" on public.profiles;
create policy "profiles_maj_soi" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- ---- TEAMS ----
-- Tout le monde (connecté) peut lire les équipes/stats
drop policy if exists "teams_lecture" on public.teams;
create policy "teams_lecture" on public.teams
  for select to authenticated using (true);
-- Seul un admin peut ajouter/modifier/supprimer une équipe
drop policy if exists "teams_admin" on public.teams;
create policy "teams_admin" on public.teams
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

-- ---- MATCHES ----
drop policy if exists "matches_lecture" on public.matches;
create policy "matches_lecture" on public.matches
  for select to authenticated using (true);
drop policy if exists "matches_admin" on public.matches;
create policy "matches_admin" on public.matches
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

-- ---- PRONOSTICS ----
-- Tout le monde peut lire les pronos (utile après les matchs / pour le classement)
drop policy if exists "pronos_lecture" on public.pronostics;
create policy "pronos_lecture" on public.pronostics
  for select to authenticated using (true);
-- Chacun peut créer / modifier / supprimer UNIQUEMENT ses propres pronos
drop policy if exists "pronos_ecriture_soi" on public.pronostics;
create policy "pronos_ecriture_soi" on public.pronostics
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ============================================================
--  DONNÉES D'EXEMPLE (facultatif, pour tester tout de suite)
--  Tu pourras les supprimer plus tard.
-- ============================================================
-- On n'insère ces données QUE si la table des équipes est encore vide.
-- Ainsi, relancer le script ne crée pas de doublons.
insert into public.teams (nom, matchs_joues, victoires, nuls, defaites, buts_pour, buts_contre)
select * from (values
  ('PSG', 10, 7, 2, 1, 22, 8),
  ('Marseille', 10, 5, 3, 2, 16, 11),
  ('Lyon', 10, 4, 2, 4, 14, 14),
  ('Lille', 10, 6, 1, 3, 18, 12)
) as t(nom, matchs_joues, victoires, nuls, defaites, buts_pour, buts_contre)
where not exists (select 1 from public.teams);

-- Deux matchs d'exemple, créés seulement s'il n'existe encore aucun match.
insert into public.matches (equipe_domicile, equipe_exterieur, date_match)
select dom, ext, when_ from (values
  (1, 2, now() + interval '2 days'),
  (3, 4, now() + interval '3 days')
) as m(dom, ext, when_)
where not exists (select 1 from public.matches);
