-- ============================================================
--  COUPE DU MONDE 2026 — vraies équipes & vrais matchs
--  Source : tirage FIFA (12 groupes A→L) + calendrier ESPN/FIFA
--  À lancer dans : Supabase > SQL Editor (APRÈS schema_v2.sql)
--
--  ⚠️ REMPLACE les équipes/matchs et remet tout le monde à
--     1000 jetons (les paris en cours sont effacés).
--
--  Matchs inclus : 19 → 27 juin 2026 (ceux encore à venir).
--  Heures en heure de l'Est (-04). Tu peux ajuster dans
--  Table Editor > matches si besoin.
-- ============================================================

delete from public.matches;
delete from public.teams;

-- ---------- LES 48 ÉQUIPES (12 groupes) ----------
insert into public.teams (nom, poule) values
  ('Mexique','Groupe A'), ('Afrique du Sud','Groupe A'), ('Corée du Sud','Groupe A'), ('Tchéquie','Groupe A'),
  ('Canada','Groupe B'), ('Bosnie-Herzégovine','Groupe B'), ('Qatar','Groupe B'), ('Suisse','Groupe B'),
  ('Brésil','Groupe C'), ('Maroc','Groupe C'), ('Haïti','Groupe C'), ('Écosse','Groupe C'),
  ('États-Unis','Groupe D'), ('Paraguay','Groupe D'), ('Australie','Groupe D'), ('Turquie','Groupe D'),
  ('Allemagne','Groupe E'), ('Curaçao','Groupe E'), ('Côte d''Ivoire','Groupe E'), ('Équateur','Groupe E'),
  ('Pays-Bas','Groupe F'), ('Japon','Groupe F'), ('Suède','Groupe F'), ('Tunisie','Groupe F'),
  ('Belgique','Groupe G'), ('Égypte','Groupe G'), ('Iran','Groupe G'), ('Nouvelle-Zélande','Groupe G'),
  ('Espagne','Groupe H'), ('Cap-Vert','Groupe H'), ('Arabie Saoudite','Groupe H'), ('Uruguay','Groupe H'),
  ('France','Groupe I'), ('Sénégal','Groupe I'), ('Irak','Groupe I'), ('Norvège','Groupe I'),
  ('Argentine','Groupe J'), ('Algérie','Groupe J'), ('Autriche','Groupe J'), ('Jordanie','Groupe J'),
  ('Portugal','Groupe K'), ('RD Congo','Groupe K'), ('Ouzbékistan','Groupe K'), ('Colombie','Groupe K'),
  ('Angleterre','Groupe L'), ('Croatie','Groupe L'), ('Ghana','Groupe L'), ('Panama','Groupe L');

-- ---------- LES MATCHS (19 → 27 juin 2026) ----------
insert into public.matches (equipe_domicile, equipe_exterieur, date_match, poule, cote_domicile, cote_nul, cote_exterieur) values
  -- 19 juin
  ((select id from public.teams where nom='États-Unis'), (select id from public.teams where nom='Australie'), '2026-06-19 15:00-04', 'Groupe D', 1.70, 3.50, 4.80),
  ((select id from public.teams where nom='Écosse'),     (select id from public.teams where nom='Maroc'),     '2026-06-19 18:00-04', 'Groupe C', 3.10, 3.10, 2.30),
  ((select id from public.teams where nom='Brésil'),     (select id from public.teams where nom='Haïti'),     '2026-06-19 21:00-04', 'Groupe C', 1.12, 7.50, 17.00),
  ((select id from public.teams where nom='Turquie'),    (select id from public.teams where nom='Paraguay'),  '2026-06-20 00:00-04', 'Groupe D', 2.30, 3.10, 3.20),
  -- 20 juin
  ((select id from public.teams where nom='Pays-Bas'),   (select id from public.teams where nom='Suède'),         '2026-06-20 13:00-04', 'Groupe F', 1.55, 3.90, 5.50),
  ((select id from public.teams where nom='Allemagne'),  (select id from public.teams where nom='Côte d''Ivoire'),'2026-06-20 16:00-04', 'Groupe E', 1.45, 4.20, 6.50),
  ((select id from public.teams where nom='Équateur'),   (select id from public.teams where nom='Curaçao'),       '2026-06-20 20:00-04', 'Groupe E', 1.50, 3.80, 6.50),
  ((select id from public.teams where nom='Tunisie'),    (select id from public.teams where nom='Japon'),         '2026-06-21 00:00-04', 'Groupe F', 3.30, 3.10, 2.20),
  -- 21 juin
  ((select id from public.teams where nom='Espagne'),          (select id from public.teams where nom='Arabie Saoudite'),'2026-06-21 12:00-04', 'Groupe H', 1.18, 6.50, 13.00),
  ((select id from public.teams where nom='Belgique'),         (select id from public.teams where nom='Iran'),           '2026-06-21 15:00-04', 'Groupe G', 1.55, 3.80, 5.80),
  ((select id from public.teams where nom='Uruguay'),          (select id from public.teams where nom='Cap-Vert'),       '2026-06-21 18:00-04', 'Groupe H', 1.40, 4.20, 7.50),
  ((select id from public.teams where nom='Nouvelle-Zélande'), (select id from public.teams where nom='Égypte'),         '2026-06-21 21:00-04', 'Groupe G', 3.40, 3.10, 2.15),
  -- 22 juin
  ((select id from public.teams where nom='Argentine'), (select id from public.teams where nom='Autriche'), '2026-06-22 13:00-04', 'Groupe J', 1.50, 4.00, 6.50),
  ((select id from public.teams where nom='France'),    (select id from public.teams where nom='Irak'),     '2026-06-22 17:00-04', 'Groupe I', 1.15, 7.00, 15.00),
  ((select id from public.teams where nom='Norvège'),   (select id from public.teams where nom='Sénégal'),  '2026-06-22 20:00-04', 'Groupe I', 2.80, 3.20, 2.50),
  ((select id from public.teams where nom='Jordanie'),  (select id from public.teams where nom='Algérie'),  '2026-06-22 23:00-04', 'Groupe J', 3.60, 3.20, 2.05),
  -- 23 juin
  ((select id from public.teams where nom='Portugal'),  (select id from public.teams where nom='Ouzbékistan'),'2026-06-23 13:00-04', 'Groupe K', 1.35, 4.80, 8.50),
  ((select id from public.teams where nom='Angleterre'),(select id from public.teams where nom='Ghana'),      '2026-06-23 16:00-04', 'Groupe L', 1.40, 4.40, 7.50),
  ((select id from public.teams where nom='Panama'),    (select id from public.teams where nom='Croatie'),    '2026-06-23 19:00-04', 'Groupe L', 4.50, 3.40, 1.75),
  ((select id from public.teams where nom='Colombie'),  (select id from public.teams where nom='RD Congo'),   '2026-06-23 22:00-04', 'Groupe K', 1.70, 3.50, 4.80),
  -- 24 juin
  ((select id from public.teams where nom='Suisse'),             (select id from public.teams where nom='Canada'),       '2026-06-24 15:00-04', 'Groupe B', 2.45, 3.20, 2.90),
  ((select id from public.teams where nom='Bosnie-Herzégovine'), (select id from public.teams where nom='Qatar'),        '2026-06-24 15:00-04', 'Groupe B', 1.90, 3.40, 4.00),
  ((select id from public.teams where nom='Écosse'),             (select id from public.teams where nom='Brésil'),       '2026-06-24 18:00-04', 'Groupe C', 6.50, 4.20, 1.50),
  ((select id from public.teams where nom='Maroc'),              (select id from public.teams where nom='Haïti'),        '2026-06-24 18:00-04', 'Groupe C', 1.35, 4.50, 8.00),
  ((select id from public.teams where nom='Tchéquie'),           (select id from public.teams where nom='Mexique'),      '2026-06-24 21:00-04', 'Groupe A', 2.60, 3.20, 2.70),
  ((select id from public.teams where nom='Afrique du Sud'),     (select id from public.teams where nom='Corée du Sud'), '2026-06-24 21:00-04', 'Groupe A', 3.20, 3.10, 2.25),
  -- 25 juin
  ((select id from public.teams where nom='Équateur'), (select id from public.teams where nom='Allemagne'),    '2026-06-25 16:00-04', 'Groupe E', 4.50, 3.50, 1.75),
  ((select id from public.teams where nom='Curaçao'),  (select id from public.teams where nom='Côte d''Ivoire'),'2026-06-25 16:00-04', 'Groupe E', 5.50, 3.80, 1.60),
  ((select id from public.teams where nom='Japon'),    (select id from public.teams where nom='Suède'),         '2026-06-25 19:00-04', 'Groupe F', 2.50, 3.20, 2.80),
  ((select id from public.teams where nom='Tunisie'),  (select id from public.teams where nom='Pays-Bas'),      '2026-06-25 19:00-04', 'Groupe F', 6.00, 4.00, 1.55),
  ((select id from public.teams where nom='Turquie'),  (select id from public.teams where nom='États-Unis'),    '2026-06-25 22:00-04', 'Groupe D', 2.70, 3.20, 2.60),
  ((select id from public.teams where nom='Paraguay'), (select id from public.teams where nom='Australie'),     '2026-06-25 22:00-04', 'Groupe D', 2.50, 3.10, 2.90),
  -- 26 juin
  ((select id from public.teams where nom='Norvège'),          (select id from public.teams where nom='France'),         '2026-06-26 15:00-04', 'Groupe I', 4.20, 3.60, 1.80),
  ((select id from public.teams where nom='Sénégal'),          (select id from public.teams where nom='Irak'),           '2026-06-26 15:00-04', 'Groupe I', 1.45, 4.00, 7.00),
  ((select id from public.teams where nom='Cap-Vert'),         (select id from public.teams where nom='Arabie Saoudite'),'2026-06-26 20:00-04', 'Groupe H', 2.80, 3.10, 2.55),
  ((select id from public.teams where nom='Uruguay'),          (select id from public.teams where nom='Espagne'),        '2026-06-26 20:00-04', 'Groupe H', 3.40, 3.30, 2.10),
  ((select id from public.teams where nom='Égypte'),           (select id from public.teams where nom='Iran'),           '2026-06-26 23:00-04', 'Groupe G', 2.60, 3.00, 2.80),
  ((select id from public.teams where nom='Nouvelle-Zélande'), (select id from public.teams where nom='Belgique'),       '2026-06-26 23:00-04', 'Groupe G', 7.50, 4.50, 1.40),
  -- 27 juin
  ((select id from public.teams where nom='Panama'),   (select id from public.teams where nom='Angleterre'), '2026-06-27 17:00-04', 'Groupe L', 8.00, 4.50, 1.35),
  ((select id from public.teams where nom='Croatie'),  (select id from public.teams where nom='Ghana'),      '2026-06-27 17:00-04', 'Groupe L', 1.55, 3.80, 6.00),
  ((select id from public.teams where nom='Colombie'), (select id from public.teams where nom='Portugal'),   '2026-06-27 19:30-04', 'Groupe K', 3.20, 3.20, 2.25),
  ((select id from public.teams where nom='RD Congo'), (select id from public.teams where nom='Ouzbékistan'),'2026-06-27 19:30-04', 'Groupe K', 2.50, 3.10, 2.90),
  ((select id from public.teams where nom='Algérie'),  (select id from public.teams where nom='Autriche'),   '2026-06-27 22:00-04', 'Groupe J', 2.40, 3.10, 3.00),
  ((select id from public.teams where nom='Jordanie'), (select id from public.teams where nom='Argentine'),  '2026-06-27 22:00-04', 'Groupe J', 9.00, 5.00, 1.30);

-- Tout le monde repart avec 1000 jetons
update public.profiles set jetons = 1000;
