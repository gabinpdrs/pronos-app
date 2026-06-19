-- ============================================================
--  PRONOS — Outils Admin
--  Ajouter / enlever des jetons à un joueur (admin seulement).
--  (La saisie des scores se fait via une simple mise à jour de
--   la table matches, déjà autorisée aux admins par la RLS.)
--  À lancer dans Supabase (projet pronos) > SQL Editor > Run.
-- ============================================================

create or replace function public.ajuster_jetons(p_user_id uuid, p_montant int)
returns int language plpgsql security definer set search_path = public as $$
declare v_solde int;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'Réservé aux administrateurs';
  end if;
  update public.profiles
    set jetons = greatest(0, jetons + p_montant)   -- jamais en dessous de 0
  where id = p_user_id
  returning jetons into v_solde;
  return v_solde;
end; $$;
