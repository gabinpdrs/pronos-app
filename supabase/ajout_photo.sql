-- ============================================================
--  AJOUT PHOTO DE PROFIL — mise à jour SANS RIEN EFFACER
--  (que des "add" / "create" : aucun pari ni jeton perdu)
--  À lancer dans Supabase > SQL Editor > Run
-- ============================================================

-- 1) Colonne photo sur les profils
alter table public.profiles add column if not exists photo_url text;

-- 2) Espace de stockage "avatars" (public en lecture)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 3) Sécurité du stockage : lecture publique, envoi réservé aux connectés
drop policy if exists "avatars_lecture" on storage.objects;
create policy "avatars_lecture" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_envoi" on storage.objects;
create policy "avatars_envoi" on storage.objects
  for insert to authenticated with check (bucket_id = 'avatars');

drop policy if exists "avatars_maj" on storage.objects;
create policy "avatars_maj" on storage.objects
  for update to authenticated using (bucket_id = 'avatars');

-- 4) Fonction sécurisée pour enregistrer sa propre photo
--    (les joueurs ne peuvent pas modifier leur profil directement)
create or replace function public.set_photo(p_url text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set photo_url = p_url where id = auth.uid();
end; $$;

-- 5) On ajoute la photo au classement (pour l'afficher sur le podium)
--    On supprime d'abord la vue car on ne peut pas réorganiser ses colonnes.
--    (Une vue ne contient AUCUNE donnée : rien n'est perdu.)
drop view if exists public.classement;
create or replace view public.classement with (security_invoker = true) as
select pr.id as user_id, pr.prenom, pr.jetons, pr.photo_url,
       count(p.id) filter (where p.statut <> 'en_attente') as nb_paris
from public.profiles pr
left join public.paris p on p.user_id = pr.id
group by pr.id, pr.prenom, pr.jetons, pr.photo_url
order by pr.jetons desc;
