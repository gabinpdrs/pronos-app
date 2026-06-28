-- ============================================================
--  PRONOS — TABLEAU À ÉLIMINATION (Coupe du Monde 2026)
--  Crée les 16es officiels + fait MONTER le gagnant tout seul
--  au tour suivant dès que le score est entré.
--  Les paris fonctionnent normalement sur chaque match.
--  À lancer dans Supabase (projet PRONOS) > SQL Editor > Run.
--  (Peut être relancé sans tout casser : ne recrée pas si déjà fait.)
-- ============================================================

-- 1) Nouvelles colonnes sur les matchs
alter table public.matches add column if not exists tour text;            -- 16es / 8es / quarts / demies / finale
alter table public.matches add column if not exists slot int;            -- position dans le tour (1..16)
alter table public.matches add column if not exists vainqueur_id bigint references public.teams(id); -- équipe qui monte
alter table public.matches add column if not exists gagnant_penalty bigint references public.teams(id); -- en cas de nul : qui passe aux t.a.b

-- 2) S'assurer que les 32 équipes existent
insert into public.teams (nom)
select v.nom from (values
  ('Allemagne'),('Paraguay'),('France'),('Suède'),('Afrique du Sud'),('Canada'),
  ('Pays-Bas'),('Maroc'),('Portugal'),('Croatie'),('Espagne'),('Autriche'),
  ('États-Unis'),('Bosnie-Herzégovine'),('Belgique'),('Sénégal'),
  ('Brésil'),('Japon'),('Côte d''Ivoire'),('Norvège'),('Mexique'),('Équateur'),
  ('Angleterre'),('RD Congo'),('Argentine'),('Cap-Vert'),('Australie'),('Égypte'),
  ('Suisse'),('Algérie'),('Colombie'),('Ghana')
) v(nom)
where not exists (select 1 from public.teams t where t.nom = v.nom);

-- 3) Créer les 16es officiels (une seule fois)
do $$
declare v_d int := 1;
begin
  if not exists (select 1 from public.matches where tour is not null) then
    -- petit helper : insère un match du tableau
    -- (on étale les dates pour ouvrir les paris)
    insert into public.matches (equipe_domicile, equipe_exterieur, date_match, tour, slot, cote_domicile, cote_nul, cote_exterieur)
    select
      (select id from public.teams where nom = a limit 1),
      (select id from public.teams where nom = b limit 1),
      now() + interval '12 hours' + (s || ' hours')::interval,
      '16es', s, 2.00, 3.20, 2.00
    from (values
      ('Allemagne','Paraguay',1),
      ('France','Suède',2),
      ('Afrique du Sud','Canada',3),
      ('Pays-Bas','Maroc',4),
      ('Portugal','Croatie',5),
      ('Espagne','Autriche',6),
      ('États-Unis','Bosnie-Herzégovine',7),
      ('Belgique','Sénégal',8),
      ('Brésil','Japon',9),
      ('Côte d''Ivoire','Norvège',10),
      ('Mexique','Équateur',11),
      ('Angleterre','RD Congo',12),
      ('Argentine','Cap-Vert',13),
      ('Australie','Égypte',14),
      ('Suisse','Algérie',15),
      ('Colombie','Ghana',16)
    ) as m(a, b, s);
  end if;
end $$;

-- ============================================================
-- 4) FONCTION + TRIGGER : faire monter le gagnant au tour suivant
-- ============================================================
create or replace function public.avancer_tableau()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_gagnant bigint;
  v_tour_suiv text;
  v_slot_suiv int;
  v_sib_slot int;
  v_autre bigint;
  v_dom bigint;
  v_ext bigint;
  v_match_suiv bigint;
begin
  -- uniquement pour les matchs du tableau, et seulement quand le score est rempli
  if new.tour is null then return new; end if;
  if new.score_domicile is null or new.score_exterieur is null then return new; end if;

  -- qui gagne et monte ?
  if new.score_domicile > new.score_exterieur then
    v_gagnant := new.equipe_domicile;
  elsif new.score_domicile < new.score_exterieur then
    v_gagnant := new.equipe_exterieur;
  else
    v_gagnant := new.gagnant_penalty;  -- match nul -> tirs au but (choisi par l'admin)
  end if;

  if v_gagnant is null then return new; end if;  -- nul sans vainqueur défini : on attend

  -- mémoriser le vainqueur de CE match
  update public.matches set vainqueur_id = v_gagnant where id = new.id and vainqueur_id is distinct from v_gagnant;

  -- y a-t-il un tour suivant ?
  v_tour_suiv := case new.tour
    when '16es'   then '8es'
    when '8es'    then 'quarts'
    when 'quarts' then 'demies'
    when 'demies' then 'finale'
    else null end;
  if v_tour_suiv is null then return new; end if;  -- finale : pas de suite

  v_slot_suiv := ceil(new.slot / 2.0);
  v_sib_slot  := case when new.slot % 2 = 1 then new.slot + 1 else new.slot - 1 end;

  -- vainqueur du match "frère" (l'autre qui alimente le même match suivant)
  select vainqueur_id into v_autre from public.matches where tour = new.tour and slot = v_sib_slot;
  if v_autre is null then return new; end if;  -- le frère n'est pas fini : on attend

  -- composer le match suivant (slot impair = à domicile, pair = à l'extérieur)
  if new.slot % 2 = 1 then v_dom := v_gagnant; v_ext := v_autre;
  else                     v_dom := v_autre;   v_ext := v_gagnant;
  end if;

  -- créer ou mettre à jour le match suivant
  select id into v_match_suiv from public.matches where tour = v_tour_suiv and slot = v_slot_suiv;
  if v_match_suiv is null then
    insert into public.matches (equipe_domicile, equipe_exterieur, date_match, tour, slot, cote_domicile, cote_nul, cote_exterieur)
    values (v_dom, v_ext, now() + interval '2 days', v_tour_suiv, v_slot_suiv, 2.00, 3.20, 2.00);
  else
    update public.matches set equipe_domicile = v_dom, equipe_exterieur = v_ext where id = v_match_suiv;
  end if;

  return new;
end; $$;

drop trigger if exists trg_avancer_tableau on public.matches;
create trigger trg_avancer_tableau
after update of score_domicile, score_exterieur, gagnant_penalty on public.matches
for each row execute function public.avancer_tableau();
