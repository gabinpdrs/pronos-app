-- ============================================================
--  AJOUTER DES MATCHS — SANS RIEN EFFACER
--  À utiliser pour rajouter des rencontres (8es, etc.) plus tard.
--  ⚠️ Ce script n'efface RIEN : aucun pari, aucun jeton perdu.
--  Il n'ajoute que ce qui n'existe pas déjà (relançable sans doublon).
-- ============================================================

-- 1) (Facultatif) Ajouter une nouvelle équipe si elle n'existe pas encore.
--    Remplace 'Nouvelle Équipe' et le groupe.
insert into public.teams (nom, poule)
select 'Nouvelle Équipe', '8e de finale'
where not exists (select 1 from public.teams where nom = 'Nouvelle Équipe');

-- 2) Ajouter un match.
--    - Remplace les noms d'équipes, la date, le groupe et les cotes.
--    - Le "where not exists" évite de créer 2 fois le même match.
insert into public.matches
  (equipe_domicile, equipe_exterieur, date_match, poule, cote_domicile, cote_nul, cote_exterieur, cote_score)
select
  (select id from public.teams where nom = 'France'),
  (select id from public.teams where nom = 'Brésil'),
  '2026-07-04 21:00-04',     -- date et heure du match
  '8e de finale',            -- nom du tour / groupe
  2.10, 3.30, 3.40,          -- cotes 1 / N / 2
  7.50                       -- cote du score exact
where not exists (
  select 1 from public.matches
  where equipe_domicile = (select id from public.teams where nom = 'France')
    and equipe_exterieur = (select id from public.teams where nom = 'Brésil')
);

-- 👉 Pour ajouter d'autres matchs, recopie le bloc "insert into public.matches"
--    ci-dessus en changeant les équipes, la date et les cotes.
